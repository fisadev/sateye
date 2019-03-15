from django.contrib import admin

from website import models


@admin.register(models.Satellite)
class SatelliteAdmin(admin.ModelAdmin):
    """
    Customization for the Satellite model in the admin site.
    """
    list_display = ('name', 'norad_id', 'owner')


@admin.register(models.TLE)
class TLEAdmin(admin.ModelAdmin):
    """
    Customization for the TLE model in the admin site.
    """
    list_display = ('satellite', 'at')
    list_filter = ('satellite', 'at')
    date_hierarchy = 'at'


@admin.register(models.Location)
class LocationAdmin(admin.ModelAdmin):
    """
    Customizations for the Locations model in the admin site.
    """
    list_display = ('name', 'owner', 'latitude', 'longitude', 'elevation')


@admin.register(models.Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    """
    Customizations for the Dashboard model in the admin site.
    """
    list_display = ('name', 'owner')


@admin.register(models.DashboardSatelliteConfig)
class DashboardSatelliteConfigAdmin(admin.ModelAdmin):
    """
    Customizations for the DashboardSatelliteConfigAdmin model in the admin site.
    """
    list_display = ('dashboard', 'satellite')


@admin.register(models.DashboardLocationConfig)
class DashboardLocationConfigAdmin(admin.ModelAdmin):
    """
    Customizations for the DashboardLocationConfigAdmin model in the admin site.
    """
    list_display = ('dashboard', 'location')
