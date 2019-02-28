from django.conf import settings
from django.db import models


class Satellite(models.Model):
    """
    A specific satellite in orbit, that Sateye can display and track.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,
                              blank=True, related_name='satellites')

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
