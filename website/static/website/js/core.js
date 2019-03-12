var Alert = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
}

var sateye = {
    templates: {},
    dom: {},

    initialize: function() {
        // initialize the whole client side app
        sateye.templates.alert = Handlebars.compile(document.getElementById("alert-template").innerHTML);
        sateye.templates.satellite = Handlebars.compile(document.getElementById("satellite-template").innerHTML);

        sateye.dom.alertsBar = $("#alerts-bar");
        sateye.dom.satelliteList = $("#satellite-list");

        sateye.map.initialize();
        sateye.satellites.initialize();
        sateye.locations.initialize();
        sateye.dashboards.initialize();
    },

    showAlert: function(alertType, message) {
        // show an alert for the user to see
        var newAlertContent = sateye.templates.alert({
            alertType: alertType,
            message: message,
        });
        sateye.dom.alertsBar.append(newAlertContent);
    },

    showAlertsFromApiResponse: function(data) {
        // extract alerts that came in an api response
        for (alert in data.alerts) {
            sateye.showAlert(alert.type, alert.message);
        }
    },

    // date utilities

    addSeconds: function(date, seconds) {
        // add seconds to a julian date from cesium
        var newDate = new Cesium.JulianDate;
        Cesium.JulianDate.addSeconds(date, seconds, newDate);
        return newDate;
    },

    parseDate: function(iso8601string) {
        // parse an iso formatted date into a cesium julian date
        return Cesium.JulianDate.fromIso8601(iso8601string);
    },
}
