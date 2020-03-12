from django.conf import settings
from django.db import models


class Satellite(models.Model):
    """
    A publicly known satellite in orbit, that Sateye can display and track.
    """
    name = models.CharField(max_length=100)
    norad_id = models.IntegerField(null=True, blank=True, db_index=True, unique=True)
    description = models.TextField(null=True, blank=True)
    tle = models.CharField(max_length=200)
    tle_date = models.DateTimeField(null=True)

    def __str__(self):
        return self.name


class Dashboard(models.Model):
    """
    A customization of satellites to display, and how to display them.
    """
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='dashboards', null=True, blank=True)
    config = models.TextField()

    def __str__(self):
        return self.name
