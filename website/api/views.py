from rest_framework import viewsets

from website import models
from website.api import serializers


class SatelliteViewSet(viewsets.ModelViewSet):
    queryset = models.Satellite.objects.all()
    serializer_class = serializers.SatelliteSerializer


class LocationViewSet(viewsets.ModelViewSet):
    queryset = models.Location.objects.all()
    serializer_class = serializers.LocationSerializer
