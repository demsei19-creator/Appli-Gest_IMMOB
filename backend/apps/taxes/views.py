from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from common.permissions import IsAccountant
from .models import PropertyTax
from .serializers import (
    PropertyTaxSerializer,
    PropertyTaxDetailSerializer,
    PropertyTaxCreateUpdateSerializer,
    PropertyTaxMarkPaidSerializer,
)
from .services.tax_service import TaxService
from .selectors.tax_selectors import (
    get_taxes_for_user,
    get_tax_detail,
    get_tax_stats_for_user,
    get_tax_simulation_for_year,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class PropertyTaxViewSet(viewsets.ModelViewSet):
    """
    CRUD API for property taxes, fiscal due dates and tax declaration simulation.
    """
    permission_classes = [IsAuthenticated, IsAccountant]

    def get_queryset(self):
        property_id = self.request.query_params.get('property')
        tax_type = self.request.query_params.get('tax_type')
        fiscal_year = self.request.query_params.get('fiscal_year')
        is_paid_param = self.request.query_params.get('is_paid')
        search = self.request.query_params.get('search')

        is_paid = None
        if is_paid_param is not None:
            is_paid = is_paid_param.lower() in ['true', '1']

        return get_taxes_for_user(
            user=self.request.user,
            property_id=property_id,
            tax_type=tax_type,
            fiscal_year=int(fiscal_year) if fiscal_year and fiscal_year.isdigit() else None,
            is_paid=is_paid,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PropertyTaxCreateUpdateSerializer
        if self.action == 'retrieve':
            return PropertyTaxDetailSerializer
        return PropertyTaxSerializer

    def retrieve(self, request, *args, **kwargs):
        tax = get_tax_detail(request.user, kwargs.get('pk'))
        serializer = PropertyTaxDetailSerializer(tax)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = PropertyTaxCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        tax = TaxService.create_tax(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response(
            {
                "success": True,
                "message": f"Avis fiscal '{tax.tax_number}' enregistré avec succès.",
                "data": PropertyTaxSerializer(tax).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = PropertyTaxCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        tax = TaxService.update_tax(
            owner=request.user,
            tax_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Avis fiscal '{tax.tax_number}' mis à jour avec succès.",
            "data": PropertyTaxSerializer(tax).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        TaxService.delete_tax(
            owner=request.user,
            tax_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response(
            {"success": True, "message": "Avis d'imposition supprimé avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """Marks tax as settled with paid_date."""
        serializer = PropertyTaxMarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        tax = TaxService.mark_as_paid(
            owner=request.user,
            tax_id=pk,
            paid_date=serializer.validated_data.get('paid_date'),
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"L'impôt '{tax.tax_number}' a été marqué comme acquitté.",
            "data": PropertyTaxSerializer(tax).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns tax KPIs and payment statuses for a fiscal year."""
        year = request.query_params.get('fiscal_year')
        fiscal_year = int(year) if year and year.isdigit() else None
        stats_data = get_tax_stats_for_user(user=request.user, fiscal_year=fiscal_year)
        return Response({"success": True, "data": stats_data})

    @action(detail=False, methods=['get'])
    def simulation(self, request):
        """Returns annual real estate tax simulation (Gross Income - Deductibles)."""
        year = request.query_params.get('fiscal_year')
        fiscal_year = int(year) if year and year.isdigit() else timezone.now().year
        sim_data = get_tax_simulation_for_year(user=request.user, fiscal_year=fiscal_year)
        return Response({"success": True, "data": sim_data})
