sateye.map = {
    mainMap: null,
    cesiumConfig: {
        homeButton: false,
        navigationInstructionsInitiallyVisible: false,
        sceneMode: Cesium.SceneMode.SCENE2D,
        fullscreenButton: false,
        shouldAnimate: true,
    },
    dom: {},

    // chunking configs. More info at docs/prediction_chunks.rst
    // how often do we check if we need to refresh predictions?
    _predictionsRefreshRealSeconds: 3,
    // how many real seconds do we want to get on each prediction?
    _predictionsChunkRealSeconds: 30 * 60,
    // how many real seconds before we run out of predictions should fire a new request for predictions?
    _predictionsTooLowThresholdRealSeconds: 15 * 60,

    initialize: function() {
        // initialize the map module
        sateye.map.configureCesiumMap();

        // control display of night shadow with the checkbox
        nightShadowInput = $("#night-shadow-input");
        sateye.map.dom.nightShadowInput = nightShadowInput;
        nightShadowInput.on("change", sateye.map.onNightShadowChange);
        sateye.map.onNightShadowChange();
    },

    configureCesiumMap: function() {
        // configure the cesium map
        Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNTM4OTc3ZS0zZmVjLTQ0M2EtYThjYy1kYWJhN2RhOGJlM2QiLCJpZCI6ODU0Mywic2NvcGVzIjpbImFzbCIsImFzciIsImdjIl0sImlhdCI6MTU1MjI0MTkxOX0.VCvIgLNku8mLpI6KIUq3ldjE-KNE5MDksNuCrPMVk48";
        sateye.map.mainMap = new Cesium.Viewer("main-map", sateye.map.cesiumConfig);

        // center on 0,0 with enough distance to see the whole planet
        var center = Cesium.Cartesian3.fromDegrees(0, 0);
        sateye.map.mainMap.camera.setView({destination: center});

        // every some time, ensure we have paths for each satellite
        //sateye.map.mainMap.clock.onTick.addEventListener(sateye.map.onMapTick);
        setInterval(sateye.map.ensurePathPredictions,
                    (sateye.map._predictionsRefreshRealSeconds - 1) * 1000);

        // remove fog and ground atmosphere on 3d globe
        sateye.map.mainMap.scene.fog.enabled = false;
        sateye.map.mainMap.scene.globe.showGroundAtmosphere = false;
    },

    onMapTick: function(clock) {
        // time has passed in the map
    },

    realToMapSeconds: function(realSeconds) {
        // convert real seconds to map seconds, because the map can be moving at a different
        // speed
        var clock = sateye.map.mainMap.clock;
        return clock.clockStep * clock.multiplier * realSeconds;
    },

    onNewDashboard: function(dashboard) {
        // called when we start using a new dashboard
        sateye.map.clearMapData();
        sateye.map.onNewLocations(dashboard.locations);
    },

    clearMapData: function() {
        // remove all data from the map
        sateye.map.mainMap.entities.removeAll();
    },

    onNewLocations: function(locations) {
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

            sateye.map.mainMap.entities.add(locationEntity);
        }
    },

    ensurePathPredictions: function() {
        // ensure the map has enough info to display paths for shown satellites

        // if we have less than X real seconds of predictions left, then ask for Y predicted
        // seconds
        // more info at docs/prediction_chunks.rst
        for (let satellite of sateye.dashboards.current.satellites) {
            var currentDate = sateye.map.mainMap.clock.currentTime;

            // we should ensure we have predictions enough to cover the time between the current date and
            // currentDate + _predictionsTooLowThresholdRealSeconds
            var ensurePredictionsUntil = sateye.addSeconds(
                currentDate,
                sateye.map.realToMapSeconds(sateye.map._predictionsTooLowThresholdRealSeconds),
            );

            if (!satellite.predictionsCover(currentDate, ensurePredictionsUntil)) {
                var mapSecondsArround = sateye.map.realToMapSeconds(sateye.map._predictionsChunkRealSeconds);
                var startDate = sateye.addSeconds(currentDate, -mapSecondsArround);
                var endDate = sateye.addSeconds(currentDate, mapSecondsArround);

                satellite.getMorePredictions(
                    startDate,
                    endDate,
                    satellite.pathSecondsAhead,
                    satellite.pathSecondsBehind,
                    sateye.map._predictionsRefreshRealSeconds * 1000,  // used as timeout
                );
            }
        }
    },

    onNewPathPrediction: function(satellite) {
        // process new path prediction from a satellite
        sateye.map.updateSatelliteInMap(satellite);
    },

    getSatelliteMapId: function(satellite) {
        // unified way of identifying satellites in the maps
        return "Sateye.Satellite:" + satellite.id.toString();
    },

    buildOrCreateSatelliteEntity: function(satellite) {
        // build a cesium entity to display the satellite and its path in the map, or return an
        // existing one if it's already there

        var satelliteMapId = sateye.map.getSatelliteMapId(satellite);
        var satelliteEntity = sateye.map.mainMap.entities.getById(satelliteMapId);

        if (satelliteEntity === undefined) {
            satelliteEntity = sateye.map.mainMap.entities.add({
                id: satelliteMapId,
                availability: new Cesium.TimeIntervalCollection(),
            });
        }

        return satelliteEntity;
    },

    updateSatelliteInMap: function(satellite) {
        // update the display data for a satellite shown in the map, based on its path predictions
        // this will even add the satellite for the map if it wasn't already there
        var satelliteEntity = sateye.map.buildOrCreateSatelliteEntity(satellite);

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
    },

    onNightShadowChange: function(e) {
        // on input change, decide wether to show or not the night shadow
        sateye.map.mainMap.scene.globe.enableLighting = sateye.map.dom.nightShadowInput.is(":checked");
    },
}
