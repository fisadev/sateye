sateye.satellites = function() {
    var self = {};
    self.dom = {};

    self.initialize = function() {
        // references to the dom
        self.dom.satellitesList = $("#satellites-list");
        self.dom.satellitesModal = $("#satellites-modal");
        self.dom.existingSatellitesForm = $("#existing-satellites-form");
        self.dom.existingSatellitesList = $("#existing-satellites-list");
        self.dom.filterSatellitesInput = $("#filter-satellites-input");
        self.dom.createSatelliteForm = $("#create-satellite-form");

        // assign event handlers
        self.dom.satellitesModal.on("show.bs.modal", self.onSatellitesModalShown);
        self.dom.existingSatellitesForm.on("show.bs.collapse", self.onExistingSatellitesFormShown);
        self.dom.createSatelliteForm.on("show.bs.collapse", self.onCreateSatelliteFormShown);
        self.dom.filterSatellitesInput.on("keyup", self.onFilterExistingSatellites);

        self.refreshSatellitesList();
    }

    self.onSatellitesModalShown = function(e) {
        self.refreshSatellitesList();
        self.dom.existingSatellitesForm.collapse("hide");
        self.dom.createSatelliteForm.collapse("hide");
    }

    self.onExistingSatellitesFormShown = function(e) {
        // when the existing satellites form is shown, populate the satellites list

        // hide the creation form
        self.dom.createSatelliteForm.collapse("hide");

        // the user must know the list is loading
        self.dom.existingSatellitesList.html("");
        self.dom.existingSatellitesList.append("<p>Loading...</p>");

        // request the list
        return $.ajax({
            url: "/api/satellites/",
            cache: false,
        }).done(self.onSatellitesReceived);
    }

    self.onCreateSatelliteFormShown = function(e) {
        // when the create satellite form is shown hide the existing satellites form
        self.dom.existingSatellitesForm.collapse("hide");
    }

    self.onSatellitesReceived = function(data) {
        // list of satellites received, populate the existing satellites list
        self.dom.existingSatellitesList.html("");
        var satelliteElement, satelliteDescription;
        for (let satellite of data) {
            // only add satellites not present in the dashboard
            if (sateye.dashboards.current.satellites[satellite.id] === undefined) {
                satelliteDescription = satellite.name;
                if (satellite.norad_id != null || satellite.norad_id != "") {
                    satelliteDescription += " (" + satellite.norad_id + ")";
                }
                satelliteElement = $('<li class="list-group-item list-group-item-action">' + satelliteDescription + '</li>');
                satelliteElement.data("satelliteId", satellite.id)
                self.dom.existingSatellitesList.append(satelliteElement);

                // and add the click handler, so the satellite is added
                satelliteElement.on("click", self.onExistingSatelliteClick);
            }
        }
    }

    self.onExistingSatelliteClick = function(e) {
        // the user clicked an existing satellite to add it to the dashboard
        var clickedItem = $(this);
        var satelliteId = clickedItem.data("satelliteId");
        var dashboardId = sateye.dashboards.current.id;

        console.log("WARNING: existing satellite adding not implemented");
    }

    self.onSatelliteAddedToDashboard = function(data) {
        sateye.dashboards.current.loadSatelliteConfigs();
        var listItem = self.dom.existingSatellitesList.children("[data-satelliteId=" + data.satellite.id.toString() + "]");
        clickedItem.remove();
    }

    self.onSatelliteToDashboardFailed = function(data) {
        console.log("Failed to post new satellite config");
    }

    self.onFilterExistingSatellites = function(e) {
        // filter the existing satellites list, in the add existing satellite form
        var filterText = self.dom.filterSatellitesInput.val().toLowerCase();

        self.dom.existingSatellitesList.children("li").filter(function() {
            var item = $(this)
            var containsFilterText = item.text().toLowerCase().indexOf(filterText) > -1
            item.toggle(containsFilterText);
        });
    }

    self.refreshSatellitesList = function() {
        // update the list in the abm

        // remove old list
        self.dom.satellitesList.html("");

        if (sateye.dashboards.current != null) {
            // add satellites to list
            for (let satellite of Object.values(sateye.dashboards.current.satellites)) {
                var element = sateye.templates.satellite(satellite);
                self.dom.satellitesList.append(element);
            }
        }
    }

    self.createSatellite = function(dashboardSatelliteConfig) {
        // create a new satellite instance, optionally parsing the data received from a dashboard config
        var satellite = {
            // general satellite data
            id: sateye.uuidv4(),
            name: 'New satellite',
            description: 'New satellite',
            noradId: null,
            tle: null,
            tle_date: null,

            // visual configurations
            style: {
                point_size: 10,
                point_color: "FFFF00",
                path_width: 2,
                path_color: "00FF00",
                path_seconds_ahead: 60 * 45,
                path_seconds_behind: 60 * 10,
            },

            // work data, not to be serialized
            work_data: {
                path_prediction: null,
            },
        };

        // if specified, update the basic satellite with the data from the dashboard config
        if (dashboardSatelliteConfig) {
            satellite = Object.assign(satellite, dashboardSatelliteConfig);

            if (satellite.tle_date) {
                satellite.tle_date = sateye.parseDate(satellite.tle_date);
            }
        }

        satellite.predictionsCover = function(startDate, endDate) {
            // check that the satellite has predictions covering a specific range of time
            // (usually asking from the current map date, plus X map seconds)
            if (satellite.work_data.path_prediction === null) {
                return false;
            } else {
                var predictionsStartBefore = Cesium.JulianDate.lessThanOrEquals(satellite.work_data.path_prediction.start_date, startDate);
                var predictionsEndAfter = Cesium.JulianDate.greaterThanOrEquals(satellite.work_data.path_prediction.end_date, endDate);

                return (predictionsStartBefore && predictionsEndAfter);
            }
        }

        satellite.getPathPredictions = function(startDate, endDate, timeout) {
            // get path predictions, to fill X seconds starting at a given date
            // (usually asking from the current map date, plus X map seconds)
            if (satellite.tle) {
                console.log("Requesting predictions for satellite " + satellite.name);
                $.ajax({
                    url: "/api/predict_path/",
                    method: "POST",
                    cache: false,
                    timeout: timeout,
                    data: JSON.stringify({
                        satellite_id: satellite.id,
                        tle: satellite.tle,
                        start_date: startDate.toString(),
                        end_date: endDate.toString(),
                    })
                })
                // we must define these as function(...) so "this" inside them is the satellite
                .done(function(data) {satellite.onPredictionsReceived(data)})
                .fail(function(data) {satellite.onPredictionsError(data)});
            } else {
                console.log(
                    "Can't request predictions for satellite " + satellite.name +
                    "because it has no TLE" 
                );
            }
        }

        satellite.onPredictionsReceived = function(data) {
            // when we receive the response with the requested predictions
            console.log("Predictions received for satellite " + this.name);

            // store the new received path predictions
            satellite.work_data.path_prediction = {
                start_date: sateye.parseDate(data.start_date),
                end_date: sateye.parseDate(data.end_date),
                positions: data.positions
            }

            sateye.map.onNewPathPrediction(this);
        }

        satellite.onPredictionsError = function(data) {
            // when the requested predictions fail
            console.log("Error getting predictions for satellite " + this.name);
            console.log(data);
        }

        satellite.serialize = function() {
            // create a serializable representation, to store in the server saved dashboard config
            console.log("WARNING: satellite serialization not implemented");
            return {};
        }

        return satellite;
    }

    return self;
}();
