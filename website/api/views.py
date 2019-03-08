from datetime import timedelta

from django.http import JsonResponse
from rest_framework import viewsets

from dateutil.parser import parse as parse_date

from website import models, cesium_utils
from website.api import serializers
from website.models import Satellite


class SatelliteViewSet(viewsets.ModelViewSet):
    """
    Basic satellite api views.
    """
    queryset = models.Satellite.objects.all()
    serializer_class = serializers.SatelliteSerializer


class LocationViewSet(viewsets.ModelViewSet):
    """
    Basic location api views.
    """
    queryset = models.Location.objects.all()
    serializer_class = serializers.LocationSerializer


def predict_path(request, satellite_id):
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
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
    })
