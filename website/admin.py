from django import forms
from django.contrib import admin

from website import models


@admin.register(models.Satellite)
class SatelliteAdmin(admin.ModelAdmin):
    """
    Customization for the Satellite model in the admin site.
    """
    list_display = ('name', 'norad_id', 'tle_date')

    def formfield_for_dbfield(self, db_field, **kwargs):
        formfield = super(SatelliteAdmin, self).formfield_for_dbfield(db_field, **kwargs)
        if db_field.name == 'tle':
            formfield.widget = forms.Textarea(attrs=formfield.widget.attrs)
            formfield.widget.attrs['class'] = 'vLargeTextField'

        return formfield


@admin.register(models.Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    """
    Customizations for the Dashboard model in the admin site.
    """
    list_display = ('name', 'owner')
