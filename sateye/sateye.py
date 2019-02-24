import json
import os
from pathlib import Path

from flask import Flask, render_template, request
from jinja2 import Markup

from sateye import storage
from sateye.core import Alert, api_response


app = Flask(__name__)
app.config.from_object(__name__)


def jinja_include_raw(template_name):
    """
    Function to easily include templates as raw, usually needed for the client side templates.
    """
    return Markup(app.jinja_loader.get_source(app.jinja_env, template_name)[0])


app.jinja_env.globals["include_raw"] = jinja_include_raw


@app.route("/")
def home():
    """
    Big ol' single page app.
    """
    return render_template("home.html")


@app.route("/api/user_data/", methods=["GET", "POST"])
def api_user_data():
    """
    Load or save the user data from/to disk.
    """
    if request.method == "POST":
        # on post, save the user data
        user_data = request.json
        storage.save_user_data(user_data)
    else:
        # on get, load the user data
        is_new, user_data = storage.load_user_data()

        if is_new:
            alerts = (
                Alert.INFO,
                "No data file found at {}, created a new one.".format(storage.USER_DATA_PATH),
            )
        else:
            alerts = None

    return api_response(
        ok=True,
        data=user_data,
        alerts=alerts,
    )
