from django.conf import settings
from django.shortcuts import render


def home(request, dashboard_id=None):
    """
    Home page, where the single page app is loaded.
    """
    return render(request, 'website/home.html',
                  {'dashboard_id': dashboard_id, 'settings': settings})
