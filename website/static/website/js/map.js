sateye.map = {
    mainMap: null,
    czmlSourceStream: null,
    cesiumConfig: {
        homeButton: false,
        navigationInstructionsInitiallyVisible: false,
        sceneMode: Cesium.SceneMode.SCENE2D,
        fullscreenButton: false,
        shouldAnimate: true,
        // don't use clock configs from data sources
        automaticallyTrackDataSourceClocks: false,
    },
    dom: {},

    // chunking configs. More info at docs/prediction_chunks.rst
    // how often do we check if we need to refresh predictions?
    _predictionsRefreshRealSeconds: 5,
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
        sateye.map.mainMap = new Cesium.Viewer("main-map", sateye.map.cesiumConfig);
        sateye.map.czmlSourceStream = new Cesium.CzmlDataSource();

        // center on 0,0 with enough distance to see the whole planet
        var center = Cesium.Cartesian3.fromDegrees(0, 0);
        sateye.map.mainMap.camera.setView({destination: center});

        // every some time, ensure we have paths for each satellite
        //sateye.map.mainMap.clock.onTick.addEventListener(sateye.map.onMapTick);
        setInterval(sateye.map.ensurePathPredictions,
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

    onNewDashboard: function(dashboard) {
        // called when we start using a new dashboard
        sateye.map.clearMapData();
        sateye.map.onNewLocations(dashboard.locations);
    },

    clearMapData: function() {
        // remove all data from the map
        sateye.map.mainMap.dataSources.removeAll();
        sateye.map.mainMap.entities.removeAll();
    },

    onNewLocations: function(locations) {
        // add new locations to the map 
        for (let location of locations) {
            var locationEntity = {
                point: {
                    show: true,
                    pixelSize: location.pointSize,
                    color: {
                        rgba: sateye.hexToCesiumColor(location.pointColor)
                    }
                },
                position: {
                    cartographicDegrees: [
                        location.longitude,
                        location.latitude,
                        location.elevation
                    ]
                },
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
                    satellite.pathSecondsBehind
                );
            }
        }
    },

    onNewPathPrediction: function(satellite) {
        // process new path prediction from a satellite
        var satelliteCzml = sateye.map.buildSatelliteCzml(satellite);

        if (sateye.map.mainMap.dataSources.contains(sateye.map.czmlSourceStream)) {
            sateye.map.czmlSourceStream.process(satelliteCzml);
        } else {
            sateye.map.mainMap.dataSources.add(sateye.map.czmlSourceStream.load(satelliteCzml));
        }
    },

    onNightShadowChange: function(e) {
        // on input change, decide wether to show or not the night shadow
        sateye.map.mainMap.scene.globe.enableLighting = sateye.map.dom.nightShadowInput.is(":checked");
    },

    buildSatelliteCzml: function(satellite) {
        // build a czml to display the satellite and its path in the map

        // cesium expects all the positions in a single list with this format:
        // [date_as_str1, lon1, lat1, alt1, date_as_str2, lon2, lat2, alt2, ...]
        var joinedPositions = [];
        for (let dateAndPosition of satellite.pathPrediction.positions) {
            joinedPositions.push(
                sateye.parseDate(dateAndPosition[0]).toString(),  // date
                dateAndPosition[1][1],  // lon
                dateAndPosition[1][0],  // lat
                dateAndPosition[1][2] * 1000,  // elev
            );
        }

        var czml = [
            {
                id: "document",
                name: "Sateye CZML",
                version: "1.0",
            },
            {
                id: "Sateye.Satellite:" + satellite.id.toString(),
                name: satellite.name,
                description: "<!--HTML-->\r\n<h2>" + satellite.name + "</h2>",
                availability: "1-01-01T00:00:00Z/9999-12-31T23:59:59Z",
                //availability: satellite.pathPrediction.startDate.toString() + "/" + satellite.pathPrediction.endDate.toString(),
                point: {
                    show: true,
                    pixelSize: satellite.pointSize,
                    color: {
                        "rgba": sateye.hexToCesiumColor(satellite.pointColor)
                    }
                },
                path: {
                    show: true,
                    width: satellite.pathWidth,
                    material: {
                        solidColor: {
                            color: {
                                "rgba": sateye.hexToCesiumColor(satellite.pathColor)
                            }
                        }
                    },
                    resolution: 120,
                    leadTime: satellite.pathSecondsAhead,
                    trailTime: satellite.pathSecondsBehind
                },
                position: {
                    interpolationAlgorithm: "LAGRANGE",
                    interpolationDegree: 5,
                    cartographicDegrees: joinedPositions
                },
                agi_conicSensor: {
                    show: true,
                    showIntersection: true,
                    intersectionColor: {
                        "rgba": [0, 255, 255, 255]
                    }
                }
            }
        ];

        return czml;
    },
}
