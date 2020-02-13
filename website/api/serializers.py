import json

from rest_framework import serializers

from website.models import Dashboard, Satellite



class SatelliteSerializer(serializers.ModelSerializer):
    """
    Serializer for the satellite api.
    """
    class Meta:
        model = Satellite
        fields = ['id', 'name', 'norad_id', 'description', 'tle', 'tle_date']


class DashboardConfigField(serializers.Field):
    """
    Dashboard config can have information that is read from the database instead of the config,
    on get, but never stored.
    """
    def to_representation(self, value):
        # TODO handle errors?
        config = json.loads(value)

        # populate all fields of satellites that come form the server db
        for satellite_data in config['satellites']:
            if satellite_data['from_db']:
                satellite = Satellite.objects.get(pk=satellite_data['id'])
                serializer = SatelliteSerializer(satellite)
                satellite_data.update(serializer.data)

        return json.dumps(config)

    def to_internal_value(self, data):
        # TODO handle errors?
        config = json.loads(data)

        # remove all fields from satellites that come form the server db
        for satellite_data in config['satellites']:
            if satellite_data['from_db']:
                for key in list(satellite_data.keys()):
                    if key not in ('id', 'from_db'):
                        del satellite_data[key]

        return json.dumps(config)


class DashboardSerializer(serializers.ModelSerializer):
    """
    Serializer for the dashboard api.
    """
    config = DashboardConfigField()

    class Meta:
        model = Dashboard
        fields = ['id', 'name', 'owner', 'config']
