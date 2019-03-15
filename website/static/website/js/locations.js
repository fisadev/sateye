sateye.locations = {
    initialize: function() {
    },

    createLocation: function(dashboardLocationConfig) {
        // create a new location instance, parsing the json received from an api
        return {
            // general location data
            id: dashboardLocationConfig.location.id,
            name: dashboardLocationConfig.location.name,
            description: dashboardLocationConfig.location.description,

            // config of the point
            pointSize: dashboardLocationConfig.point_size,
            pointColor: dashboardLocationConfig.point_color,
        }
    },
}
