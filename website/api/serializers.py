from rest_framework import serializers

from website import models


class TLESerializer(serializers.ModelSerializer):
    """
    Serializer for TLE instances in the api.
    """
    class Meta:
        model = models.TLE
        fields = ['at', 'lines']


class SatelliteSerializer(serializers.ModelSerializer):
    """
    Serializer for the satellite api.
    """
    newest_tle = TLESerializer()

    class Meta:
        model = models.Satellite
        fields = ['id', 'name', 'norad_id', 'description', 'newest_tle']


class DashboardSatelliteConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for the satellite configs in the dashboard api.
    """
    satellite = SatelliteSerializer()

    class Meta:
        model = models.DashboardSatelliteConfig
        fields = ['satellite', ]


class DashboardSerializer(serializers.ModelSerializer):
    """
    Serializer for the dashboard api.
    """
    satellite_configs = DashboardSatelliteConfigSerializer(many=True)

    class Meta:
        model = models.Satellite
        fields = ['name', 'satellite_configs', ]


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for the location api.
    """
    class Meta:
        model = models.Location
        fields = ['name', 'latitude', 'longitude', 'elevation']
