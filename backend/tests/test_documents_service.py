from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import ResourceNotFoundException, ValidationException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.services.tenant_service import TenantService
from apps.leases.services.lease_service import LeaseService
from apps.documents.models import Document
from apps.documents.constants import DocumentType
from apps.documents.services.document_service import DocumentService
from apps.documents.selectors.document_selectors import get_document_stats_for_user

User = get_user_model()


class DocumentServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner = User.objects.create_user(
            email="owner.ged@example.com",
            password="SecurePassword123!",
            first_name="Jean",
            last_name="Koffi",
            role=UserRole.OWNER,
            company_name="Koffi Immobilier"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Owner 2
        self.other_owner = User.objects.create_user(
            email="other.ged@example.com",
            password="SecurePassword123!",
            first_name="Sita",
            last_name="Coulibaly",
            role=UserRole.OWNER
        )

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence La Grâce",
            "address": "Riviera Golf",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "A101",
            "base_rent_amount": Decimal("500000.00"),
            "service_charges_amount": Decimal("50000.00")
        })

        # Tenant
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Marc",
            "last_name": "Gomez",
            "phone_number": "+22501020304"
        })

    def test_upload_document_and_auto_metadata(self):
        fake_pdf = SimpleUploadedFile("contrat_bail.pdf", b"%PDF-1.4 ... binary content ...", content_type="application/pdf")

        doc = DocumentService.upload_document(
            owner=self.owner,
            validated_data={
                "title": "Contrat de Bail signé - Gomez",
                "document_type": DocumentType.LEASE_CONTRACT,
                "file": fake_pdf,
                "property": self.property,
                "unit": self.unit,
                "tenant": self.tenant,
                "description": "Contrat scanné après signature"
            }
        )

        self.assertTrue(doc.doc_number.startswith("DOC-"))
        self.assertEqual(doc.title, "Contrat de Bail signé - Gomez")
        self.assertEqual(doc.document_type, DocumentType.LEASE_CONTRACT)
        self.assertEqual(doc.mime_type, "application/pdf")
        self.assertGreater(doc.file_size_bytes, 0)
        self.assertEqual(doc.property, self.property)
        self.assertEqual(doc.unit, self.unit)
        self.assertEqual(doc.tenant, self.tenant)

    def test_storage_stats_calculation(self):
        file1 = SimpleUploadedFile("doc1.pdf", b"x" * 2048, content_type="application/pdf")
        file2 = SimpleUploadedFile("photo.jpg", b"x" * 4096, content_type="image/jpeg")

        DocumentService.upload_document(
            owner=self.owner,
            validated_data={
                "title": "Document 1",
                "document_type": DocumentType.LEASE_CONTRACT,
                "file": file1
            }
        )
        DocumentService.upload_document(
            owner=self.owner,
            validated_data={
                "title": "Photo état des lieux",
                "document_type": DocumentType.PHOTO,
                "file": file2
            }
        )

        stats = get_document_stats_for_user(self.owner)
        self.assertEqual(stats["total_documents"], 2)
        self.assertEqual(stats["total_storage_bytes"], 6144)
        self.assertEqual(stats["contracts_count"], 1)
        self.assertEqual(stats["photos_count"], 1)

    def test_owner_isolation(self):
        fake_pdf = SimpleUploadedFile("doc.pdf", b"test content", content_type="application/pdf")

        # Other owner tries to bind Owner 1's property
        with self.assertRaises(ResourceNotFoundException):
            DocumentService.upload_document(
                owner=self.other_owner,
                validated_data={
                    "title": "Tentative frauduleuse",
                    "document_type": DocumentType.OTHER,
                    "file": fake_pdf,
                    "property": self.property
                }
            )

    def test_document_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        fake_file = SimpleUploadedFile("piece_id.png", b"fake image bytes", content_type="image/png")

        # 1. POST /api/v1/documents/ (multipart/form-data)
        create_res = self.client.post(
            "/api/v1/documents/",
            {
                "title": "CNI Recto-Verso Locataire",
                "document_type": "ID_CARD",
                "file": fake_file,
                "property": str(self.property.id),
                "tenant": str(self.tenant.id),
                "description": "Pièce d'identité validée"
            },
            format="multipart"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        doc_id = create_res.data["data"]["id"]
        self.assertTrue(create_res.data["data"]["doc_number"].startswith("DOC-"))

        # 2. GET /api/v1/documents/
        list_res = self.client.get("/api/v1/documents/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. GET /api/v1/documents/stats/
        stats_res = self.client.get("/api/v1/documents/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_documents"], 1)
        self.assertEqual(stats_res.data["data"]["ids_count"], 1)

        # 4. DELETE /api/v1/documents/{id}/
        del_res = self.client.delete(f"/api/v1/documents/{doc_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
