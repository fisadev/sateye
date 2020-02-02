sateye.map = function() {
    var self = {};
    self.viewer = null;
    self.cesiumConfig = {
        homeButton: false,
        navigationInstructionsInitiallyVisible: false,
        sceneMode: Cesium.SceneMode.SCENE2D,
        fullscreenButton: false,
        shouldAnimate: true,
    }
    self.dom = {};

    // chunking configs. More info at docs/prediction_chunks.rst
    // how often do we check if we need to refresh predictions?
    self._predictionsRefreshRealSeconds = 3;
    // how many real seconds do we want to get on each prediction?
    self._predictionsChunkRealSeconds = 30 * 60;
    // how many real seconds before we run out of predictions should fire a new request for predictions?
    self._predictionsTooLowThresholdRealSeconds = 15 * 60;

    self.initialize = function() {
        // initialize the map module
        self.configureCesiumMap();

        // references to the dom
        self.dom.nightShadowInput = $("#night-shadow-input");
        self.dom.mapDatePicker = $("#map-date-picker");
        self.dom.goToDateButton = $("#go-to-date");

        // assign event handlers
        self.dom.goToDateButton.on("click", self.onGoToDateClick);
        self.dom.nightShadowInput.on("change", self.onNightShadowChange);
        self.onNightShadowChange();

        // let us know when the dashboard or its data changes
        sateye.dashboards.onDashboardChangedCallbacks.push(self.onDashboardChanged)
    }

    self.configureCesiumMap = function() {
        // configure the cesium map
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMmUxZTgyMy0xYTE1LTQzOGUtOTZjMS1jYjczMzU0ZWI5ZWMiLCJpZCI6OTYyNCwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU1NDUwMjE2N30.iukQuH2ydaMGoXvmeX7_Q9H7ARwaqPt-qSTGcubjhIQ';

        self.viewer = new Cesium.Viewer("main-map", self.cesiumConfig);

        // center on 0,0 with enough distance to see the whole planet
        var center = Cesium.Cartesian3.fromDegrees(0, 0);
        self.viewer.camera.setView({destination: center});

        // every some time, ensure we have paths for each satellite
        //self.viewer.clock.onTick.addEventListener(self.onMapTick);
        setInterval(self.ensurePathPredictions, (self._predictionsRefreshRealSeconds - 1) * 1000);

        // remove fog and ground atmosphere on 3d globe
        self.viewer.scene.fog.enabled = false;
        self.viewer.scene.globe.showGroundAtmosphere = false;
    }

    self.onMapTick = function(clock) {
        // time has passed in the map
    }

    self.onGoToDateClick = function(clock) {
        // go to the selected date
		self.viewer.clock.currentTime = sateye.parseDate(self.dom.mapDatePicker.val() + "Z");
    }

    self.realToMapSeconds = function(realSeconds) {
        // convert real seconds to map seconds, because the map can be moving at a different
        // speed
        var clock = self.viewer.clock;
        return clock.clockStep * clock.multiplier * realSeconds;
    }

    self.onDashboardChanged = function() {
        // called when the current dashboard suffers any change
        self.clearMapData();
        if (sateye.dashboards.current != null) {
            self.onNewLocations(Object.values(sateye.dashboards.current.locations));
        }
    }

    self.clearMapData = function() {
        // remove all data from the map
        self.viewer.entities.removeAll();
    }

    self.onNewLocations = function(locations) {
        // add new locations to the map
        for (let location of locations) {
            var locationEntity = {
                id: "Sateye.Location:" + location.id,
                name: location.name,
                description: "<!--HTML-->\r\n<p>" + location.description + "</p>",
                point: {
                    show: true,
                    pixelSize: location.style.point_size,
                    color: sateye.hexToCesiumColor(location.style.point_color),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                position: Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude),
            };

            self.viewer.entities.add(locationEntity);
        }
    }

    self.ensurePathPredictions = function() {
        // ensure the map has enough info to display paths for shown satellites

        // if we have less than X real seconds of predictions left, then ask for Y predicted
        // seconds
        // more info at docs/prediction_chunks.rst
        for (let satellite of Object.values(sateye.dashboards.current.satellites)) {
            var currentDate = self.viewer.clock.currentTime;

            // we should ensure we have predictions enough to cover the time between the current date and
            // currentDate + _predictionsTooLowThresholdRealSeconds
            var ensurePredictionsUntil = sateye.addSeconds(
                currentDate,
                self.realToMapSeconds(self._predictionsTooLowThresholdRealSeconds),
            );

            if (!satellite.predictionsCover(currentDate, ensurePredictionsUntil)) {
                var mapSecondsArround = self.realToMapSeconds(self._predictionsChunkRealSeconds);
                var startDate = sateye.addSeconds(currentDate, -mapSecondsArround);
                var endDate = sateye.addSeconds(currentDate, mapSecondsArround);

                satellite.getPathPredictions(
                    startDate,
                    endDate,
                    self._predictionsRefreshRealSeconds * 1000,  // used as timeout
                );
            }
        }
    }

    self.onNewPathPrediction = function(satellite) {
        // process new path prediction from a satellite
        self.updateSatelliteInMap(satellite);
    }

    self.getSatelliteMapId = function(satellite) {
        // unified way of identifying satellites in the maps
        return "Sateye.Satellite:" + satellite.id.toString();
    }

    self.buildOrCreateSatelliteEntity = function(satellite) {
        // build a cesium entity to display the satellite and its path in the map, or return an
        // existing one if it's already there

        var satelliteMapId = self.getSatelliteMapId(satellite);
        var satelliteEntity = self.viewer.entities.getById(satelliteMapId);

        if (satelliteEntity === undefined) {
            satelliteEntity = self.viewer.entities.add({
                id: satelliteMapId,
                availability: new Cesium.TimeIntervalCollection(),
            });
        }

        return satelliteEntity;
    }

    self.updateSatelliteInMap = function(satellite) {
        // update the display data for a satellite shown in the map, based on its path predictions
        // this will even add the satellite for the map if it wasn't already there
        var satelliteEntity = self.buildOrCreateSatelliteEntity(satellite);

        // general satellite data
        satelliteEntity.name = satellite.name;
        satelliteEntity.description = "<!--HTML-->\r\n<p>" + satellite.description + "</p>";

        // show satellite in this specific interval
        // (we only trust the latest predictions, stuff like new tles could invalidate previous ones)
        satelliteEntity.availability.removeAll();
        satelliteEntity.availability.addInterval(new Cesium.TimeInterval({
            start: satellite.work_data.path_prediction.start_date,
            stop: satellite.work_data.path_prediction.end_date,
        }));

        // a point in the satellite position, that moves over time
        satelliteEntity.point = new Cesium.PointGraphics({
            show: true,
            pixelSize: satellite.style.point_size,
            color: sateye.hexToCesiumColor(satellite.style.point_color),
        });

        // satellite positions over time
        positionProperty = new Cesium.SampledPositionProperty();
        for (let position of satellite.work_data.path_prediction.positions) {
            positionProperty.addSample(
                sateye.parseDate(position.at_date),
                Cesium.Cartesian3.fromDegrees(
                    position.longitude,
                    position.latitude,
                    position.altitude,
                ),
            );
        }
        satelliteEntity.position = positionProperty;

        // path predicted behind and ahead the satellite
        satelliteEntity.path = new Cesium.PathGraphics({
            show: true,
            width: satellite.style.path_width,
            material: new Cesium.ColorMaterialProperty(sateye.hexToCesiumColor(satellite.style.path_color)),
            resolution: 120,
            leadTime: satellite.style.path_seconds_ahead,
            trailTime: satellite.style.path_seconds_behind
        });
    }

    self.onNightShadowChange = function(e) {
        // on input change, decide wether to show or not the night shadow
        self.viewer.scene.globe.enableLighting = self.dom.nightShadowInput.is(":checked");
    }

    return self;
}();
