sateye.map = {
    mainMap: null,
    cesiumConfig: {
        homeButton: false,
        navigationInstructionsInitiallyVisible: false,
        sceneMode: Cesium.SceneMode.SCENE2D,
        fullscreenButton: false,
    },
    dom: {},

    // chunking configs. More info at docs/prediction_chunks.rst
    // how often do we check if we need to refresh predictions?
    _predictionsRefreshRealSeconds: 10,
    // how many real seconds do we want to get on each prediction?
    _predictionsChunkRealSeconds: 240,
    // how many real seconds before we run out of predictions should fire a new request for predictions?
    _predictionsTooLowThresholdRealSeconds: 20,

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
        sateye.map.mainMap = new Cesium.Viewer("main-map", sateye.map.cesiumConfig);

        // center on 0,0 with enough distance to see the whole planet
        var center = Cesium.Cartesian3.fromDegrees(0, 0);
        sateye.map.mainMap.camera.setView({destination: center});

        // every some time, ensure we have paths for each satellite
        //sateye.map.mainMap.clock.onTick.addEventListener(sateye.map.onMapTick);
        setInterval(sateye.map.ensurePathsInfo, 
                    sateye.map._predictionsRefreshRealSeconds * 1000);

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

    ensurePathsInfo: function() {
        // ensure the map has enough info to display paths for shown satellites

        // if we have less than X real seconds of predictions left, then ask for Y predicted 
        // seconds
        // more info at docs/prediction_chunks.rst
        for (let satellite of sateye.satellites.active) {
            // TODO shorten with names, add comments
            var fromTime = sateye.map.mainMap.clock.currentTime;
            if (!satellite.hasPredictionsToFillSeconds(fromTime, sateye.map.realToMapSeconds(sateye.map._predictionsTooLowThresholdRealSeconds))) {
                var seconds = sateye.map.realToMapSeconds(sateye.map._predictionsChunkRealSeconds);
                var steps = sateye.map._predictionsChunkRealSeconds;  // predict once every real second, avoid too many predictions if map seconds are too fast
                satellite.getMorePredictions(fromTime, seconds, steps);
            }
        }
    },

    onNightShadowChange: function(e) {
        // on input change, decide wether to show or not the night shadow
        sateye.map.mainMap.scene.globe.enableLighting = sateye.map.dom.nightShadowInput.is(":checked");
    },
}
