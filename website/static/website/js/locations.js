sateye.locations = function() {
    var self = {};

    self.initialize = function() {
    }

    self.createLocation = function(dashboardLocationConfig) {
        // create a new location instance, optionally parsing data received from a dashboard config
        var location = {
            // general location data
            id: sateye.uuidv4(),
            name: 'New location',
            description: 'New location',
            latitude: 0,
            longitude: 0,
            altitude: 0,

            // visual configurations
            style: {
                point_size: 10,
                point_color: "#FF00FF"
            }
        };

        // if specified, update the basic location with the data from the dashboard config
        if (dashboardLocationConfig) {
            location = Object.assign(location, dashboardLocationConfig);
        }
        
        location.serialize = function() {
            // create a serializable representation, to store in the server saved dashboard config
            var serializedData = JSON.parse(JSON.stringify(location));
            return serializedData;
        }

        location.asPosition = function() {
            // create a Position entity representing the location
            return {
                object_id: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                altitude: location.altitude,
            };
        }

        return location;
    }

    return self;
}();
