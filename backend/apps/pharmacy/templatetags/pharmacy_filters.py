from django import template
from decimal import Decimal

register = template.Library()

@register.filter
def multiply(value, arg):
    """Multiplies the value by the argument"""
    try:
        # Convert to Decimal for precise decimal math
        value = Decimal(str(value))
        arg = Decimal(str(arg))
        return value * arg
    except (ValueError, TypeError):
        return 0
