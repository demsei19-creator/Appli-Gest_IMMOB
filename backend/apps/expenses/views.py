from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsAccountant
from .models import Expense
from .serializers import (
    ExpenseSerializer,
    ExpenseDetailSerializer,
    ExpenseCreateUpdateSerializer,
)
from .services.expense_service import ExpenseService
from .selectors.expense_selectors import (
    get_expenses_for_user,
    get_expense_detail,
    get_expense_stats_for_user,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD API for landlord expenses and deductible charges.
    """
    permission_classes = [IsAuthenticated, IsAccountant]

    def get_queryset(self):
        property_id = self.request.query_params.get('property')
        unit_id = self.request.query_params.get('unit')
        category = self.request.query_params.get('category')
        is_deductible_param = self.request.query_params.get('is_deductible')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        search = self.request.query_params.get('search')

        is_deductible = None
        if is_deductible_param is not None:
            is_deductible = is_deductible_param.lower() in ['true', '1']

        return get_expenses_for_user(
            user=self.request.user,
            property_id=property_id,
            unit_id=unit_id,
            category=category,
            is_deductible=is_deductible,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None,
            search=search
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateUpdateSerializer
        if self.action == 'retrieve':
            return ExpenseDetailSerializer
        return ExpenseSerializer

    def retrieve(self, request, *args, **kwargs):
        expense = get_expense_detail(request.user, kwargs.get('pk'))
        serializer = ExpenseDetailSerializer(expense)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        expense = ExpenseService.create_expense(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response(
            {
                "success": True,
                "message": f"Dépense '{expense.expense_number}' enregistrée avec succès.",
                "data": ExpenseSerializer(expense).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = ExpenseCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        expense = ExpenseService.update_expense(
            owner=request.user,
            expense_id=kwargs.get('pk'),
            validated_data=serializer.validated_data,
            ip_address=ip
        )
        return Response({
            "success": True,
            "message": f"Dépense '{expense.expense_number}' mise à jour avec succès.",
            "data": ExpenseSerializer(expense).data,
        })

    def destroy(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        ExpenseService.delete_expense(
            owner=request.user,
            expense_id=kwargs.get('pk'),
            ip_address=ip
        )
        return Response(
            {"success": True, "message": "Dépense supprimée avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Returns expense statistics and deductible breakdowns."""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        stats_data = get_expense_stats_for_user(
            user=request.user,
            month=int(month) if month and month.isdigit() else None,
            year=int(year) if year and year.isdigit() else None
        )
        return Response({"success": True, "data": stats_data})
