from datetime import timedelta

from django.http import JsonResponse
from rest_framework import viewsets

from dateutil.parser import parse as parse_date

from website import cesium_utils
from website.api.serializers import LocationSerializer, SatelliteSerializer, TLESerializer
from website.models import Location, Satellite, TLE


class SatelliteViewSet(viewsets.ModelViewSet):
    """
    Basic satellite api views.
    """
    queryset = Satellite.objects.all()
    serializer_class = SatelliteSerializer


class TLEViewSet(viewsets.ModelViewSet):
    """
    Basic tle api views.
    """
    serializer_class = TLESerializer

    def get_queryset(self):
        """
        This view should return a list of all the tles for the specified satellite.
        """
        satellite_id = self.kwargs['satellite_id']
        return TLE.objects.filter(satellite_id=satellite_id)


class LocationViewSet(viewsets.ModelViewSet):
    """
    Basic location api views.
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


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
