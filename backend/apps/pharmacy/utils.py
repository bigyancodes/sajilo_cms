# Attempt to render the HTML
try:
    # Use the template from the templates directory
    html_string = render_to_string('invoice.html', context)
    logger.info("Successfully rendered invoice template")
except Exception as render_error:
    logger.error(f"Error rendering HTML template: {str(render_error)}")
    raise
