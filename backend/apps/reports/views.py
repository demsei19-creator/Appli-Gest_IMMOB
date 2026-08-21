from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .selectors.dashboard_selectors import get_dashboard_kpis
from .selectors.financial_report_selectors import get_financial_report


class DashboardKPIView(APIView):
    """
    GET /api/v1/reports/dashboard/
    Returns real-time aggregated metrics, timeline, and alerts for the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kpis = get_dashboard_kpis(request.user)
        return Response({
            "success": True,
            "data": kpis
        })


class FinancialReportView(APIView):
    """
    GET /api/v1/reports/financial-report/
    Generates consolidated annual or property financial statement.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year_param = request.query_params.get('year')
        property_id = request.query_params.get('property')

        year = int(year_param) if year_param and year_param.isdigit() else None
        report_data = get_financial_report(
            user=request.user,
            year=year,
            property_id=property_id
        )
        return Response({
            "success": True,
            "data": report_data
        })
