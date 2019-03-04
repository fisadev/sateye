from django.conf import settings
from django.db import models

from website.utils import get_predictor_from_tle_lines


class Satellite(models.Model):
    """
    A specific satellite in orbit, that Sateye can display and track.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,
                              blank=True, related_name='satellites')

    def get_predictor(self, for_date=None):
        """
        Build an orbit predictor for the satellite, using its known TLEs.
        """
        assert self.tles.exists()
        if for_date:
            # TODO find the best TLE
            raise NotImplementedError()
        else:
            best_tle = self.tles.order_by('at').last()

        return get_predictor_from_tle_lines(best_tle.lines.split('\n'))

    def __str__(self):
        return 'Satellite: {}'.format(self.name)


class TLE(models.Model):
    """
    Orbital information from a specific satellite at a specific moment in time.
    """
    satellite = models.ForeignKey(Satellite, on_delete=models.CASCADE, related_name='tles')
    at = models.DateTimeField()
    lines = models.TextField()  # the actual two line element

    def __str__(self):
        return 'TLE at {}'.format(self.at)


class Location(models.Model):
    """
    Location information from a specific satellite at a specific place
    """
    user = models.CharField(max_length=50, blank=True, null=True)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    alt = models.FloatField(null=True, blank=True)

    def __str__(self):
        return 'Location: {}'.format(self.user)
