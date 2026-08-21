from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.constants import UserRole
from apps.properties.models import Property, Unit
from apps.properties.constants import PropertyType, UnitType, UnitStatus
from apps.tenants.models import Tenant
from apps.tenants.constants import TenantType
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus
from apps.billing.models import RentInvoice
from apps.billing.constants import InvoiceStatus
from apps.payments.models import Payment, PaymentAllocation
from apps.payments.constants import PaymentStatus, PaymentMethod
from apps.maintenance.models import Supplier, MaintenanceRequest
from apps.maintenance.constants import SupplierCategory, MaintenanceStatus, MaintenancePriority
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseCategory
from apps.taxes.models import PropertyTax
from apps.taxes.constants import TaxType

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds comprehensive demo data for instant platform exploration."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Création des données de démonstration..."))

        # 1. Create Demo Owner
        owner, _ = User.objects.get_or_create(
            email="demo@appli-imob.com",
            defaults={
                "username": "demo@appli-imob.com",
                "first_name": "Amadou",
                "last_name": "Diallo",
                "phone_number": "+22507080910",
                "company_name": "Diallo Immobilier & Invest",
                "role": UserRole.OWNER,
                "is_active": True,
            }
        )
        owner.set_password("Password123!")
        owner.save()
        self.stdout.write(self.style.SUCCESS("Compte Propriétaire créé : demo@appli-imob.com / Password123!"))

        # 2. Create Sub-Users
        manager, _ = User.objects.get_or_create(
            email="gestionnaire@appli-imob.com",
            defaults={
                "username": "gestionnaire@appli-imob.com",
                "first_name": "Fatou",
                "last_name": "Kouamé",
                "phone_number": "+22501020304",
                "role": UserRole.MANAGER,
                "managed_by_owner": owner,
                "is_active": True,
            }
        )
        manager.set_password("Password123!")
        manager.save()

        accountant, _ = User.objects.get_or_create(
            email="comptable@appli-imob.com",
            defaults={
                "username": "comptable@appli-imob.com",
                "first_name": "Ibrahim",
                "last_name": "Touré",
                "phone_number": "+22505060708",
                "role": UserRole.ACCOUNTANT,
                "managed_by_owner": owner,
                "is_active": True,
            }
        )
        accountant.set_password("Password123!")
        accountant.save()

        # 3. Create Properties & Units
        prop1, _ = Property.objects.get_or_create(
            owner=owner,
            name="Résidence Les Jardins d'Angré",
            defaults={
                "code": "PROP-ANGRE",
                "property_type": PropertyType.RESIDENCE,
                "address": "Boulevard des Martyrs, Carrefour Mandela",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "estimated_value": Decimal("450000000.00"),
            }
        )

        prop2, _ = Property.objects.get_or_create(
            owner=owner,
            name="Immeuble Le Palmier",
            defaults={
                "code": "PROP-PALMIER",
                "property_type": PropertyType.BUILDING,
                "address": "Rue Principale, Face Banque Atlantique",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "estimated_value": Decimal("320000000.00"),
            }
        )

        # Units for Prop 1
        unit1, _ = Unit.objects.get_or_create(
            property=prop1,
            unit_number="A101",
            defaults={
                "unit_type": UnitType.APARTMENT_T3,
                "floor": "1",
                "surface_area_sqm": Decimal("85.50"),
                "base_rent_amount": Decimal("400000.00"),
                "service_charges_amount": Decimal("35000.00"),
                "status": UnitStatus.OCCUPIED,
            }
        )
        unit2, _ = Unit.objects.get_or_create(
            property=prop1,
            unit_number="A102",
            defaults={
                "unit_type": UnitType.APARTMENT_T4,
                "floor": "1",
                "surface_area_sqm": Decimal("110.00"),
                "base_rent_amount": Decimal("550000.00"),
                "service_charges_amount": Decimal("45000.00"),
                "status": UnitStatus.OCCUPIED,
            }
        )
        unit3, _ = Unit.objects.get_or_create(
            property=prop1,
            unit_number="B201",
            defaults={
                "unit_type": UnitType.STUDIO,
                "floor": "2",
                "surface_area_sqm": Decimal("42.00"),
                "base_rent_amount": Decimal("220000.00"),
                "service_charges_amount": Decimal("20000.00"),
                "status": UnitStatus.VACANT,
            }
        )
        unit4, _ = Unit.objects.get_or_create(
            property=prop1,
            unit_number="B202",
            defaults={
                "unit_type": UnitType.APARTMENT_T2,
                "floor": "2",
                "surface_area_sqm": Decimal("55.00"),
                "base_rent_amount": Decimal("300000.00"),
                "service_charges_amount": Decimal("25000.00"),
                "status": UnitStatus.OCCUPIED,
            }
        )

        # Units for Prop 2
        unit5, _ = Unit.objects.get_or_create(
            property=prop2,
            unit_number="BUR-01",
            defaults={
                "unit_type": UnitType.OFFICE,
                "floor": "RDC",
                "surface_area_sqm": Decimal("140.00"),
                "base_rent_amount": Decimal("850000.00"),
                "service_charges_amount": Decimal("60000.00"),
                "status": UnitStatus.OCCUPIED,
            }
        )
        unit6, _ = Unit.objects.get_or_create(
            property=prop2,
            unit_number="BUR-02",
            defaults={
                "unit_type": UnitType.OFFICE,
                "floor": "1",
                "surface_area_sqm": Decimal("120.00"),
                "base_rent_amount": Decimal("750000.00"),
                "service_charges_amount": Decimal("50000.00"),
                "status": UnitStatus.VACANT,
            }
        )

        # 4. Create Tenants
        tenant1, _ = Tenant.objects.get_or_create(
            owner=owner,
            email="patrick.aka@example.com",
            defaults={
                "first_name": "Patrick",
                "last_name": "Aka",
                "phone_number": "+22507788990",
                "tenant_type": TenantType.INDIVIDUAL,
                "profession": "Ingénieur Télécoms",
                "monthly_income": Decimal("1800000.00"),
            }
        )

        tenant2, _ = Tenant.objects.get_or_create(
            owner=owner,
            email="contact@africom-group.ci",
            defaults={
                "first_name": "Société",
                "last_name": "Africom",
                "phone_number": "+22527220011",
                "tenant_type": TenantType.COMPANY,
                "company_name": "Africom Technologies SARL",
            }
        )

        tenant3, _ = Tenant.objects.get_or_create(
            owner=owner,
            email="marie.bamba@example.com",
            defaults={
                "first_name": "Marie-Laure",
                "last_name": "Bamba",
                "phone_number": "+22505544332",
                "tenant_type": TenantType.INDIVIDUAL,
                "profession": "Architecte d'Intérieur",
                "monthly_income": Decimal("1400000.00"),
            }
        )

        # 5. Create Leases
        today = timezone.now().date()

        lease1, _ = Lease.objects.get_or_create(
            owner=owner,
            unit=unit1,
            defaults={
                "tenant": tenant1,
                "start_date": today - timedelta(days=200),
                "end_date": today + timedelta(days=165),
                "rent_amount": Decimal("400000.00"),
                "charges_amount": Decimal("35000.00"),
                "deposit_amount": Decimal("800000.00"),
                "payment_day_of_month": 5,
                "status": LeaseStatus.ACTIVE,
            }
        )

        lease2, _ = Lease.objects.get_or_create(
            owner=owner,
            unit=unit5,
            defaults={
                "tenant": tenant2,
                "start_date": today - timedelta(days=365),
                "end_date": today + timedelta(days=45), # Expiring soon in 45 days
                "rent_amount": Decimal("850000.00"),
                "charges_amount": Decimal("60000.00"),
                "deposit_amount": Decimal("1700000.00"),
                "payment_day_of_month": 1,
                "status": LeaseStatus.ACTIVE,
            }
        )

        lease3, _ = Lease.objects.get_or_create(
            owner=owner,
            unit=unit2,
            defaults={
                "tenant": tenant3,
                "start_date": today - timedelta(days=90),
                "end_date": today + timedelta(days=275),
                "rent_amount": Decimal("550000.00"),
                "charges_amount": Decimal("45000.00"),
                "deposit_amount": Decimal("1100000.00"),
                "payment_day_of_month": 5,
                "status": LeaseStatus.ACTIVE,
            }
        )

        # 6. Invoices & Payments
        inv1, _ = RentInvoice.objects.get_or_create(
            owner=owner,
            lease=lease1,
            period_start=today.replace(day=1),
            defaults={
                "period_end": today,
                "due_date": today.replace(day=5),
                "rent_amount": Decimal("400000.00"),
                "charges_amount": Decimal("35000.00"),
                "total_expected": Decimal("435000.00"),
                "total_paid": Decimal("435000.00"),
                "remaining_balance": Decimal("0.00"),
                "status": InvoiceStatus.PAID,
            }
        )

        pay1, _ = Payment.objects.get_or_create(
            owner=owner,
            tenant=tenant1,
            payment_date=today.replace(day=3),
            defaults={
                "payment_number": "PAY-DEMO-0001",
                "receipt_number": "QUIT-DEMO-0001",
                "amount": Decimal("435000.00"),
                "payment_method": PaymentMethod.BANK_TRANSFER,
                "status": PaymentStatus.COMPLETED,
                "reference_number": "VIREMENT-BOA-89912",
            }
        )
        PaymentAllocation.objects.get_or_create(
            payment=pay1,
            invoice=inv1,
            defaults={"allocated_amount": Decimal("435000.00")}
        )

        inv2, _ = RentInvoice.objects.get_or_create(
            owner=owner,
            lease=lease2,
            period_start=today.replace(day=1),
            defaults={
                "period_end": today,
                "due_date": today - timedelta(days=12),
                "rent_amount": Decimal("850000.00"),
                "charges_amount": Decimal("60000.00"),
                "total_expected": Decimal("910000.00"),
                "total_paid": Decimal("0.00"),
                "remaining_balance": Decimal("910000.00"),
                "status": InvoiceStatus.OVERDUE,
            }
        )

        # 7. Suppliers & Maintenance Requests
        sup1, _ = Supplier.objects.get_or_create(
            owner=owner,
            name="Plomberie Moderne Express",
            defaults={
                "category": SupplierCategory.PLUMBING,
                "contact_name": "M. Yao",
                "phone_number": "+22507112233",
                "email": "contact@plomberie-express.ci",
                "address": "Cocody Deux Plateaux, Abidjan",
            }
        )

        sup2, _ = Supplier.objects.get_or_create(
            owner=owner,
            name="Élec Pro Côte d'Ivoire",
            defaults={
                "category": SupplierCategory.ELECTRICAL,
                "contact_name": "M. Kouassi",
                "phone_number": "+22501445566",
                "address": "Marcory Zone 4, Abidjan",
            }
        )

        MaintenanceRequest.objects.get_or_create(
            owner=owner,
            property=prop1,
            unit=unit1,
            defaults={
                "title": "Remplacement robinetterie mitigeur salle d'eau",
                "priority": MaintenancePriority.MEDIUM,
                "status": MaintenanceStatus.ASSIGNED,
                "supplier": sup1,
                "estimated_cost": Decimal("45000.00"),
                "description": "Légère fuite constatée sous le lavabo principal.",
            }
        )

        # 8. Expenses
        Expense.objects.get_or_create(
            owner=owner,
            property=prop1,
            title="Assurance Multirisque Immeuble 2026",
            defaults={
                "category": ExpenseCategory.INSURANCE,
                "amount": Decimal("650000.00"),
                "expense_date": today - timedelta(days=45),
                "paid_to": "NSIA Assurances",
                "is_deductible": True,
            }
        )
        Expense.objects.get_or_create(
            owner=owner,
            property=prop2,
            title="Entretien et vidange groupe électrogène",
            defaults={
                "category": ExpenseCategory.MAINTENANCE,
                "amount": Decimal("180000.00"),
                "expense_date": today - timedelta(days=15),
                "supplier": sup2,
                "is_deductible": True,
            }
        )

        # 9. Property Taxes
        PropertyTax.objects.get_or_create(
            owner=owner,
            property=prop1,
            fiscal_year=today.year,
            defaults={
                "tax_type": TaxType.PROPERTY_TAX,
                "amount": Decimal("380000.00"),
                "due_date": today + timedelta(days=60),
                "is_paid": False,
                "reference_notice": f"TF-{today.year}-ANGRE-0091",
            }
        )

        self.stdout.write(self.style.SUCCESS("Donnees de demonstration initialisees avec succes !"))
