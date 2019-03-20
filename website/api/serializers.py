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
    satellite = SatelliteSerializer()

    class Meta:
        model = models.DashboardSatelliteConfig
        fields = [
            'satellite',
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
    location = LocationSerializer()

    class Meta:
        model = models.DashboardLocationConfig
        fields = [
            'location',
            'point_size',
            'point_color',
        ]


class DashboardSerializer(serializers.ModelSerializer):
    """
    Serializer for the dashboard api.
    """
    satellite_configs = DashboardSatelliteConfigSerializer(many=True)
    location_configs = DashboardLocationConfigSerializer(many=True)

    class Meta:
        model = models.Satellite
        fields = ['id', 'name', 'satellite_configs', 'location_configs']


class PassSerializer(serializers.Serializer):
    """
    Serializer for the pass prediction endpoint.
    """
    max_elevation_degrees = serializers.DecimalField(
        max_digits=5, decimal_places=2, source='max_elevation_deg'
    )
    max_elevation_date = serializers.DateTimeField()
    aos = serializers.DateTimeField()
    los = serializers.DateTimeField()
