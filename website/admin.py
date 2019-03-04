from django.contrib import admin

from website.models import Satellite, TLE, Location



class SatelliteAdmin(admin.ModelAdmin):
    """
    Customization for the Satellite model in the admin site.
    """
    list_display = 'name', 'owner'


class TLEAdmin(admin.ModelAdmin):
    """
    Customization for the TLE model in the admin site.
    """
    list_display = 'satellite', 'at'
    list_filter = 'satellite', 'at'
    date_hierarchy = 'at'


class LocationAdmin(admin.ModelAdmin):
    """
        Customizations for the Locations model in the admin site.
    """
    list_display = 'lat','lon','alt', 'owner'


admin.site.register(Satellite, SatelliteAdmin)
admin.site.register(TLE, TLEAdmin)
admin.site.register(Location, LocationAdmin)
