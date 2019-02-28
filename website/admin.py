from django.contrib import admin

from website.models import Satellite, TLE


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


admin.site.register(Satellite, SatelliteAdmin)
admin.site.register(TLE, TLEAdmin)
