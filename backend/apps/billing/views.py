from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsManager
from .models import RentInvoice
from .serializers import (
    RentInvoiceSerializer,
    RentInvoiceDetailSerializer,
    RentInvoiceCreateSerializer,
    BulkInvoiceGenerateSerializer,
    InvoiceCancelSerializer,
)
from .services.billing_service import BillingService
from .selectors.billing_selectors import (
    get_invoices_for_user,
    get_invoice_detail,
    get_billing_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class RentInvoiceViewSet(viewsets.ModelViewSet):
    """
    CRUD API and batch actions for Rent Invoices (Avis d'échéance).
    Adheres strictly to the Services & Selectors pattern and multi-tenant isolation.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        status_param = self.request.query_params.get('status')
        property_id = self.request.query_params.get('property')
        tenant_id = self.request.query_params.get('tenant')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        search = self.request.query_params.get('search')

        return get_invoices_for_user(
            user=self.request.user,
            status=status_param,
            property_id=property_id,
            tenant_id=tenant_id,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None,
            search=search
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return RentInvoiceCreateSerializer
        if self.action == 'retrieve':
            return RentInvoiceDetailSerializer
        return RentInvoiceSerializer

    def retrieve(self, request, *args, **kwargs):
        invoice = get_invoice_detail(request.user, kwargs.get('pk'))
        serializer = RentInvoiceDetailSerializer(invoice)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = RentInvoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        invoice = BillingService.generate_single_invoice(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"L'avis d'échéance '{invoice.invoice_number}' a été généré.",
                "data": RentInvoiceSerializer(invoice).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        BillingService.delete_invoice(
            owner=request.user,
            invoice_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": "L'avis d'échéance a été supprimé avec succès."
        })

    @action(detail=False, methods=['post'], url_path='bulk-generate')
    def bulk_generate(self, request):
        """1-Click generation of monthly invoices for all active leases."""
        serializer = BulkInvoiceGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        result = BillingService.generate_bulk_invoices(
            owner=request.user,
            month=serializer.validated_data['month'],
            year=serializer.validated_data['year'],
            property_id=str(serializer.validated_data.get('property_id')) if serializer.validated_data.get('property_id') else None,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"{result['generated_count']} avis d'échéance générés ({result['skipped_count']} déjà existants ignorés).",
            "data": {
                "generated_count": result['generated_count'],
                "skipped_count": result['skipped_count'],
                "invoices": RentInvoiceSerializer(result['created_invoices'], many=True).data,
                "skipped_leases": result['skipped_leases'],
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancels an unpaid rent invoice."""
        serializer = InvoiceCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        invoice = BillingService.cancel_invoice(
            owner=request.user,
            invoice_id=pk,
            reason=serializer.validated_data.get('reason'),
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"L'avis d'échéance '{invoice.invoice_number}' a été annulé.",
            "data": RentInvoiceSerializer(invoice).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns billing and collection rate statistics."""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        stats_data = get_billing_stats_for_user(
            user=request.user,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None
        )
        return Response({"success": True, "data": stats_data})
