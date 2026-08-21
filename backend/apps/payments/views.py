from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsAccountant
from .models import Payment
from .serializers import (
    PaymentSerializer,
    PaymentDetailSerializer,
    PaymentCreateSerializer,
    PaymentCancelSerializer,
)
from .services.payment_service import PaymentService
from .selectors.payment_selectors import (
    get_payments_for_user,
    get_payment_detail,
    get_payments_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class PaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD API, FIFO allocations, and Rent Receipt (Quittance) generation.
    Adheres strictly to the Services & Selectors pattern and multi-tenant isolation.
    """
    permission_classes = [IsAuthenticated, IsAccountant]

    def get_queryset(self):
        tenant_id = self.request.query_params.get('tenant')
        method = self.request.query_params.get('method')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        search = self.request.query_params.get('search')

        return get_payments_for_user(
            user=self.request.user,
            tenant_id=tenant_id,
            method=method,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None,
            search=search
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentSerializer

    def retrieve(self, request, *args, **kwargs):
        payment = get_payment_detail(request.user, kwargs.get('pk'))
        serializer = PaymentDetailSerializer(payment)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        payment = PaymentService.record_payment(
            owner=request.user,
            tenant_id=str(serializer.validated_data['tenant']),
            amount=serializer.validated_data['amount'],
            payment_date=serializer.validated_data['payment_date'],
            payment_method=serializer.validated_data.get('payment_method'),
            reference_number=serializer.validated_data.get('reference_number', ''),
            notes=serializer.validated_data.get('notes', ''),
            auto_allocate_fifo=serializer.validated_data.get('auto_allocate_fifo', True),
            manual_allocations=serializer.validated_data.get('manual_allocations', []),
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Paiement '{payment.payment_number}' enregistré avec succès ({payment.allocations.count()} factures allouées).",
                "data": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancels a payment and restores invoice debt balances."""
        serializer = PaymentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        payment = PaymentService.cancel_payment(
            owner=request.user,
            payment_id=pk,
            reason=serializer.validated_data.get('reason', ''),
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le paiement '{payment.payment_number}' a été annulé et les créances ont été rétablies.",
            "data": PaymentSerializer(payment).data,
        })

    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        """Returns official Rent Receipt (Quittance de loyer) structured data."""
        receipt_data = PaymentService.get_receipt_data(
            owner=request.user,
            payment_id=pk
        )
        return Response({"success": True, "data": receipt_data})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns payments collected and method breakdown statistics."""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        stats_data = get_payments_stats_for_user(
            user=request.user,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None
        )
        return Response({"success": True, "data": stats_data})
