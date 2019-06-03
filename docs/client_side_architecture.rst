Client side architecture
========================

The client side has these modules:

- ``core.js``: Contains global utilities, and is the responsible of initializing all the other modules in order.
- ``dashboards.js``: Logic for the crud of dashboards, and responsible of exposing the "current" dashboard for the other modules to use. In turn, this dashboard contains the list of the current satellites and locations being used.
- ``satellites.js``: Logic for the crud of satellites inside the current dashboard. Satellites in turn manage their own path predictions.
- ``locations.js``: Logic for the crud of locations inside the current dashboard.
- ``map.js``: Logic to configure and interact with the Cesium map, showing data from the current dashboard (locations, satellites, and their paths). It's also the one with the internal "clock" which updates and asks for new predictions when needed.
- ``passes.js``: Logic for passes information retreival and display.
- ``home.js``: Just a script that calls the entry point of the whole client side app (``sateye.initialize()``).

Some super important things regarding the modules and their interconnections: 

- No module should "do stuff" when its .js file is executed. The modules should just define methods, which will be then alled.
- All modules should have an ``initialize()`` method, which will be called by the core module on its own ``initialize()``. This is where each module should start doing stuff.
- The dashboards module exposes a ``dashboards.current`` reference to the current dashboard in use by the user. Anyone can depend on that, but beware!: it might be ``null``
  sometimes, take that into account in the other modules. 
- The dashboards module also has a ``dashboards.onDashboardChangedCallbacks`` public array, where other modules can add their own callback functions to be called when something 
  changes in the current dashboard. Use this to get notified when the user changes to another dashboard, or changes the satellites or locations in the current dashboard.
