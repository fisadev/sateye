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
                point_color: "yellow"
            }
        };

        // if specified, update the basic location with the data from the dashboard config
        if (dashboardLocationConfig) {
            location = Object.assign(location, dashboardLocationConfig);
        }
        
        location.serialize = function() {
            // create a serializable representation, to store in the server saved dashboard config
            console.log("WARNING: location serialization not implemented");
            return {};
        }

        return location;
    }

    return self;
}();
