sateye.passes = {
  dom: {},

  initialize: function() {
    sateye.passes.dom.passList = $('#pass-list');
    sateye.passes.predictPasses('2019-03-14', '2019-03-15', 1, 1);
  },

  predictPasses: function(startDate, endDate, satelliteId, locationId) {
    var self = this;
    var params = {
      start_date: startDate,
      end_date: endDate,
      location: locationId,
    };

    $.ajax({
      url: '/api/satellites/' + satelliteId + '/predict_passes/',
      cache: false,
      data: params,
    }).done(function(data) { self.onPassesRetrieved(data) });
  },

  onPassesRetrieved: function(data) {
    // TODO: Dynamic selection of satellite and location
    var context = {
      passes: data,
      location: 'UTN Los Reyunos',
      satellite: 'ISS',
    };

    var content = sateye.templates.passList(context);
    sateye.dom.passList.html(content);
  },
};
