sateye.locations = function() {
    var self = {};
    self.defaultLocationConfig = {
        pointSize: 10,
        pointColor: "yellow"
    };


    self.initialize = function() {
    }

    self.createLocation = function(dashboardLocationConfig) {
        // create a new location instance, parsing the json received from an api

        var valueOrDefault = function(fieldName) {
            // create a function that is able to get the specified field, 
            // or return the default from the module defaults if value is 
            // null or undefined
            var getter = function() {
                var currentValue = this[fieldName];
                if (currentValue == null || currentValue === undefined) {
                    currentValue = self.defaultLocationConfig[fieldName];
                }
                return currentValue;
            }

            return getter;
        }

        return {
            // general location data
            id: dashboardLocationConfig.id,
            name: dashboardLocationConfig.name,
            description: dashboardLocationConfig.description,
            latitude: dashboardLocationConfig.latitude,
            longitude: dashboardLocationConfig.longitude,
            altitude: dashboardLocationConfig.altitude,

            // config of the point
            pointSize: dashboardLocationConfig.point_size,
            pointColor: dashboardLocationConfig.point_color,

            pointSizeOrDefault: valueOrDefault('pointSize'),
            pointColorOrDefault: valueOrDefault('pointColor'),
        }
    }

    return self;
}();
