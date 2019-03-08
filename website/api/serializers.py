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
    tles = TLESerializer(many=True)

    class Meta:
        model = models.Satellite
        fields = ['owner', 'name', 'description', 'tles']
        extra_kwargs = {
            'owner': {'write_only': True},
        }


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for the location api.
    """
    class Meta:
        model = models.Location
        fields = ['owner', 'name', 'latitude', 'longitude', 'elevation']
        extra_kwargs = {
            'owner': {'write_only': True},
        }
