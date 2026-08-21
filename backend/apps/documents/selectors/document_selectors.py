from django.db.models import QuerySet, Sum, Q, Count
from common.exceptions import ResourceNotFoundException
from ..models import Document
from ..constants import DocumentType


def get_documents_for_user(
    user,
    document_type: str = None,
    property_id: str = None,
    unit_id: str = None,
    tenant_id: str = None,
    lease_id: str = None,
    search: str = None
) -> QuerySet[Document]:
    """
    Retrieve all documents for user's effective owner with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Document.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related('property', 'unit', 'tenant', 'lease')

    if document_type:
        qs = qs.filter(document_type=document_type)

    if property_id:
        qs = qs.filter(property_id=property_id)

    if unit_id:
        qs = qs.filter(unit_id=unit_id)

    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)

    if lease_id:
        qs = qs.filter(lease_id=lease_id)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(doc_number__icontains=search) |
            Q(description__icontains=search) |
            Q(property__name__icontains=search) |
            Q(tenant__last_name__icontains=search) |
            Q(tenant__first_name__icontains=search) |
            Q(tenant__company_name__icontains=search)
        )

    return qs.order_by('-created_at')


def get_document_detail(user, doc_id: str) -> Document:
    """Retrieve 360° detail of a single document."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Document.objects.select_related('property', 'unit', 'tenant', 'lease').get(
            id=doc_id,
            owner=effective_owner,
            is_active=True
        )
    except Document.DoesNotExist:
        raise ResourceNotFoundException("Document introuvable.", code="DOCUMENT_NOT_FOUND")


def format_bytes_size(size_bytes: int) -> str:
    if not size_bytes or size_bytes <= 0:
        return "0 Ko"
    if size_bytes < 1024:
        return f"{size_bytes} octets"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} Ko"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} Mo"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} Go"


def get_document_stats_for_user(user) -> dict:
    """
    Returns total document count, storage footprint, and type breakdown.
    """
    qs = get_documents_for_user(user)

    total_count = qs.count()
    total_bytes = qs.aggregate(total=Sum('file_size_bytes'))['total'] or 0

    contracts_count = qs.filter(document_type__in=[DocumentType.LEASE_CONTRACT, DocumentType.PROPERTY_DEED]).count()
    receipts_invoices_count = qs.filter(
        document_type__in=[DocumentType.RENT_RECEIPT, DocumentType.INVOICE, DocumentType.TAX_NOTICE]
    ).count()
    ids_count = qs.filter(document_type=DocumentType.ID_CARD).count()
    photos_count = qs.filter(document_type=DocumentType.PHOTO).count()

    return {
        'total_documents': total_count,
        'total_storage_bytes': total_bytes,
        'storage_formatted': format_bytes_size(total_bytes),
        'contracts_count': contracts_count,
        'receipts_invoices_count': receipts_invoices_count,
        'ids_count': ids_count,
        'photos_count': photos_count,
    }
