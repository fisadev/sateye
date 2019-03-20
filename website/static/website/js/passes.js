sateye.passes = {
  dom: {},

  initialize: function() {
    sateye.passes.dom.passList = $("#pass-list");
    sateye.passes.predictPasses("2019-03-14", "2019-03-15", 1);
  },

  predictPasses: function(startDate, endDate, locationId) {
    var self = this;
    var params = {
      start_date: startDate,
      end_date: endDate,
      location: locationId,
    };

    $.ajax({
      url: "/api/satellites/1/predict_passes/",
      cache: false,
      data: params,
    }).done(function(data) { self.onPassesRetrieved(data) });
  },

  onPassesRetrieved: function(data) {
    var content = sateye.templates.passList({passes: data});
    sateye.dom.passList.html(content);
  },
};
