from django.db import transaction
from common.services import BaseService
from common.exceptions import ResourceNotFoundException, ValidationException
from apps.audit.services.audit_service import AuditService
from apps.properties.models import Property, Unit
from apps.tenants.models import Tenant
from apps.leases.models import Lease
from ..models import Document


class DocumentService(BaseService):
    """
    Business operations for Electronic Document Management (GED) (Rules 6, 7, 8).
    """
    MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB max

    @classmethod
    @transaction.atomic
    def upload_document(cls, owner, validated_data: dict, ip_address: str = None) -> Document:
        effective_owner = owner.get_effective_owner()

        # 1. Validate property scope
        property_obj = validated_data.get('property')
        if property_obj and property_obj.owner != effective_owner:
            raise ResourceNotFoundException("Immeuble introuvable pour ce propriétaire.", code="PROPERTY_NOT_FOUND")

        # 2. Validate unit scope
        unit_obj = validated_data.get('unit')
        if unit_obj and unit_obj.property.owner != effective_owner:
            raise ResourceNotFoundException("Logement introuvable pour ce propriétaire.", code="UNIT_NOT_FOUND")

        # 3. Validate tenant scope
        tenant_obj = validated_data.get('tenant')
        if tenant_obj and tenant_obj.owner != effective_owner:
            raise ResourceNotFoundException("Locataire introuvable pour ce propriétaire.", code="TENANT_NOT_FOUND")

        # 4. Validate lease scope
        lease_obj = validated_data.get('lease')
        if lease_obj and lease_obj.owner != effective_owner:
            raise ResourceNotFoundException("Bail introuvable pour ce propriétaire.", code="LEASE_NOT_FOUND")

        # 5. Extract file metadata
        file_obj = validated_data.get('file')
        if not file_obj:
            raise ValidationException("Un fichier doit être fourni pour le téléversement.", code="FILE_REQUIRED")

        file_size = getattr(file_obj, 'size', None)
        if file_size and file_size > cls.MAX_FILE_SIZE_BYTES:
            raise ValidationException(
                f"La taille du fichier dépasse la limite autorisée de 20 Mo ({file_size / (1024*1024):.1f} Mo).",
                code="FILE_TOO_LARGE"
            )

        mime_type = getattr(file_obj, 'content_type', '') or ''

        # 6. Create Document
        doc = Document.objects.create(
            owner=effective_owner,
            file_size_bytes=file_size,
            mime_type=mime_type,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Document',
            resource_id=str(doc.id),
            changes={
                'doc_number': doc.doc_number,
                'title': doc.title,
                'document_type': doc.document_type,
                'file_size_bytes': doc.file_size_bytes,
                'mime_type': doc.mime_type,
                'property': property_obj.name if property_obj else None,
                'tenant': tenant_obj.full_name if tenant_obj else None,
            },
            ip_address=ip_address
        )

        return doc

    @classmethod
    @transaction.atomic
    def update_document(cls, owner, doc_id: str, validated_data: dict, ip_address: str = None) -> Document:
        effective_owner = owner.get_effective_owner()
        try:
            doc = Document.objects.get(id=doc_id, owner=effective_owner, is_active=True)
        except Document.DoesNotExist:
            raise ResourceNotFoundException("Document introuvable.", code="DOCUMENT_NOT_FOUND")

        # Validate relations if updated
        if 'property' in validated_data and validated_data['property']:
            if validated_data['property'].owner != effective_owner:
                raise ResourceNotFoundException("Immeuble introuvable.", code="PROPERTY_NOT_FOUND")

        if 'unit' in validated_data and validated_data['unit']:
            if validated_data['unit'].property.owner != effective_owner:
                raise ResourceNotFoundException("Logement introuvable.", code="UNIT_NOT_FOUND")

        if 'tenant' in validated_data and validated_data['tenant']:
            if validated_data['tenant'].owner != effective_owner:
                raise ResourceNotFoundException("Locataire introuvable.", code="TENANT_NOT_FOUND")

        if 'lease' in validated_data and validated_data['lease']:
            if validated_data['lease'].owner != effective_owner:
                raise ResourceNotFoundException("Bail introuvable.", code="LEASE_NOT_FOUND")

        for key, value in validated_data.items():
            setattr(doc, key, value)

        doc.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Document',
            resource_id=str(doc.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return doc

    @classmethod
    @transaction.atomic
    def delete_document(cls, owner, doc_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            doc = Document.objects.get(id=doc_id, owner=effective_owner, is_active=True)
        except Document.DoesNotExist:
            raise ResourceNotFoundException("Document introuvable.", code="DOCUMENT_NOT_FOUND")

        doc.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Document',
            resource_id=str(doc.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
