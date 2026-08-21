from decimal import Decimal
from django.db import transaction
from common.services import BaseService
from common.exceptions import ResourceNotFoundException, BusinessException, FinancialException
from common.utils.financial import quantize_amount
from apps.audit.services.audit_service import AuditService
from apps.properties.models import Property, Unit
from apps.maintenance.models import Supplier
from ..models import Expense


class ExpenseService(BaseService):
    """
    Business operations for expenses and deductible charges management (Rules 5, 6, 7, 8).
    """

    @classmethod
    @transaction.atomic
    def create_expense(cls, owner, validated_data: dict, ip_address: str = None) -> Expense:
        effective_owner = owner.get_effective_owner()
        property_obj = validated_data.get('property')
        unit = validated_data.get('unit')
        supplier = validated_data.get('supplier')
        amount = quantize_amount(validated_data.get('amount'))

        if property_obj.owner != effective_owner:
            raise ResourceNotFoundException("Immeuble introuvable pour ce propriétaire.", code="PROPERTY_NOT_FOUND")

        if unit and unit.property != property_obj:
            raise BusinessException("Le logement sélectionné n'appartient pas à cet immeuble.", code="INVALID_UNIT")

        if supplier and supplier.owner != effective_owner:
            raise ResourceNotFoundException("Fournisseur introuvable pour ce propriétaire.", code="SUPPLIER_NOT_FOUND")

        if amount <= Decimal('0.00'):
            raise FinancialException(
                code="INVALID_EXPENSE_AMOUNT",
                message="Le montant de la dépense doit être strictement supérieur à zéro."
            )

        validated_data['amount'] = amount

        expense = Expense.objects.create(
            owner=effective_owner,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Expense',
            resource_id=str(expense.id),
            changes={
                'expense_number': expense.expense_number,
                'title': expense.title,
                'amount': str(expense.amount),
                'category': expense.category,
                'property': property_obj.name,
                'is_deductible': expense.is_deductible
            },
            ip_address=ip_address
        )

        return expense

    @classmethod
    @transaction.atomic
    def update_expense(cls, owner, expense_id: str, validated_data: dict, ip_address: str = None) -> Expense:
        effective_owner = owner.get_effective_owner()
        try:
            expense = Expense.objects.get(id=expense_id, owner=effective_owner, is_active=True)
        except Expense.DoesNotExist:
            raise ResourceNotFoundException("Dépense introuvable.", code="EXPENSE_NOT_FOUND")

        if 'amount' in validated_data:
            amt = quantize_amount(validated_data['amount'])
            if amt <= Decimal('0.00'):
                raise FinancialException(
                    code="INVALID_EXPENSE_AMOUNT",
                    message="Le montant de la dépense doit être strictement supérieur à zéro."
                )
            validated_data['amount'] = amt

        for key, value in validated_data.items():
            setattr(expense, key, value)
        expense.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Expense',
            resource_id=str(expense.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return expense

    @classmethod
    @transaction.atomic
    def delete_expense(cls, owner, expense_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            expense = Expense.objects.get(id=expense_id, owner=effective_owner, is_active=True)
        except Expense.DoesNotExist:
            raise ResourceNotFoundException("Dépense introuvable.", code="EXPENSE_NOT_FOUND")

        expense.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Expense',
            resource_id=str(expense.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
