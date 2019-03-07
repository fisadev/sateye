Prediction chunks download logic
================================

A prediction chunk is a group of predictions of a single satellite position over time, during a 
specific timespan (example: "the position of the ISS from today to tomorrow").

We need these prediction chunks to feed the main map with info to show, and the info is shown 
according to the time in the clock of the map.

We have "real seconds" (the ones advancing in your clock), and we also have "map seconds", which
are the seconds passing in the map's clock. The later can move faster or slower than real seconds,
if you change the speed of the map's clock.

For example, if you set the map's clock to 5x, for each real second that passes, 5 seconds pass 
in the map, so the ISS would move 5 seconds into the future.

We don't want to request prediction chunks too often, so each time we ask for predictions we get 
a big chunk with a certain timespan of predictions. How much? Well, ask for enough predictions to 
to show data for the next X real seconds. If we just downloaded a chunk we want to be able to use 
it to show the map with the satellite for the next X real seconds.

That X is defined by ``sateye.map._predictionsChunkRealSeconds``.

The map's clock might be moving faster or slower, so to get X real seconds of data, we have to 
calculate how much map seconds that would be. Example: we want to be able to show the satellite 
for 10 seconds. The map is moving at 2x. Then to show the map with the satellite for 10 real 
seconds, we need 20 seconds of predictions.

Also, after we got that chunk we still have to check from time to time if we have reached the end 
of its predictions, so we need a new one. We do this fairly often, defined by 
``sateye.map._predictionsRefreshRealSeconds``.

And finally, if we waited for the predictions to run out before we asked the server for new 
predictions, the user would stop seeing satellites every time they run out. To avoid that, we 
have a threshold that fires the request for new predictions a little time before the current 
predictions run out. That threshold is ``sateye.map._predictionsTooLowThresholdRealSeconds``.
