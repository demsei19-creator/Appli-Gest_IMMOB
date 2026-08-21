from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsManager
from .models import Lease, Deposit
from .serializers import (
    LeaseSerializer,
    LeaseDetailSerializer,
    LeaseCreateUpdateSerializer,
    LeaseTerminateSerializer,
    DepositSerializer,
    DepositActionSerializer,
)
from .services.lease_service import LeaseService
from .selectors.lease_selectors import (
    get_leases_for_user,
    get_lease_detail,
    get_leases_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class LeaseViewSet(viewsets.ModelViewSet):
    """
    CRUD API and lifecycle actions for Lease contracts and Security deposits.
    Adheres strictly to the Services & Selectors pattern and multi-tenant isolation.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        status_param = self.request.query_params.get('status')
        property_id = self.request.query_params.get('property')
        tenant_id = self.request.query_params.get('tenant')
        search = self.request.query_params.get('search')
        return get_leases_for_user(
            user=self.request.user,
            status=status_param,
            property_id=property_id,
            tenant_id=tenant_id,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LeaseCreateUpdateSerializer
        if self.action == 'retrieve':
            return LeaseDetailSerializer
        return LeaseSerializer

    def retrieve(self, request, *args, **kwargs):
        lease = get_lease_detail(request.user, kwargs.get('pk'))
        serializer = LeaseDetailSerializer(lease)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = LeaseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        lease = LeaseService.create_lease(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Le contrat de bail '{lease.lease_number}' a été créé avec succès.",
                "data": LeaseSerializer(lease).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        serializer = LeaseCreateUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        lease = LeaseService.update_lease(
            owner=request.user,
            lease_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le contrat '{lease.lease_number}' a été mis à jour.",
            "data": LeaseSerializer(lease).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        LeaseService.delete_lease(
            owner=request.user,
            lease_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": "Le contrat de bail a été archivé avec succès."
        })

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """Activates a draft lease and locks unit status to OCCUPIED."""
        ip = get_client_ip(request)
        lease = LeaseService.activate_lease(
            owner=request.user,
            lease_id=pk,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Le bail '{lease.lease_number}' est désormais actif.",
            "data": LeaseSerializer(lease).data,
        })

    @action(detail=True, methods=['post'], url_path='terminate')
    def terminate(self, request, pk=None):
        """Terminates an active lease and frees the unit."""
        serializer = LeaseTerminateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        lease = LeaseService.terminate_lease(
            owner=request.user,
            lease_id=pk,
            termination_date=serializer.validated_data['termination_date'],
            reason=serializer.validated_data.get('reason'),
            next_unit_status=serializer.validated_data.get('next_unit_status', 'VACANT'),
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le contrat de bail '{lease.lease_number}' a été résilié.",
            "data": LeaseSerializer(lease).data,
        })

    @action(detail=True, methods=['post'], url_path='deposit')
    def manage_deposit(self, request, pk=None):
        """Performs operations on the security deposit (encashment, refund, retention)."""
        serializer = DepositActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        deposit = LeaseService.manage_deposit(
            owner=request.user,
            lease_id=pk,
            action=serializer.validated_data['action'],
            amount=serializer.validated_data.get('amount'),
            payment_method=serializer.validated_data.get('payment_method'),
            receipt_reference=serializer.validated_data.get('receipt_reference'),
            reason=serializer.validated_data.get('reason'),
            date=serializer.validated_data.get('date'),
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"La caution a été mise à jour (Statut: {deposit.get_status_display()}).",
            "data": DepositSerializer(deposit).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns global lease statistics (active, drafts, terminated, total deposits)."""
        stats_data = get_leases_stats_for_user(request.user)
        return Response({"success": True, "data": stats_data})
