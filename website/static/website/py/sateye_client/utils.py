import math
from datetime import datetime

from browser import window


cesium = window.Cesium


EARTH_RADIUS = 6371000  # m
EARTH_CIRCUNFERENCE = 40075000  # m


def hex_to_cesium_color(hex_color, opacity=1.0):
    """
    Convert a hex html color, to a cesium Color instance.
    """
    red = int(hex_color[1:3], 16) / 255
    green = int(hex_color[3:5], 16) / 255
    blue = int(hex_color[5:7], 16) / 255

    return cesium.Color.new(red, green, blue, opacity)


def parse_iso8601_date(date_string):
    """
    Parse iso8601 formatted dates.
    """
    date_string = date_string.replace("Z", "+00:00")
    if len(date_string) > 25:
        # we assume it's something like this:
        # '2020-02-18T05:18:56.3744249997253064+00:00'
        # in that case, we remove the decimals from the seconds
        first_part = date_string.split(".")[0]
        second_part = date_string.split("+")[1]
        date_string = first_part + "+" + second_part
    return datetime.fromisoformat(date_string)


def iso_to_cesium_date(date):
    """
    Convert an iso date string to a Cesium date instance.
    """
    return cesium.JulianDate.fromIso8601(date)


def cesium_date_to_datetime(cesium_date):
    """
    Convert a Cesium date instance into a python datetime instance.
    """
    return parse_iso8601_date(cesium_date.toString())


def calculate_visible_radius(altitude):
    """
    Calculate the radius of the visible area for a satellite at a given altitude.
    """
    # angle between a line going from the center of the Earth to the satellite, and another
    # line going from the center of the earth to the horizon line of the satellite
    visible_angle = math.degrees(
        math.acos(EARTH_RADIUS / (EARTH_RADIUS + altitude))
    )
    # distance over the surface of the earth, from the satellite coordinates, to its
    # horizon
    return (visible_angle / 360) * EARTH_CIRCUNFERENCE
