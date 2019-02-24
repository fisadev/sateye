"""
All user data related logic.
"""
import json
from pathlib import Path

USER_DATA_PATH = Path.home() / ".sateye_user_data.json"

DEFAULT_USER_DATA = {
    "foo": 42,
    "userDataVersion": 0.1
}


def save_user_data(user_data):
    """
    Save the user data to disk.
    """
    with USER_DATA_PATH.open("w") as user_data_file:
        json.dump(user_data, user_data_file)


def load_user_data():
    """
    Load the stored user data from disk, or if it doesn't exist, return the default one.
    Returns a tuple with the following structure:
        is_new (bool), user_data
    """
    is_new = not USER_DATA_PATH.exists()
    if is_new:
        save_user_data(DEFAULT_USER_DATA)

    with USER_DATA_PATH.open() as user_data_file:
        user_data = json.load(user_data_file)

    return is_new, user_data
