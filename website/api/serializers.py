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
    public = serializers.SerializerMethodField()

    def get_public(self, obj):
        """
        Inform which satellites are public and which are private.
        """
        return obj.owner is None

    class Meta:
        model = models.Satellite
        fields = ['id', 'name', 'norad_id', 'description', 'newest_tle', 'public']


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for the location api.
    """
    class Meta:
        model = models.Location
        fields = ['id', 'name', 'description', 'latitude', 'longitude', 'elevation']


class DashboardSatelliteConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for the satellite configs in the dashboard api.
    """
    satellite = SatelliteSerializer(read_only=True)
    satellite_id = serializers.IntegerField(write_only=True)
    dashboard_id = serializers.IntegerField()

    class Meta:
        model = models.DashboardSatelliteConfig
        fields = [
            'dashboard_id',
            'satellite',
            'satellite_id',
            'point_size',
            'point_color',
            'path_width',
            'path_color',
            'path_seconds_ahead',
            'path_seconds_behind',
        ]


class DashboardLocationConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for the location configs in the dashboard api.
    """
    location = LocationSerializer(read_only=True)
    location_id = serializers.IntegerField(write_only=True)
    dashboard_id = serializers.IntegerField()

    class Meta:
        model = models.DashboardLocationConfig
        fields = [
            'dashboard_id',
            'location',
            'location_id',
            'point_size',
            'point_color',
        ]


class DashboardSerializer(serializers.ModelSerializer):
    """
    Serializer for the dashboard api.
    """
    class Meta:
        model = models.Satellite
        fields = ['id', 'name']
