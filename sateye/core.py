from enum import Enum

from flask import jsonify


class Alert(Enum):
    """
    Types of alerts we display to users.
    """
    INFO = "info"
    ERROR = "error"
    WARNING = "warning"


def api_response(ok=True, payload=None, alerts=None):
    """
    Build a json api result in the format expected by the client side.
    """
    alerts = alerts or []

    # shortcut to be able to call api_response with just one alert
    if alerts and isinstance(alerts[0], Alert):
        alerts = [alerts]

    return jsonify({
        "ok": ok,
        "payload": payload,
        "alerts": [{"type": alert_type.value, "message": alert_message}
                   for alert_type, alert_message in alerts]
    })
