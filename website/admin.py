from django.contrib import admin

from website.models import Satellite, TLE, Location


@admin.register(Satellite)
class SatelliteAdmin(admin.ModelAdmin):
    """
    Customization for the Satellite model in the admin site.
    """
    list_display = ('name', 'owner')


@admin.register(TLE)
class TLEAdmin(admin.ModelAdmin):
    """
    Customization for the TLE model in the admin site.
    """
    list_display = ('satellite', 'at')
    list_filter = ('satellite', 'at')
    date_hierarchy = 'at'


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """
    Customizations for the Locations model in the admin site.
    """
    list_display = ('latitude', 'longitude', 'elevation', 'owner')
