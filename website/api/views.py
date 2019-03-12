from datetime import timedelta

from django.db.models import Q
from django.http import JsonResponse
from rest_framework import viewsets

from dateutil.parser import parse as parse_date

from website import cesium_utils
from website.api import serializers
from website.models import Location, Satellite, TLE


class SatelliteViewSet(viewsets.ModelViewSet):
    """
    Basic satellite api views.
    """
    serializer_class = serializers.SatelliteSerializer

    def get_queryset(self):
        """
        This view should return the satellites visible by the user using the app. That means
        satellites owned by that user, or public satellites (owner=None).
        """
        if self.request.user.is_authenticated:
            can_see = Q(owner=self.request.user) | Q(owner=None)
        else:
            can_see = Q(owner=None)

        return Satellite.objects.filter(can_see).order_by('pk')


class TLEViewSet(viewsets.ModelViewSet):
    """
    Basic tle api views.
    """
    serializer_class = serializers.TLESerializer

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
