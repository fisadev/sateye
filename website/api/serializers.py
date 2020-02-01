from rest_framework import serializers

from website import models


class SatelliteSerializer(serializers.ModelSerializer):
    """
    Serializer for the satellite api.
    """
    class Meta:
        model = models.Satellite
        fields = ['id', 'name', 'norad_id', 'description', 'tle', 'tle_date']


class DashboardSerializer(serializers.ModelSerializer):
    """
    Serializer for the dashboard api.
    """
    class Meta:
        model = models.Dashboard
        fields = ['id', 'name', 'owner', 'config']
