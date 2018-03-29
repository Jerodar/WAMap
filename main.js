var WAMap = (function () {
  'use strict';

  var debug = 0;

  var settings = {};
  var map = {};
  var poiLayers = {};
  var prevZoom = -6;
  var points = {};

  function init() {
    // Create the map container
    map = L.map('mapid', {
      crs: L.CRS.Simple,
      minZoom: -6,
      maxZoom: -3,
      zoomDelta: 0.5,
      zoomSnap: 0.5,
      attributionControl: false
    });
    
    // Set the renderer to render beyond the viewport to prevent weird half rendered polygons
    map.getRenderer(map).options.padding = 100;
    
    // Async load the settings file
    $.ajax({
      dataType: 'json',
      url: 'data/settings.json',
      cache: false,
      success: onSettingsLoaded,
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }

  function onSettingsLoaded(data) {
    settings = data;
    
    // Prepare the map object
    var bounds = [[settings.minY, settings.minX], [settings.maxY, settings.maxX]];
    //map.fitBounds(bounds);
    var maxBounds = [[settings.minY - settings.maxBounds, settings.minX - settings.maxBounds], 
                    [settings.maxY + settings.maxBounds, settings.maxX + settings.maxBounds]];
    map.setMaxBounds(maxBounds);
    map.setView([0, 0], -6);
    map.on('zoomanim', onZoomAnim);
    map.on('zoomend', onZoomEnd);
    
    // L.imageOverlay('img/map.png', bounds).addTo(map);
    
    // Add the various layergroups
    poiLayers.pointLayer = new L.LayerGroup();
    poiLayers.zoneLayer = new L.LayerGroup();
    poiLayers.zoneLayer.addTo(map);
    poiLayers.sectorLayer = new L.LayerGroup();
    poiLayers.sectorLayer.addTo(map);
    poiLayers.sectorNameLayer = new L.LayerGroup();
    poiLayers.sectorNameLayer.addTo(map);
    poiLayers.wallLayer = new L.LayerGroup();
    poiLayers.wallLayer.addTo(map);
    poiLayers.islandLayer = new L.LayerGroup();
    poiLayers.zoomedIslandLayer = new L.LayerGroup();
    poiLayers.routeLayer = new L.LayerGroup();
    poiLayers.routeLayer.addTo(map);

    // Add the controls
    
    // Fill in the attribution without a tile layer
    var attributionControl = L.control.attribution();
    attributionControl.addAttribution('App made by Jerodar. Mapped by the <a href="https://www.worldsadrift.com/forums/topic/cardinal-guild-map-making-navigation-and-helmsmanship/">Cardinal Guild.</a>');
    attributionControl.addTo(map);
    
    // Watermark control with the Cardinal Guild logo
    L.control.watermark({
      position: 'bottomright',
      width: '100px',
      url: 'https://www.worldsadrift.com/forums/topic/cardinal-guild-map-making-navigation-and-helmsmanship/'
    }).addTo(map);
    
    // Displays a div containing the legend
    var legend = L.control({position: 'topright'});
    legend.onAdd = constructLegend;
    legend.addTo(map);
    
    // Search bar
    var controlSearch = new L.control.search({
      position:'topleft',
      layer: poiLayers.islandLayer,
      textPlaceholder: 'Search Authors...',
      targetProperty: 'author',
      displayProperty: 'name',
      initial: false,
      zoom: -4,
      marker: false
    });
    controlSearch.on('search:locationfound', function(e) {
      e.layer.openPopup();
    });
    controlSearch.addTo(map);

    map.removeLayer(poiLayers.islandLayer);
    
    // Cursor coordinate display
    L.control.mousePosition({separator: ',', lngFirst: true, numDigits: -1}).addTo(map);

    // Load the point data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/point_data.csv',
      type: 'GET',
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text);
        onPointDataLoaded(data);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
  
  function constructLegend(map) {
    var div = L.DomUtil.create('div', 'info legend');
    var container = document.createElement('div');
    var imageNode = document.createElement('img');
    imageNode.setAttribute('src','img/compass.png');
    container.appendChild(imageNode);
    container.appendChild(document.createElement('br'));
    
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createTextNode('Altitudes:'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.altitude.high, ShadeRgb(settings.colors.altitude.high)));
    container.appendChild(document.createTextNode('High'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.altitude.medium, ShadeRgb(settings.colors.altitude.medium)));
    container.appendChild(document.createTextNode('Medium'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.altitude.low, ShadeRgb(settings.colors.altitude.low)));
    container.appendChild(document.createTextNode('Low'));
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    
    container.appendChild(document.createTextNode('Biome:'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.islands[1], ShadeRgb(settings.colors.islands[1])));
    container.appendChild(document.createTextNode('Wilderness'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.islands[2], ShadeRgb(settings.colors.islands[2])));
    container.appendChild(document.createTextNode('Expanse'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.islands[3], ShadeRgb(settings.colors.islands[3])));
    container.appendChild(document.createTextNode('Remnants'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.island, settings.colors.islands[4], ShadeRgb(settings.colors.islands[4])));
    container.appendChild(document.createTextNode('Badlands'));
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    
    container.appendChild(document.createTextNode('Walls:'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.wall, settings.colors.walls[1], settings.colors.walls[1]));
    container.appendChild(document.createTextNode('World Border'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.wall, settings.colors.walls[2], settings.colors.walls[2]));
    container.appendChild(document.createTextNode('Windwall'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.wall, settings.colors.walls[3], settings.colors.walls[3]));
    container.appendChild(document.createTextNode('Stormwall'));
    container.appendChild(document.createElement('br'));
    container.appendChild(generateSvgImage(settings.shapes.wall, settings.colors.walls[4], settings.colors.walls[4]));
    container.appendChild(document.createTextNode('Sandstorm'));
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));

    div.innerHTML = container.innerHTML;
    return div;
  }

  function generateSvgImage(shape, fillcolor, strokecolor) {
    var svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgNode.setAttribute('width', '20');
    svgNode.setAttribute('height', '20');
    svgNode.setAttribute('viewBox', '0 0 20 20');
    svgNode.setAttribute('class', 'svgImage');
    var pathNode = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathNode.setAttribute('style', 'fill: ' + rgb(fillcolor) + '; stroke: '
      + rgb(strokecolor) + '; stroke-width:3px;');
    pathNode.setAttribute('d', shape);
    svgNode.appendChild(pathNode);
    return svgNode;
  }

  function onPointDataLoaded(data) {
	// Render all sectors
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== '') {
        var point = {};
        // ID, X, Z, Sectors
        var Id = data[i][0];
        points[Id] = {};
        points[Id].X = Number(data[i][1]);
        points[Id].Z = Number(data[i][2]);
        
        // Create and add the marker to the island layer
        var labelIcon = new L.divIcon({ html: Id, className: 'sector-label'});
        var options = settings.sectorLabelOptions;
        options.fillcolor = '#AAAAAA';
        options.icon = labelIcon;
        var label = new L.Marker([points[Id].Z, points[Id].X], options).addTo(poiLayers.pointLayer);
      }
    }  

    // Async load the zone data file
    $.ajax({
      dataType: 'json',
      url: 'data/zone_data.json',
      cache: false,
      success: onZoneDataLoaded,
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }

  function onZoneDataLoaded(zones) {
    for (var zone in zones) {
      if (!zones.hasOwnProperty(zone)) {
        //The current property is not a direct property
        continue;
      }
      var html = '<div style="transform: rotate(' + zones[zone].angle + 'deg); letter-spacing: ' + zones[zone].spacing + 'em">' + zone + '</div>';
      var labelIcon = new L.divIcon({ html: html, className: 'zone-label'});
      var options = settings.sectorLabelOptions;
      options.icon = labelIcon;
      var label = new L.Marker(zones[zone].pos, options).addTo(poiLayers.zoneLayer);
    }

    // Load the sector data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/sector_data.csv',
      type: 'GET',
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text);
        onSectorDataLoaded(data);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }

  function onSectorDataLoaded(data) {
    // Render all sectors
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== '') {
        var sector = {};
        // Sector, Region, Tier, P1, P2, P3, P4, P5, P6, P7
        sector.Sector = data[i][0];
        sector.Region = data[i][1];
        sector.Tier = Number(data[i][2]);
        sector.Pos = [];
        for (var j = 3; j < 10; j++) {
            if(data[i][j] !== '') {
                sector.Pos.push([points[data[i][j]].Z,points[data[i][j]].X]);
            }
        }
        
        // Set the colors of the marker
        var color = settings.colors.islands[sector.Tier];
        var options = settings.sectorOptions;
        options.fillColor = rgb(color);
        
        // Create and add the marker to the island layer
        var marker = new L.polyline(sector.Pos, options)
          .addTo(poiLayers.sectorLayer);
        var labelIcon = new L.divIcon({ html: sector.Sector, className: 'sector-label sector-label-'+sector.Tier});
        var labelPos = marker.getBounds().getCenter();
        var labelPoint = map.latLngToContainerPoint(labelPos);
        labelPoint = L.point([labelPoint.x - 10, labelPoint.y - 10]);
        labelPos = map.containerPointToLatLng(labelPoint);
        options = settings.sectorLabelOptions;
        options.icon = labelIcon;
        var label = new L.Marker(labelPos,options).addTo(poiLayers.sectorNameLayer);
      }
    }
    
    poiLayers.sectorNameLayer.setZIndex(-100);

    
    // Load the wall data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/wall_data.csv',
      type: 'GET',
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text);
        onWallDataLoaded(data);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
  
  function onWallDataLoaded(data) {
    // Render all walls
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== '') {
        var wall = {};
        // Id, Tier, P1, P2
        wall.Tier = Number(data[i][1]);
        wall.P1 = [points[data[i][2]].Z, points[data[i][2]].X];
        wall.P2 = [points[data[i][3]].Z, points[data[i][3]].X];
        
        // Set the colors of the marker
        var color = settings.colors.walls[wall.Tier];
        var options = settings.wallOptions;
        options.color = rgb(color);
        
        // Create and add the marker to the island layer
        var marker = new L.polyline([wall.P1, wall.P2], options)
            .addTo(poiLayers.wallLayer);
      }
    }
    
    // Load the POI data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/island_data.csv',
      type: 'GET',
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text);
        onIslandDataLoaded(data);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
  
  function onIslandDataLoaded(data) {
    // Render all islands
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== '') {
        var island = {};
        island.Id = data[i][1];
        island.Name = data[i][2];
        island.Author = data[i][3];
        island.Sector = data[i][4];
        island.Tier = Number(data[i][5]);
        // island.Screenshot = data[i][6];
        // Mapping to 2d plane, so X = X, Y = Height (used for coloring), Z = Y
        island.X = Number(data[i][7]);
        island.Height = Number(data[i][8]) + settings.ZtoAltitude;
        island.Y = Number(data[i][9]);
        if (data[i][10] === "") {
          island.Databanks = "Unknown";
        } else {
          island.Databanks = Number(data[i][10]);
        }
        island.Respawner = data[i][11];
        island.Trees = data[i][12];
        island.Surveyor = data[i][13];
        // island.Steamname = data[i][14];
        // island.URL = data[i][15];
        island.Ore = {};
        island.Ore.Aluminium = (data[i][16] === "") ? 0 : Number(data[i][16]);
        island.Ore.Bronze = (data[i][17] === "") ? 0 : Number(data[i][17]);
        island.Ore.Copper = (data[i][18] === "") ? 0 : Number(data[i][18]);
        island.Ore.Gold = (data[i][19] === "") ? 0 : Number(data[i][19]);
        island.Ore.Iron = (data[i][20] === "") ? 0 : Number(data[i][20]);
        island.Ore.Lead = (data[i][21] === "") ? 0 : Number(data[i][21]);
        island.Ore.Nickel = (data[i][22] === "") ? 0 : Number(data[i][22]);
        island.Ore.Silver = (data[i][23] === "") ? 0 : Number(data[i][23]);
        island.Ore.Steel = (data[i][24] === "") ? 0 : Number(data[i][24]);
        island.Ore.Tin = (data[i][25] === "") ? 0 : Number(data[i][25]);
        island.Ore.Titanium = (data[i][26] === "") ? 0 : Number(data[i][26]);
        island.Ore.Tungsten = (data[i][27] === "") ? 0 : Number(data[i][27]);
        
        // Set the colors of the marker
        var color = settings.colors.islands[island.Tier];
        var options = settings.islandOptions;
        // Share or tint the base color based on height
        if (island.Height < settings.lowThreshold) {
          color = ShadeRgb(color);
        }
        else if (island.Height > settings.highThreshold) {
          color = TintRgb(color);
        }
        options.fillColor = rgb(color);
        options.color = rgb(ShadeRgb(color));

        // Create and add the marker to the island layer
        var marker = new L.circleMarker([island.Y, island.X], options)
          .addTo(poiLayers.islandLayer);
        
        island.Screenshot = 'img/islands/' + island.Id + '.jpg';
        
        // Create and add the marker to the zoomed island layer
        var myIcon = L.icon({
          // Copy of screenshot ending with s is a square thumbnail of 90x90
          iconUrl: island.Screenshot.replace('.jpg','s.jpg'),
          iconSize: [90,90]
        });
        var zoomedMarker = L.marker([island.Y, island.X], {icon: myIcon})
          .addTo(poiLayers.zoomedIslandLayer);
        
        // Create the popup that will appear when clicked
        // Copy of screenshot ending with m is a thumbnail of 320 width
        var thumbnail = island.Screenshot.replace('.jpg','m.jpg');
        
        var popup = '<b>' + island.Name + '</b><br>' +
          'By: ' + island.Author + '<br>' +
          'Databanks: ' + island.Databanks + ', Sector: ' + island.Sector +
          ', Altitude: ' + island.Height + '<br>';
          
        if (island.Trees !== '') {
          popup = popup + 'Trees found: ' + island.Trees + '<br>';
        }

        var OresFound = '';
        OresFound = OresFound + ((island.Ore.Aluminium === 0) ? '' : 'Aluminium Q' + island.Ore.Aluminium + ', ');
        OresFound = OresFound + ((island.Ore.Bronze === 0) ? '' : 'Bronze Q' + island.Ore.Bronze + ', ');
        OresFound = OresFound + ((island.Ore.Copper === 0) ? '' : 'Copper Q' + island.Ore.Copper + ', ');
        OresFound = OresFound + ((island.Ore.Gold === 0) ? '' : 'Gold Q' + island.Ore.Gold + ', ');
        OresFound = OresFound + ((island.Ore.Iron === 0) ? '' : 'Iron Q' + island.Ore.Iron + ', ');
        OresFound = OresFound + ((island.Ore.Lead === 0) ? '' : 'Lead Q' + island.Ore.Lead + ', ');
        OresFound = OresFound + ((island.Ore.Nickel === 0) ? '' : 'Nickel Q' + island.Ore.Nickel + ', ');
        OresFound = OresFound + ((island.Ore.Silver === 0) ? '' : 'Silver Q' + island.Ore.Silver + ', ');
        OresFound = OresFound + ((island.Ore.Steel === 0) ? '' : 'Steel Q' + island.Ore.Steel + ', ');
        OresFound = OresFound + ((island.Ore.Tin === 0) ? '' : 'Tin Q' + island.Ore.Tin + ', ');
        OresFound = OresFound + ((island.Ore.Titanium === 0) ? '' : 'Titanium Q' + island.Ore.Titanium + ', ');
        OresFound = OresFound + ((island.Ore.Tungsten === 0) ? '' : 'Tungsten Q' + island.Ore.Tungsten + ', ');
        if (OresFound !== '') {
          popup = popup + 'Ores found: ' + OresFound.slice(0, -2) + '<br>';
        }
        
        if (island.Respawner === 'Yes') {
          popup = popup + 'Has respawners<br>';
        }

        // Build the url to the google form with pre-filled fields
        var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdvfHgdOzNJfk7XfZV6aWOfDZmAIgnY2viSak8Udz88fFDGfA/viewform?usp=pp_url' + 
          '&entry.302396488='  + island.Id +
          '&entry.1668213788=' + island.Name +
          '&entry.1743663171=' + island.Author +
          '&entry.1828617833=' + island.Sector +
          '&entry.2064763837=' + island.Height +
          '&entry.1870806519=' + island.Databanks +
          '&entry.563492615='  + island.Respawner;
        var treeArray = island.Trees.split(", ");
        for (var j = 0; j < treeArray.length; j++) {
          formUrl = formUrl + '&entry.1092906456=' + treeArray[j];
        }
        formUrl = formUrl + 
          '&entry.930831494='  + island.Ore.Aluminium +
          '&entry.1129775473=' + island.Ore.Bronze +
          '&entry.1866350489=' + island.Ore.Copper +
          '&entry.1187879825=' + island.Ore.Gold +
          '&entry.1021476175=' + island.Ore.Iron +
          '&entry.536411341='  + island.Ore.Lead +
          '&entry.1001924318=' + island.Ore.Nickel +
          '&entry.1543313292=' + island.Ore.Silver +
          '&entry.1033931997=' + island.Ore.Steel +
          '&entry.1695959979=' + island.Ore.Tin +
          '&entry.2020020197=' + island.Ore.Titanium +
          '&entry.1491142433=' + island.Ore.Tungsten;

        popup = popup + '<a href=\'' + island.Screenshot + '\'  target=\'_blank\'><img src=\'' +
          thumbnail + '\'></a><br>' +
          'Surveyed by: ' + island.Surveyor + '<br>' +
          '<a href="' + formUrl + '" target="_blank">Click here to submit new data for this island.</a>';
        
        marker.bindPopup(popup, {minWidth: '320'});
        zoomedMarker.bindPopup(popup, {minWidth: '320'});
        
        // Add searchable features to the marker
        var feature = marker.feature = marker.feature || {};
        feature.type = feature.type || "Feature"; // Initialize feature.type
        var props = feature.properties = feature.properties || {}; // Initialize feature.properties
        props.name = island.Name;
        props.author = island.Author;
      }
    }
    
    // Load the route data for tracing walls
    // Async Load and read the csv file
    // For mapping walls only, disable for public build
    if (debug) {
      poiLayers.pointLayer.addTo(map);
      $.ajax({
        url: 'data/route_data.csv',
       type: 'GET',
        cache: false,
        success: function (text) {
          var data = $.csv.toArrays(text);
          onRouteDataLoaded(data);
        }
      });
    }
  }

  function onRouteDataLoaded(data) {
    // Render all walls
    for (var i = 1; i < data.length-1; i++) {
      if (data[i][1] !== '') {
        var wall = {};
        // Timestamp, x, y, z
        wall.P1 = [Number(data[i][3]), Number(data[i][1])];
        wall.P2 = [Number(data[i + 1][3]), Number(data[i + 1][1])];
        var distanse = Math.hypot(wall.P1[0] - wall.P2[0], wall.P1[1] - wall.P2[1]);
        if (distanse < 1000) {
          // Set the colors of the marker
          var options = settings.wallOptions;
          options.color = '#FF0000';

          // Create and add the marker to the island layer
          var marker = new L.polyline([wall.P1, wall.P2], options)
            .addTo(poiLayers.routeLayer);
        }
      }
    }
  }

  // Two separate events for zooming:
  // ZoomAnim fires at the start and lists the target zoom level
  // Hide the old layers here
  // ZoomEnd fires at the end, display the new layers here
  function onZoomAnim(e) {
    prevZoom = map.getZoom();
    var nextZoom = e.zoom;
    console.log('Zoomed from:' + prevZoom + ' to: ' + nextZoom);
    if (nextZoom > -4 && prevZoom <= -4) {
      // if zoomed in to the max display island screenshots instead of markers
      map.removeLayer(poiLayers.islandLayer);
    }
    else if (nextZoom <= -4 && prevZoom > -4) {
      // switch back to circle markers
      map.removeLayer(poiLayers.zoomedIslandLayer);
    }
    else if (nextZoom === -6 && prevZoom > -6) {
      // switch to zone name display
      map.removeLayer(poiLayers.islandLayer);
    }
    else if (nextZoom > -6 && prevZoom === -6) {
      // switch to island display
      map.removeLayer(poiLayers.zoneLayer);
    }
  }

  function onZoomEnd(e) {
    var nextZoom = map.getZoom();
    console.log('Zoom ended from:' + prevZoom + ' to: ' + nextZoom);
    if (nextZoom > -4 && prevZoom <= -4) {
      // if zoomed in to the max display island screenshots instead of markers
      map.addLayer(poiLayers.zoomedIslandLayer);
    }
    else if (nextZoom <= -4 && prevZoom > -4) {
      // switch back to circle markers
      map.addLayer(poiLayers.islandLayer);
    }
    else if (nextZoom === -6 && prevZoom > -6) {
      // switch to zone name display
      map.addLayer(poiLayers.zoneLayer);
    }
    else if (nextZoom > -6 && prevZoom === -6) {
      // switch to island display
      map.addLayer(poiLayers.islandLayer);
    }
  }

  // RGB helper functions
  function rgb(rgbarray) {
    rgbarray[0] = Math.floor(rgbarray[0]);
    rgbarray[1] = Math.floor(rgbarray[1]);
    rgbarray[2] = Math.floor(rgbarray[2]);
    var rgbstring = '#' + ((1 << 24) + (rgbarray[0] << 16) + (rgbarray[1] << 8)
      + rgbarray[2]).toString(16).slice(1);
    return rgbstring;
  }

  function ShadeRgb(color) {
    var shade = [];
    for (var i = 0; i < color.length; i++)
      shade[i] = color[i] * settings.shadingFactor;
    return shade;
  }

  function TintRgb(color) {
    var tint = [];
    for (var i = 0; i < color.length; i++)
      tint[i] = color[i] + ((255 - color[i]) * settings.shadingFactor);
    return tint;
  }

  // Start the app
  init();

  return {
      // Pass on any pubic function here
  };
}());