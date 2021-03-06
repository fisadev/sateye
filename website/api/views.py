import json
from datetime import timedelta

import attr

from django.conf import settings
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets

from iso8601 import parse_date

from website import orbits
from website.api import serializers
from website.entities import Position
from website.models import (
    Dashboard,
    Satellite,
)


class SatelliteViewSet(viewsets.ModelViewSet):
    """
    Basic satellite api views.
    """
    serializer_class = serializers.SatelliteSerializer
    queryset = Satellite.objects.all().order_by('name')


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
            can_see = Q(owner=self.request.user) | Q(owner=None)
        else:
            can_see = Q(owner=None)

        return Dashboard.objects.filter(can_see).order_by('name')


def predict_path(request):
    """
    Get predictions for a satellite.
    """
    satellite_id = request.GET['satellite_id']
    tle = request.GET['tle']
    start_date = parse_date(request.GET['start_date'])
    end_date = parse_date(request.GET['end_date'])

    duration = (end_date - start_date).total_seconds()
    steps = 100  # TODO configurable? user configurable? where?
    step_seconds = duration / steps
    positions = orbits.predict_path(satellite_id, tle, start_date, end_date, step_seconds)

    return JsonResponse({
        'satellite_id': satellite_id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'positions': [attr.asdict(p) for p in positions],
    })


@csrf_exempt
def predict_passes(request):
    """
    Get next passes for a satellite over a certain location.
    """
    body = json.loads(request.body)

    # dict: satellite_id -> tle
    satellites_tles = body['satellites_tles']
    targets = [Position(**target_fields)
               for target_fields in body['targets']]

    start_date = parse_date(body['start_date'])
    end_date = parse_date(body['end_date'])

    min_tca_elevation = body.get('min_tca_elevation')
    min_sun_elevation = body.get('min_sun_elevation')

    passes = []

    for satellite_id, tle in satellites_tles.items():
        for target in targets:
            target_passes = orbits.predict_passes(satellite_id, tle, target, start_date, end_date,
                                                  min_tca_elevation=min_tca_elevation,
                                                  min_sun_elevation=min_sun_elevation)
            passes.extend(target_passes)

    return JsonResponse({
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'passes': [attr.asdict(p) for p in passes],
    })
