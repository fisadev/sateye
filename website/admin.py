from django.contrib import admin

from website import models


@admin.register(models.Satellite)
class SatelliteAdmin(admin.ModelAdmin):
    """
    Customization for the Satellite model in the admin site.
    """
    list_display = ('name', 'norad_id', 'tle_date')


@admin.register(models.Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    """
    Customizations for the Dashboard model in the admin site.
    """
    list_display = ('name', 'owner')
