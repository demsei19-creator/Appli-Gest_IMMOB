from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User
from apps.accounts.constants import UserRole
from apps.properties.models import Property, Unit
from apps.properties.constants import PropertyType, UnitType, UnitStatus
from apps.tenants.models import Tenant
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus
from apps.billing.models import RentInvoice
from apps.billing.constants import InvoiceStatus
from apps.payments.models import Payment, PaymentAllocation
from apps.payments.constants import PaymentMethod, PaymentStatus


class PropertyAndBillingTestCase(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner.test@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER
        )

        self.property = Property.objects.create(
            owner=self.owner,
            name="Résidence Les Palmiers",
            property_type=PropertyType.BUILDING,
            address="14 Boulevard de la République",
            city="Abidjan"
        )

        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="A101",
            floor="1er étage",
            unit_type=UnitType.APARTMENT_T3,
            surface_area_sqm=Decimal("85.00"),
            base_rent_amount=Decimal("350000.00"),
            service_charges_amount=Decimal("30000.00"),
            status=UnitStatus.VACANT
        )

        self.tenant = Tenant.objects.create(
            owner=self.owner,
            first_name="Jean",
            last_name="Konan",
            email="jean.konan@example.com",
            phone_number="+2250102030405",
            monthly_income=Decimal("1200000.00")
        )

    def test_property_and_unit_creation(self):
        self.assertEqual(self.property.units.count(), 1)
        self.assertEqual(self.unit.total_rent_amount, Decimal("380000.00"))

    def test_lease_and_invoice_workflow(self):
        lease = Lease.objects.create(
            owner=self.owner,
            unit=self.unit,
            tenant=self.tenant,
            start_date=timezone.now().date(),
            rent_amount=Decimal("350000.00"),
            charges_amount=Decimal("30000.00"),
            status=LeaseStatus.ACTIVE
        )
        self.assertEqual(lease.total_monthly_amount, Decimal("380000.00"))

        invoice = RentInvoice.objects.create(
            owner=self.owner,
            lease=lease,
            invoice_number="FAC-202608-001",
            period_start=timezone.now().date(),
            period_end=timezone.now().date(),
            due_date=timezone.now().date(),
            rent_amount=lease.rent_amount,
            charges_amount=lease.charges_amount,
            total_expected=lease.total_monthly_amount,
            status=InvoiceStatus.UNPAID
        )
        self.assertEqual(invoice.remaining_balance, Decimal("380000.00"))

        payment = Payment.objects.create(
            owner=self.owner,
            tenant=self.tenant,
            payment_number="PAY-202608-001",
            amount=Decimal("380000.00"),
            payment_date=timezone.now().date(),
            payment_method=PaymentMethod.BANK_TRANSFER,
            status=PaymentStatus.COMPLETED
        )

        allocation = PaymentAllocation.objects.create(
            payment=payment,
            invoice=invoice,
            allocated_amount=Decimal("380000.00")
        )

        invoice.recompute_financial_state()
        self.assertEqual(invoice.total_paid, Decimal("380000.00"))
        self.assertEqual(invoice.remaining_balance, Decimal("0.00"))
        self.assertEqual(invoice.status, InvoiceStatus.PAID)
