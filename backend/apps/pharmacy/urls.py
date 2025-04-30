from django.urls import path
from .views import (
    MedicineListCreateView, MedicineDetailView,
    OrderListCreateView, OrderDetailView, FulfillOrderView,
    BillingListView, BillingDetailView,
    StockTransactionListCreateView, AddStockView,
    StockReportView, ExpiredMedicinesView, MostUsedMedicinesView,
    AuditLogListView
)

app_name = "pharmacy"

urlpatterns = [
    path('medicines/', MedicineListCreateView.as_view(), name='medicine-list-create'),
    path('medicines/<int:pk>/', MedicineDetailView.as_view(), name='medicine-detail'),
    path('orders/', OrderListCreateView.as_view(), name='order-list-create'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:order_id>/fulfill/', FulfillOrderView.as_view(), name='fulfill-order'),
    path('billings/', BillingListView.as_view(), name='billing-list'),
    path('billings/<int:pk>/', BillingDetailView.as_view(), name='billing-detail'),
    path('stock-transactions/', StockTransactionListCreateView.as_view(), name='stock-transaction-list-create'),
    path('add-stock/', AddStockView.as_view(), name='add-stock'),
    path('reports/stock/', StockReportView.as_view(), name='stock-report'),
    path('reports/expired/', ExpiredMedicinesView.as_view(), name='expired-medicines'),
    path('reports/most-used/', MostUsedMedicinesView.as_view(), name='most-used-medicines'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit-log-list'),
]