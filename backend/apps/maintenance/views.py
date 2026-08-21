from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsManager
from .models import MaintenanceRequest, Supplier
from .serializers import (
    SupplierSerializer,
    SupplierDetailSerializer,
    MaintenanceRequestSerializer,
    MaintenanceRequestDetailSerializer,
    MaintenanceRequestCreateUpdateSerializer,
    MaintenanceAssignSupplierSerializer,
    MaintenanceStatusUpdateSerializer,
)
from .services.maintenance_service import MaintenanceService
from .selectors.maintenance_selectors import (
    get_maintenance_requests_for_user,
    get_maintenance_request_detail,
    get_maintenance_stats_for_user,
    get_suppliers_for_user,
    get_supplier_detail,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class SupplierViewSet(viewsets.ModelViewSet):
    """
    CRUD API for suppliers and craftspersons.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        return get_suppliers_for_user(self.request.user, category=category, search=search)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SupplierDetailSerializer
        return SupplierSerializer

    def retrieve(self, request, *args, **kwargs):
        supplier = get_supplier_detail(request.user, kwargs.get('pk'))
        serializer = SupplierDetailSerializer(supplier)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = SupplierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        supplier = MaintenanceService.create_supplier(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response(
            {
                "success": True,
                "message": f"Fournisseur '{supplier.name}' ajouté avec succès.",
                "data": SupplierSerializer(supplier).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = SupplierSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        supplier = MaintenanceService.update_supplier(
            owner=request.user,
            supplier_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Fournisseur '{supplier.name}' mis à jour avec succès.",
            "data": SupplierSerializer(supplier).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        MaintenanceService.delete_supplier(
            owner=request.user,
            supplier_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response(
            {"success": True, "message": "Fournisseur archivé avec succès."},
            status=status.HTTP_200_OK,
        )


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    """
    CRUD API for maintenance tickets and contractor interventions.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        property_id = self.request.query_params.get('property')
        unit_id = self.request.query_params.get('unit')
        supplier_id = self.request.query_params.get('supplier')
        search = self.request.query_params.get('search')

        return get_maintenance_requests_for_user(
            user=self.request.user,
            status=status_filter,
            priority=priority,
            property_id=property_id,
            unit_id=unit_id,
            supplier_id=supplier_id,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MaintenanceRequestCreateUpdateSerializer
        if self.action == 'retrieve':
            return MaintenanceRequestDetailSerializer
        return MaintenanceRequestSerializer

    def retrieve(self, request, *args, **kwargs):
        req = get_maintenance_request_detail(request.user, kwargs.get('pk'))
        serializer = MaintenanceRequestDetailSerializer(req)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = MaintenanceRequestCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        req = MaintenanceService.create_maintenance_request(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response(
            {
                "success": True,
                "message": f"Ticket d'intervention '{req.ticket_number}' créé avec succès.",
                "data": MaintenanceRequestSerializer(req).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = MaintenanceRequestCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        req = MaintenanceService.update_maintenance_request(
            owner=request.user,
            request_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Ticket '{req.ticket_number}' mis à jour avec succès.",
            "data": MaintenanceRequestSerializer(req).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        MaintenanceService.delete_maintenance_request(
            owner=request.user,
            request_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response(
            {"success": True, "message": "Ticket d'intervention supprimé avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='assign-supplier')
    def assign_supplier(self, request, pk=None):
        """Assigns a craftsperson to the ticket and enters estimated cost."""
        serializer = MaintenanceAssignSupplierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        req = MaintenanceService.assign_supplier(
            owner=request.user,
            request_id=pk,
            supplier_id=str(serializer.validated_data['supplier_id']),
            estimated_cost=serializer.validated_data.get('estimated_cost'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Prestataire '{req.supplier.name}' assigné au ticket '{req.ticket_number}'.",
            "data": MaintenanceRequestSerializer(req).data,
        })

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Updates ticket lifecycle status and records final actual cost."""
        serializer = MaintenanceStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        req = MaintenanceService.update_status(
            owner=request.user,
            request_id=pk,
            status=serializer.validated_data['status'],
            actual_cost=serializer.validated_data.get('actual_cost'),
            completed_date=serializer.validated_data.get('completed_date'),
            notes=serializer.validated_data.get('notes'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Statut du ticket '{req.ticket_number}' mis à jour vers '{req.get_status_display()}'.",
            "data": MaintenanceRequestSerializer(req).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns maintenance technical and financial KPIs."""
        stats_data = get_maintenance_stats_for_user(request.user)
        return Response({"success": True, "data": stats_data})
