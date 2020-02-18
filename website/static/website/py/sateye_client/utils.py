from datetime import datetime

from browser import window


cesium = window.Cesium


def hex_to_cesium_color(hex_color, opacity=1.0):
    """
    Convert a hex html color, to a cesium Color instance.
    """
    red = int(hex_color[1:3], 16) / 255
    green = int(hex_color[3:5], 16) / 255
    blue = int(hex_color[5:7], 16) / 255

    return cesium.Color.new(red, green, blue, opacity)


def iso_to_cesium_date(date):
    """
    Convert an iso date string to a Cesium date instance.
    """
    return cesium.JulianDate.fromIso8601(date)


def cesium_date_to_datetime(cesium_date):
    """
    Convert a Cesium date instance into a python datetime instance.
    """
    return datetime.fromisoformat(cesium_date.toString())
