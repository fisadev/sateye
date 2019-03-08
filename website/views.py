from datetime import timedelta

from django.http import JsonResponse
from django.shortcuts import render

from dateutil.parser import parse as parse_date

from website import cesium_utils
from website.models import Satellite


def home(request):
    """
    Home page, where the single page app is loaded.
    """
    return render(request, 'website/home.html')


def api_predict_path(request, satellite_id):
    """
    Get predictions for a satellite.
    """
    satellite = Satellite.objects.get(pk=satellite_id)
    start_date = parse_date(request.GET['start_date'])
    end_date = parse_date(request.GET['end_date'])
    steps = int(request.GET['steps'])

    duration = (end_date - start_date).total_seconds()
    step_seconds = duration / steps

    positions = satellite.predict_path(start_date, end_date, step_seconds)
    cesium_data = cesium_utils.generate_path_data(satellite, start_date, end_date, positions)

    return JsonResponse({
        'czml': cesium_data,
    })
