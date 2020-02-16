import json

from browser import ajax, window


jq = window.jQuery


class SatellitesUI:
    """
    All the logic that handles the satellites related part of the UI of Sateye.
    """
    def __init__(self, app):
        self.app = app

        # client side templates
        self.satellite_template = jq("#satellite-template")

        # references to the dom
        self.satellites_list = jq("#satellites-list")
        self.satellites_modal = jq("#satellites-modal")
        self.existing_satellites_form = jq("#existing-satellites-form")
        self.existing_satellites_list = jq("#existing-satellites-list")
        self.filter_satellites_input = jq("#filter-satellites-input")
        self.create_satellite_form = jq("#create-satellite-form")

        # assign event handlers
        self.satellites_modal.on("show.bs.modal", self.on_satellites_modal_shown)
        self.existing_satellites_form.on("show.bs.collapse",
                                         self.on_existing_satellites_form_shown)
        self.create_satellite_form.on("show.bs.collapse", self.on_create_satellite_form_shown)
        self.filter_satellites_input.on("keyup", self.on_filter_existing_satellites)

    def on_satellites_modal_shown(self, e):
        """
        When the satellites modal is shown, reset its state.
        """
        self.existing_satellites_form.collapse("hide")
        self.create_satellite_form.collapse("hide")

        self.refresh_satellites_list()

    def on_existing_satellites_form_shown(self, e):
        """
        When the existing satellites form is shown, populate the satellites list.
        """
        # hide the creation form
        self.create_satellite_form.collapse("hide")

        # the user must know the list is loading
        self.existing_satellites_list.html("")
        self.existing_satellites_list.append("<p>Loading...</p>")

        # request the list of satellites
        ajax.get("/api/satellites/", oncomplete=self.on_server_satellites_received)

    def on_create_satellite_form_shown(self, e):
        """
        When the create satellite form is shown hide the existing satellites form.
        """
        self.existing_satellites_form.collapse("hide")
        print("WARNING: creation of satellites not yet implemented")

    def on_server_satellites_received(self, req):
        """
        List of satellites received, populate the existing satellites list.
        """
        self.existing_satellites_list.html("")
        received_satellites = json.loads(req.text)

        for server_satellite in received_satellites:
            # only add satellites not present in the dashboard
            if server_satellite["id"] not in self.app.dashboard.satellites:
                name = server_satellite["name"]
                norad_id = server_satellite.get("norad_id")
                if norad_id:
                    name += " ({})".format(norad_id)

                # build a new li element and add it to the list
                element_html = '<li class="list-group-item list-group-item-action">{}</li>'.format(
                    name,
                )
                satellite_element = jq(element_html)
                satellite_element.data("satellite_id", server_satellite["id"])
                self.existing_satellites_list.append(satellite_element)

                # and add the click handler, so the satellite is added
                satellite_element.on("click", self.on_existing_satellite_click)

    def on_existing_satellite_click(self, e):
        """
        The user clicked an existing satellite to add it to the dashboard.
        """
        clicked_item = e.target
        satellite_id = clicked_item.data("satellite_id")

        print("Clicked satellite with id:", satellite_id)
        print("WARNING: existing satellite adding not implemented")

        clicked_item.remove()

    def on_filter_existing_satellites(self, e):
        """
        Filter the existing satellites list, in the add existing satellite form.
        """
        filter_text = self.filter_satellites_input.val().lower()

        for child in self.existing_satellites_list.children("li"):
            show = filter_text in child.text().lower()
            child.toggle(show)

    def refresh_satellites_list(self):
        """
        Update the list in the abm.
        """
        # remove old list
        self.satellites_list.html("")

        if self.app.dashboard is not None:
            # add satellites to list
            for satellite_id, satellite in self.app.dashboard.satellites.items():
                # TODO "render" template using satellite
                element = self.satellite_template.html().replace("", "")
                self.satellites_list.append(element)
