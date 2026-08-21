from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from common.permissions import IsManager
from .models import Tenant, EmergencyContact
from .serializers import (
    TenantSerializer,
    TenantDetailSerializer,
    TenantCreateUpdateSerializer,
    EmergencyContactSerializer,
)
from .services.tenant_service import TenantService
from .selectors.tenant_selectors import (
    get_tenants_for_user,
    get_tenant_detail,
    get_tenants_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class TenantViewSet(viewsets.ModelViewSet):
    """
    CRUD API for tenants with search, filtering, 360° history and stats.
    Adheres to the Services & Selectors pattern and multi-tenant isolation.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        search = self.request.query_params.get('search')
        tenant_type = self.request.query_params.get('tenant_type')
        is_active_occupant_param = self.request.query_params.get('is_active_occupant')

        is_active_occupant = None
        if is_active_occupant_param is not None:
            if is_active_occupant_param.lower() in ['true', '1']:
                is_active_occupant = True
            elif is_active_occupant_param.lower() in ['false', '0']:
                is_active_occupant = False

        return get_tenants_for_user(
            user=self.request.user,
            search=search,
            is_active_occupant=is_active_occupant,
            tenant_type=tenant_type
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TenantCreateUpdateSerializer
        if self.action == 'retrieve':
            return TenantDetailSerializer
        return TenantSerializer

    def retrieve(self, request, *args, **kwargs):
        tenant = get_tenant_detail(request.user, kwargs.get('pk'))
        serializer = TenantDetailSerializer(tenant)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = TenantCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        tenant = TenantService.create_tenant(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Le dossier locataire pour '{tenant.full_name}' a été créé avec succès.",
                "data": TenantSerializer(tenant).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        serializer = TenantCreateUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        tenant = TenantService.update_tenant(
            owner=request.user,
            tenant_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le dossier de '{tenant.full_name}' a été mis à jour.",
            "data": TenantSerializer(tenant).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        TenantService.delete_tenant(
            owner=request.user,
            tenant_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": "Le dossier locataire a été archivé avec succès."
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Global stats for tenants (active, former, arrears)."""
        stats_data = get_tenants_stats_for_user(request.user)
        return Response({"success": True, "data": stats_data})

    @action(detail=True, methods=['post'], url_path='emergency-contacts')
    def add_emergency_contact(self, request, pk=None):
        """Add an emergency contact to this tenant."""
        serializer = EmergencyContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        contact = TenantService.add_emergency_contact(
            owner=request.user,
            tenant_id=pk,
            contact_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": "Contact d'urgence ajouté avec succès.",
                "data": EmergencyContactSerializer(contact).data,
            },
            status=status.HTTP_201_CREATED,
        )
