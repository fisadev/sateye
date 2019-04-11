from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from iso8601 import parse_date

from website.api import serializers
from website.models import Dashboard, Location, Satellite, TLE


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

        return Satellite.objects.filter(can_see).order_by('name')


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


class DashboardViewSet(viewsets.ModelViewSet):
    """
    Basic dashboard api.
    """
    serializer_class = serializers.DashboardSerializer

    def get_queryset(self):
        """
        This view should return the dashboards available for a user.
        """
        if self.request.user.is_authenticated:
            can_see = Q(owner=self.request.user)
        else:
            can_see = Q(pk=settings.DEFAULT_DASHBOARD)

        return Dashboard.objects.filter(can_see).order_by('name')


class LocationViewSet(viewsets.ModelViewSet):
    """
    Basic location api views.
    """
    serializer_class = serializers.LocationSerializer

    def get_queryset(self):
        """
        This view should return the locations visible by the user using the app. That means
        locations owned by that user, or public locations (owner=None).
        """
        if self.request.user.is_authenticated:
            can_see = Q(owner=self.request.user) | Q(owner=None)
        else:
            can_see = Q(owner=None)

        return Location.objects.filter(can_see).order_by('name')


@api_view(['GET'])
def predict_path(request, satellite_id):
    """
    Get predictions for a satellite.
    """
    satellite = get_object_or_404(Satellite, pk=satellite_id)

    start_date = parse_date(request.GET['start_date'])
    end_date = parse_date(request.GET['end_date'])

    duration = (end_date - start_date).total_seconds()
    steps = 100  # TODO configurable? user configurable? where?
    step_seconds = duration / steps
    positions = satellite.predict_path(start_date, end_date, step_seconds)

    return Response({
        'satellite_id': satellite_id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'positions': list((current_date.isoformat(), position)
                          for current_date, position in positions),
    })


@api_view(['GET'])
def predict_passes(request, satellite_id):
    """
    Get next passes for a satellite over a certain location.
    """
    location_id = int(request.GET['location_id'])

    satellite = get_object_or_404(Satellite, pk=satellite_id)
    location = get_object_or_404(Location, pk=location_id)

    start_date = parse_date(request.GET['start_date'])
    end_date = parse_date(request.GET['end_date'])

    min_tca_elevation = request.GET.get('min_tca_elevation')
    if min_tca_elevation is not None:
        min_tca_elevation = float(min_tca_elevation)

    min_sun_elevation = request.GET.get('min_sun_elevation')
    if min_sun_elevation is not None:
        min_sun_elevation = float(min_sun_elevation)

    passes = satellite.predict_passes(location, start_date, end_date,
                                      min_tca_elevation=min_tca_elevation,
                                      min_sun_elevation=min_sun_elevation)
    passes_serialized = [{'aos': pass_.aos.isoformat(),
                          'los': pass_.los.isoformat(),
                          'tca': pass_.tca.isoformat(),
                          'tca_elevation': pass_.tca_elevation,
                          'sun_elevation': pass_.sun_elevation}
                         for pass_ in passes]

    return Response({
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'satellite_id': satellite_id,
        'location_id': location_id,
        'passes': passes_serialized,
    })
