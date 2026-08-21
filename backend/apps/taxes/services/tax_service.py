from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from common.services import BaseService
from common.exceptions import ResourceNotFoundException, FinancialException
from common.utils.financial import quantize_amount
from apps.audit.services.audit_service import AuditService
from apps.properties.models import Property
from ..models import PropertyTax


class TaxService(BaseService):
    """
    Business operations for property taxes and fiscal declarations (Rules 5, 6, 7, 8).
    """

    @classmethod
    @transaction.atomic
    def create_tax(cls, owner, validated_data: dict, ip_address: str = None) -> PropertyTax:
        effective_owner = owner.get_effective_owner()
        property_obj = validated_data.get('property')
        amount = quantize_amount(validated_data.get('amount'))

        if property_obj.owner != effective_owner:
            raise ResourceNotFoundException("Immeuble introuvable pour ce propriétaire.", code="PROPERTY_NOT_FOUND")

        if amount <= Decimal('0.00'):
            raise FinancialException(
                code="INVALID_TAX_AMOUNT",
                message="Le montant de l'impôt doit être strictement supérieur à zéro."
            )

        validated_data['amount'] = amount

        if validated_data.get('is_paid') and not validated_data.get('paid_date'):
            validated_data['paid_date'] = timezone.now().date()

        tax = PropertyTax.objects.create(
            owner=effective_owner,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='PropertyTax',
            resource_id=str(tax.id),
            changes={
                'tax_number': tax.tax_number,
                'tax_type': tax.tax_type,
                'fiscal_year': tax.fiscal_year,
                'amount': str(tax.amount),
                'property': property_obj.name,
                'is_paid': tax.is_paid
            },
            ip_address=ip_address
        )

        return tax

    @classmethod
    @transaction.atomic
    def update_tax(cls, owner, tax_id: str, validated_data: dict, ip_address: str = None) -> PropertyTax:
        effective_owner = owner.get_effective_owner()
        try:
            tax = PropertyTax.objects.get(id=tax_id, owner=effective_owner, is_active=True)
        except PropertyTax.DoesNotExist:
            raise ResourceNotFoundException("Avis d'imposition introuvable.", code="TAX_NOT_FOUND")

        if 'amount' in validated_data:
            amt = quantize_amount(validated_data['amount'])
            if amt <= Decimal('0.00'):
                raise FinancialException(
                    code="INVALID_TAX_AMOUNT",
                    message="Le montant de l'impôt doit être strictement supérieur à zéro."
                )
            validated_data['amount'] = amt

        for key, value in validated_data.items():
            setattr(tax, key, value)

        if tax.is_paid and not tax.paid_date:
            tax.paid_date = timezone.now().date()

        tax.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='PropertyTax',
            resource_id=str(tax.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return tax

    @classmethod
    @transaction.atomic
    def mark_as_paid(cls, owner, tax_id: str, paid_date=None, ip_address: str = None) -> PropertyTax:
        effective_owner = owner.get_effective_owner()
        try:
            tax = PropertyTax.objects.get(id=tax_id, owner=effective_owner, is_active=True)
        except PropertyTax.DoesNotExist:
            raise ResourceNotFoundException("Avis d'imposition introuvable.", code="TAX_NOT_FOUND")

        tax.is_paid = True
        tax.paid_date = paid_date or timezone.now().date()
        tax.save(update_fields=['is_paid', 'paid_date', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='PropertyTax',
            resource_id=str(tax.id),
            changes={'is_paid': True, 'paid_date': str(tax.paid_date)},
            ip_address=ip_address
        )

        return tax

    @classmethod
    @transaction.atomic
    def delete_tax(cls, owner, tax_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            tax = PropertyTax.objects.get(id=tax_id, owner=effective_owner, is_active=True)
        except PropertyTax.DoesNotExist:
            raise ResourceNotFoundException("Avis d'imposition introuvable.", code="TAX_NOT_FOUND")

        tax.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='PropertyTax',
            resource_id=str(tax.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
