var sateye = function() {
    var self = {};
    self.templates = {};
    self.dom = {};
    self.Alert = {
        INFO: "info",
        WARNING: "warning",
        ERROR: "error"
    };

    self.initialize = function() {
        // compile templates
        var templatesMap = {
            alert: "#alert-template",
            satellite: "#satellite-template",
            passesList: "#passes-list-template",
        };

        for (name in templatesMap) {
            self.templates[name] = Handlebars.compile($(templatesMap[name]).html());
        }

        // references to the dom
        self.dom.alertsBar = $("#alerts-bar");

        // initialize submodules
        self.map.initialize();
        self.satellites.initialize();
        self.locations.initialize();
        self.passes.initialize();
        self.dashboards.initialize();
    }

    self.showAlert = function(alertType, message) {
        // show an alert for the user to see
        var newAlertContent = self.templates.alert({
            alertType: alertType,
            message: message,
        });
        self.dom.alertsBar.append(newAlertContent);
    }

    self.showAlertsFromApiResponse = function(data) {
        // extract alerts that came in an api response
        for (alert in data.alerts) {
            self.showAlert(alert.type, alert.message);
        }
    }

    self.hexToCesiumColor = function(hexColor) {
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
    }

    // date utilities

    self.addSeconds = function(date, seconds) {
        // add seconds to a julian date from cesium
        var newDate = new Cesium.JulianDate;
        Cesium.JulianDate.addSeconds(date, seconds, newDate);
        return newDate;
    }

    self.parseDate = function(iso8601string) {
        // parse an iso formatted date into a cesium julian date
        return Cesium.JulianDate.fromIso8601(iso8601string);
    }

    return self;
}();
