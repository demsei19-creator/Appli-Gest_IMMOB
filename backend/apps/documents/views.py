from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from common.permissions import IsManager
from .models import Document
from .serializers import (
    DocumentSerializer,
    DocumentDetailSerializer,
    DocumentUploadSerializer,
)
from .services.document_service import DocumentService
from .selectors.document_selectors import (
    get_documents_for_user,
    get_document_detail,
    get_document_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class DocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD and secure file upload API for Electronic Document Management (GED).
    """
    permission_classes = [IsAuthenticated, IsManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        document_type = self.request.query_params.get('document_type')
        property_id = self.request.query_params.get('property')
        unit_id = self.request.query_params.get('unit')
        tenant_id = self.request.query_params.get('tenant')
        lease_id = self.request.query_params.get('lease')
        search = self.request.query_params.get('search')

        return get_documents_for_user(
            user=self.request.user,
            document_type=document_type,
            property_id=property_id,
            unit_id=unit_id,
            tenant_id=tenant_id,
            lease_id=lease_id,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DocumentUploadSerializer
        if self.action == 'retrieve':
            return DocumentDetailSerializer
        return DocumentSerializer

    def retrieve(self, request, *args, **kwargs):
        doc = get_document_detail(request.user, kwargs.get('pk'))
        serializer = DocumentDetailSerializer(doc)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        doc = DocumentService.upload_document(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response(
            {
                "success": True,
                "message": f"Document '{doc.title}' téléversé avec succès.",
                "data": DocumentSerializer(doc).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        doc = DocumentService.update_document(
            owner=request.user,
            doc_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Document '{doc.title}' mis à jour avec succès.",
            "data": DocumentSerializer(doc).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        DocumentService.delete_document(
            owner=request.user,
            doc_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response(
            {"success": True, "message": "Document supprimé avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns document counts and storage footprint."""
        stats_data = get_document_stats_for_user(user=request.user)
        return Response({"success": True, "data": stats_data})
