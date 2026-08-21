from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from common.permissions import IsManager
from .models import Property, Unit
from .serializers import (
    PropertySerializer,
    PropertyDetailSerializer,
    PropertyCreateUpdateSerializer,
    UnitSerializer,
    UnitDetailSerializer,
    UnitCreateUpdateSerializer,
    UnitStatusUpdateSerializer,
)
from .services.property_service import PropertyService
from .services.unit_service import UnitService
from .selectors.property_selectors import (
    get_properties_for_user,
    get_property_detail,
    get_portfolio_kpis_for_user,
)
from .selectors.unit_selectors import (
    get_units_for_user,
    get_unit_detail,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class PropertyViewSet(viewsets.ModelViewSet):
    """
    CRUD API for real estate properties/buildings.
    Adheres strictly to the Services & Selectors pattern and multi-tenant isolation.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        search = self.request.query_params.get('search')
        property_type = self.request.query_params.get('property_type')
        city = self.request.query_params.get('city')
        return get_properties_for_user(
            user=self.request.user,
            search=search,
            property_type=property_type,
            city=city
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PropertyCreateUpdateSerializer
        if self.action == 'retrieve':
            return PropertyDetailSerializer
        return PropertySerializer

    def retrieve(self, request, *args, **kwargs):
        property_obj = get_property_detail(request.user, kwargs.get('pk'))
        serializer = PropertyDetailSerializer(property_obj)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = PropertyCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        property_obj = PropertyService.create_property(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Le bien immobilier '{property_obj.name}' a été créé avec succès.",
                "data": PropertySerializer(property_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        serializer = PropertyCreateUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        property_obj = PropertyService.update_property(
            owner=request.user,
            property_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le bien immobilier '{property_obj.name}' a été mis à jour.",
            "data": PropertySerializer(property_obj).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        PropertyService.delete_property(
            owner=request.user,
            property_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": "Le bien immobilier a été archivé avec succès."
        })

    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        """Returns all units belonging to this specific property."""
        units = get_units_for_user(request.user, property_id=pk)
        serializer = UnitSerializer(units, many=True)
        return Response({"success": True, "data": serializer.data})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns global portfolio occupancy and financial statistics."""
        kpis = get_portfolio_kpis_for_user(request.user)
        return Response({"success": True, "data": kpis})


class UnitViewSet(viewsets.ModelViewSet):
    """
    CRUD API for rentable units / lots.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        property_id = self.request.query_params.get('property')
        status_param = self.request.query_params.get('status')
        unit_type = self.request.query_params.get('unit_type')
        search = self.request.query_params.get('search')
        return get_units_for_user(
            user=self.request.user,
            property_id=property_id,
            status=status_param,
            unit_type=unit_type,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UnitCreateUpdateSerializer
        if self.action == 'retrieve':
            return UnitDetailSerializer
        return UnitSerializer

    def retrieve(self, request, *args, **kwargs):
        unit = get_unit_detail(request.user, kwargs.get('pk'))
        serializer = UnitDetailSerializer(unit)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        property_id = request.data.get('property')
        serializer = UnitCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        unit = UnitService.create_unit(
            owner=request.user,
            property_id=property_id,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Le lot '{unit.unit_number}' a été ajouté avec succès.",
                "data": UnitSerializer(unit).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        serializer = UnitCreateUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        unit = UnitService.update_unit(
            owner=request.user,
            unit_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le lot '{unit.unit_number}' a été mis à jour.",
            "data": UnitSerializer(unit).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        UnitService.delete_unit(
            owner=request.user,
            unit_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": "Le logement a été supprimé avec succès."
        })

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Quick status transition for a unit."""
        serializer = UnitStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        unit = UnitService.update_unit_status(
            owner=request.user,
            unit_id=pk,
            new_status=serializer.validated_data['status'],
            reason=serializer.validated_data.get('reason'),
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": f"Le statut du lot {unit.unit_number} est désormais '{unit.get_status_display()}'.",
            "data": UnitSerializer(unit).data,
        })
