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
    newest_tle = serializers.SerializerMethodField()

    def get_newest_tle(self, obj):
        """
        Get the newest tle of the satellite.
        """
        if obj.tles.exists():
            tle = obj.tles.order_by('at').last()
            serializer = TLESerializer(tle)
            tle_data = serializer.data
        else:
            tle_data = None

        return tle_data

    class Meta:
        model = models.Satellite
        fields = ['id', 'name', 'norad_id', 'description', 'newest_tle']


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for the location api.
    """
    class Meta:
        model = models.Location
        fields = ['name', 'latitude', 'longitude', 'elevation']
