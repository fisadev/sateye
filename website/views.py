from django.conf import settings
from django.shortcuts import render


def home(request):
    """
    Home page, where the single page app is loaded.
    """
    return render(request, 'website/home.html', {'settings': settings})
