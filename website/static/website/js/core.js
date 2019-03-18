var Alert = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
}

var templatesMap = {
    alert: "#alert-template",
    satellite: "#satellite-template",
    passList: "#pass-list-template",
};

var sateye = {
    templates: {},
    dom: {},

    initialize: function() {
        // compile templates
        for (name in templatesMap) {
            sateye.templates[name] = Handlebars.compile($(templatesMap[name]).html());
        }

        // references to the dom
        sateye.dom.alertsBar = $("#alerts-bar");
        sateye.dom.passList = $("#pass-list");

        // initialize submodules
        sateye.map.initialize();
        sateye.satellites.initialize();
        sateye.locations.initialize();
        sateye.passes.initialize();
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

    hexToCesiumColor: function(hexColor) {
        // convert a hex html color, to a cesium Color instance
        var redHex = hexColor.substring(1, 3);
        var greenHex = hexColor.substring(3, 5);
        var blueHex = hexColor.substring(5, 7);

        return new Cesium.Color(
            parseInt(redHex, 16) / 255.0,
            parseInt(greenHex, 16) / 255.0,
            parseInt(blueHex, 16) / 255.0,
            1.0,  // opacity
        );
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
