from django.urls import path
from .views import DashboardKPIView, FinancialReportView

app_name = 'reports'

urlpatterns = [
    path('dashboard/', DashboardKPIView.as_view(), name='dashboard-kpis'),
    path('financial-report/', FinancialReportView.as_view(), name='financial-report'),
]
