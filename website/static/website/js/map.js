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

        // control display of night shadow with the checkbox
        nightShadowInput = $("#night-shadow-input");
        self.dom.nightShadowInput = nightShadowInput;
        nightShadowInput.on("change", self.onNightShadowChange);
        self.onNightShadowChange();
    }

    self.configureCesiumMap = function() {
        // configure the cesium map
        Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNTM4OTc3ZS0zZmVjLTQ0M2EtYThjYy1kYWJhN2RhOGJlM2QiLCJpZCI6ODU0Mywic2NvcGVzIjpbImFzbCIsImFzciIsImdjIl0sImlhdCI6MTU1MjI0MTkxOX0.VCvIgLNku8mLpI6KIUq3ldjE-KNE5MDksNuCrPMVk48";
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

    self.realToMapSeconds = function(realSeconds) {
        // convert real seconds to map seconds, because the map can be moving at a different
        // speed
        var clock = self.viewer.clock;
        return clock.clockStep * clock.multiplier * realSeconds;
    }

    self.onNewDashboard = function(dashboard) {
        // called when we start using a new dashboard
        self.clearMapData();
        self.onNewLocations(dashboard.locations);
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
                    pixelSize: location.pointSize,
                    color: sateye.hexToCesiumColor(location.pointColor),
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
        for (let satellite of sateye.dashboards.current.satellites) {
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
                    satellite.pathSecondsAhead,
                    satellite.pathSecondsBehind,
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
            start: satellite.pathPrediction.startDate,
            stop: satellite.pathPrediction.endDate,
        }));

        // a point in the satellite position, that moves over time
        satelliteEntity.point = new Cesium.PointGraphics({
            show: true,
            pixelSize: satellite.pointSize,
            color: sateye.hexToCesiumColor(satellite.pointColor),
        });

        // satellite positions over time
        positionProperty = new Cesium.SampledPositionProperty();
        for (let dateAndPosition of satellite.pathPrediction.positions) {
            positionProperty.addSample(
                sateye.parseDate(dateAndPosition[0]),
                Cesium.Cartesian3.fromDegrees(
                    dateAndPosition[1][1],  // lon
                    dateAndPosition[1][0],  // lat
                    dateAndPosition[1][2],  // elev
                ),
            );
        }
        satelliteEntity.position = positionProperty;

        // path predicted behind and ahead the satellite
        satelliteEntity.path = new Cesium.PathGraphics({
            show: true,
            width: satellite.pathWidth,
            material: new Cesium.ColorMaterialProperty(sateye.hexToCesiumColor(satellite.pathColor)),
            resolution: 120,
            leadTime: satellite.pathSecondsAhead,
            trailTime: satellite.pathSecondsBehind
        });
    }

    self.onNightShadowChange = function(e) {
        // on input change, decide wether to show or not the night shadow
        self.viewer.scene.globe.enableLighting = self.dom.nightShadowInput.is(":checked");
    }

    return self;
}();
