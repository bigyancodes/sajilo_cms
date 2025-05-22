# pharmacy/urls.py
from django.urls import path
from . import views
from . import stripe_views

app_name = 'pharmacy'

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category_detail'),
    
    # Medicines
    path('medicines/', views.MedicineListView.as_view(), name='medicine_list'),
    path('medicines/<int:pk>/', views.MedicineDetailView.as_view(), name='medicine_detail'),
    
    # Stock Management
    path('stock/batches/', views.StockBatchListView.as_view(), name='stock_batch_list'),
    path('stock/movements/', views.StockMovementListView.as_view(), name='stock_movement_list'),
    
    # Cart Management
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/items/', views.CartItemView.as_view(), name='cart_add_item'),
    path('cart/items/<int:item_id>/', views.CartItemView.as_view(), name='cart_item_detail'),
    path('cart/clear/', views.ClearCartView.as_view(), name='cart_clear'),
    path('cart/add/<int:item_id>/', views.CartAddItemView.as_view(), name='cart_add'),
    path('cart/decrease/<int:item_id>/', views.CartDecreaseItemView.as_view(), name='cart_decrease'),
    
    # Orders
    path('orders/', views.OrderListView.as_view(), name='order_list'),
    path('orders/<uuid:pk>/', views.OrderDetailView.as_view(), name='order_detail'),
    path('orders/create/', views.OrderCreateView.as_view(), name='order_create'),
    
    # Payments
    path('payments/', views.PaymentListView.as_view(), name='payment_list'),
    path('payments/<uuid:pk>/', views.PaymentDetailView.as_view(), name='payment_detail'),
    
    # Reports
    path('reports/low-stock/', views.LowStockReportView.as_view(), name='low_stock_report'),
    path('reports/expiry/', views.ExpiryReportView.as_view(), name='expiry_report'),
    path('reports/sales/', views.SalesReportView.as_view(), name='sales_report'),
    
    # Audit Logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_log_list'),
    
    # Stripe Payment Integration
    path('create-payment-intent/', stripe_views.CreatePaymentIntentView.as_view(), name='create_payment_intent'),
    path('update-payment-status/', stripe_views.UpdatePaymentStatusView.as_view(), name='update_payment_status'),
    
    # Notifications endpoints removed
    
    path('webhook/stripe/', stripe_views.stripe_webhook, name='stripe_webhook'),
]