sateye.satellites = function() {
    var self = {};
    self.dom = {};
    self.defaultSatelliteConfig = {
        pointSize: 10,
        pointColor: "FFFF00",
        pathWidth: 2,
        pathColor: "00FF00",
        pathSecondsAhead: 60 * 45,
        pathSecondsBehind: 60 * 10,
    };

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

        var data = {
            dashboard_id: dashboardId,
            satellite_id: satelliteId,
            point_size: self.defaultSatelliteConfig.pointSize,
            point_color: self.defaultSatelliteConfig.pointColor,
            path_width: self.defaultSatelliteConfig.pathWidth,
            path_color: self.defaultSatelliteConfig.pathColor,
            path_seconds_ahead: self.defaultSatelliteConfig.pathSecondsAhead,
            path_seconds_behind: self.defaultSatelliteConfig.pathSecondsBehind
        };

        $.ajax({
            method: "POST",
            url: "/api/dashboards/" + dashboardId + "/satellite_configs/",
            data: data,
        })
        .done(self.onSatelliteAddedToDashboard)
        .fail(self.onSatelliteToDashboardFailed);
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
        // create a new satellite instance, parsing the json received from an api

        var tleDate = dashboardSatelliteConfig.tle_date;
        if (tleDate) {
            tleDate = sateye.parseDate(tleDate);
        }

        var valueOrDefault = function(fieldName) {
            // create a function that is able to get the specified field, 
            // or return the default from the module defaults if value is 
            // null or undefined
            var getter = function() {
                var currentValue = this[fieldName];
                if (currentValue == null || currentValue === undefined) {
                    currentValue = self.defaultSatelliteConfig[fieldName];
                }
                return currentValue;
            }

            return getter;
        }

        return satellite = {
            // general satellite data
            id: dashboardSatelliteConfig.id,
            name: dashboardSatelliteConfig.name,
            description: dashboardSatelliteConfig.description,
            noradId: dashboardSatelliteConfig.norad_id,
            tle: dashboardSatelliteConfig.tle,
            tleDate: tleDate,
            pathPrediction: null,

            // config of the point
            pointSize: dashboardSatelliteConfig.point_size,
            pointColor: dashboardSatelliteConfig.point_color,

            pointSizeOrDefault: valueOrDefault('pointSize'),
            pointColorOrDefault: valueOrDefault('pointColor'),

            // config of the path
            pathWidth: dashboardSatelliteConfig.path_width,
            pathColor: dashboardSatelliteConfig.path_color,
            pathSecondsAhead: dashboardSatelliteConfig.path_seconds_ahead,
            pathSecondsBehind: dashboardSatelliteConfig.path_seconds_behind,

            pathWidthOrDefault: valueOrDefault('pathWidth'),
            pathColorOrDefault: valueOrDefault('pathColor'),
            pathSecondsAheadOrDefault: valueOrDefault('pathSecondsAhead'),
            pathSecondsBehindOrDefault: valueOrDefault('pathSecondsBehind'),

            predictionsCover: function(startDate, endDate) {
                // check that the satellite has predictions covering a specific range of time
                // (usually asking from the current map date, plus X map seconds)
                if (this.pathPrediction === null) {
                    return false;
                } else {
                    var predictionsStartBefore = Cesium.JulianDate.lessThanOrEquals(this.pathPrediction.startDate, startDate);
                    var predictionsEndAfter = Cesium.JulianDate.greaterThanOrEquals(this.pathPrediction.endDate, endDate);

                    return (predictionsStartBefore && predictionsEndAfter);
                }
            },

            getPathPredictions: function(startDate, endDate, timeout) {
                // get path predictions, to fill X seconds starting at a given date
                // (usually asking from the current map date, plus X map seconds)
                console.log("Requesting predictions for satellite " + this.name);
                var satellite = this;
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
            },

            onPredictionsReceived: function(data) {
                // when we receive the response with the requested predictions
                console.log("Predictions received for satellite " + this.name);

                // store the new received path predictions
                this.pathPrediction = {
                    startDate: sateye.parseDate(data.start_date),
                    endDate: sateye.parseDate(data.end_date),
                    positions: data.positions
                }

                sateye.map.onNewPathPrediction(this);
            },

            onPredictionsError: function(data) {
                // when the requested predictions fail
                console.log("Error getting predictions for satellite " + this.name);
                console.log(data);
            },
        };
    }

    return self;
}();
