"""
All code related to satellites.
"""
import attr


@attr.s
class Satellite:
    """
    A specific satellite.
    """
    id_ = attr.ib()
    name = attr.ib(default=None)
    tle = attr.ib(default=None)

    def predict_path(self, start, duration):
        """
        Predict it's path from a starting datetime, up to a specified number of seconds after.
        """
        # TODO
        return []

    @classmethod
    def get_by_id(cls, satellite_id):
        """
        Load a Satellite from its id.
        """
        # TODO
        return Satellite(
            id_=satellite_id,
        )
