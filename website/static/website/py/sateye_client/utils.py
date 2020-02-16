from datetime import datetime

from browser import window

from sateye_client.iso8601 import parse_date


cesium = window.Cesium


def hex_to_cesium_color(hex_color, opacity=1.0):
    """
    Convert a hex html color, to a cesium Color instance.
    """
    red = int(hex_color[1:3], 16) / 255
    green = int(hex_color[3:5], 16) / 255
    blue = int(hex_color[5:7], 16) / 255

    return cesium.Color.new(red, green, blue, opacity)


def parse_api_date(api_date):
    """
    Parse a date string that came from an api response.
    """
    # TODO use iso8601.parse_date?
    if api_date.endswith("Z"):
        api_date = api_date.replace("Z", "+00:00")

    return datetime.fromisoformat(api_date)


def iso_to_cesium_date(date):
    """
    Convert an iso date string to a Cesium date instance.
    """
    return cesium.JulianDate.fromIso8601(date)


def cesium_date_to_datetime(cesium_date):
    """
    Convert a Cesium date instance into a python datetime instance.
    """
    return parse_date(cesium_date.toString())
