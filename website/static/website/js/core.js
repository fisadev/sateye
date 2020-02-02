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
        // register useful function to be able to use them from templates
        Handlebars.registerHelper("dateAsHuman", sateye.dateAsHuman);
        Handlebars.registerHelper("numberAsHuman", sateye.numberAsHuman);

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
        for (let alert of data.alerts) {
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

    self.dateAsHuman = function(date) {
        // format date as human readable 
        return date.toString().substr(0, 19).replace("T", " ") + " utc";
    }

    self.numberAsHuman = function(number) {
        // format number as human readable 
        return number.toFixed(2);
    }

    self.uuidv4 = function() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    return self;
}();
