var MapMaker = (function () {
  'use strict';

  var settings = {};
  var map = {};
  var poiLayers = {};
  var prevZoom = -6;
  var selectedServer = 1;

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
    
    // Check if the URL or cooky has a server preference
    var urlVars = getUrlVars();
    // First check url get parameters
    if(urlVars["server"] === "euwuse") {
      selectedServer = 2;
    } else if(urlVars["server"] === "eueusw") {
      selectedServer = 1;
    }
    else {
    // Then check the cookies
      // Check if there is a cookie to read
      var allcookies = document.cookie;
       
       // Get all the cookies pairs in an array
       var cookiearray = allcookies.split(';');
       
       // Now take key value pair out of this array
       for(var i=0; i<cookiearray.length; i++){
          var name = cookiearray[i].split('=')[0];
          if (name === 'server') {
            var value = cookiearray[i].split('=')[1];
            selectedServer = Number(value);
          }
       }
    }
    
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
    map.on('zoomend', onZoomEnd);
    
    // L.imageOverlay('img/map.png', bounds).addTo(map);
    
    // Add the various layergroups
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
    
    // Server selection dropbox
    var select = L.control.select({entries: settings.servers}).addTo(map);
    select.on('change', onSelectChange);
    $('.leaflet-select').prop( 'selectedIndex', selectedServer - 1 );
    
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
    
    // Async load the zone data file
    $.ajax({
      dataType: 'json',
      url: 'data/' + selectedServer + '/zone_data.json',
      cache: false,
      success: onZoneDataLoaded,
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
      url: 'data/' + selectedServer + '/sector_data.csv',
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
        // Sector, Region, Tier, X1, Z1, X2, Z2, X3, Z3, X4, Z4, X5, Z5
        sector.Sector = data[i][0];
        sector.Region = data[i][1];
        sector.Tier = Number(data[i][2]);
        sector.Pos = [];
        for (var j = 3; j < 17; j=j+2) {
            if(data[i][j] !== '') {
                sector.Pos.push([Number(data[i][j+1]),Number(data[i][j])]);
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
        var point = map.latLngToContainerPoint(labelPos);
        point = L.point([point.x - 10, point.y - 10]);
        labelPos = map.containerPointToLatLng(point);
        options = settings.sectorLabelOptions;
        options.icon = labelIcon;
        var label = new L.Marker(labelPos,options).addTo(poiLayers.sectorNameLayer);
      }
    }
    
    poiLayers.sectorNameLayer.setZIndex(-100);

    
    // Load the wall data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/' + selectedServer + '/wall_data.csv',
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
        // Tier,X1,Z1,X2,Z2,Sector
        wall.Tier = Number(data[i][1]);
        wall.X1 = Number(data[i][2]);
        wall.Y1 = Number(data[i][3]);
        wall.X2 = Number(data[i][4]);
        wall.Y2 = Number(data[i][5]);
        
        // Set the colors of the marker
        var color = settings.colors.walls[wall.Tier];
        var options = settings.wallOptions;
        options.color = rgb(color);
        
        // Create and add the marker to the island layer
        var marker = new L.polyline([[wall.Y1, wall.X1],[wall.Y2, wall.X2]], options)
            .addTo(poiLayers.wallLayer);
      }
    }
    
    // Load the POI data
    // Async Load and read the csv file
    $.ajax({
      url: 'data/' + selectedServer + '/island_data.csv',
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
        island.Id = data[i][0];
        island.Name = data[i][1];
        island.Author = data[i][2];
        island.Sector = data[i][3];
        island.Tier = Number(data[i][4]);
        // island.Screenshot = data[i][5];
        // Mapping to 2d plane, so X = X, Y = Height (used for coloring), Z = Y
        island.X = Number(data[i][6]);
        island.Height = Number(data[i][7]) + settings.ZtoAltitude;
        island.Y = Number(data[i][8]);
        island.Databanks = Number(data[i][9]);
        island.Respawner = data[i][10];
        island.Trees = data[i][11];
        island.Surveyor = data[i][12];
        
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
        
        island.Screenshot = 'img/' + island.Id + '.jpg';
        
        // Create and add the marker to the zoomed island layer
        var myIcon = L.icon({
          iconUrl: island.Screenshot.replace('.jpg','s.jpg'),
          iconSize: [90,90]
        });
        var zoomedMarker = L.marker([island.Y, island.X], {icon: myIcon})
          .addTo(poiLayers.zoomedIslandLayer);
        
        // Create the popup that will appear when clicked
        // adding m to an imgur link creates a medium thumbnail 320 width
        var thumbnail = island.Screenshot.replace('.jpg','m.jpg');
        var respawnString = '';
        if (island.Respawner === 'Yes') {
          respawnString = 'Has respawners.<br>';
        }
        var popup = '<b>' + island.Name + '</b><br>' +
          'By: ' + island.Author + '<br>' +
          'Databanks: ' + island.Databanks + ', Sector: ' + island.Sector +
          ', Altitude: ' + island.Height + '<br>' +
          respawnString +
          '<a href=\'' + island.Screenshot + '\'  target=\'_blank\'><img src=\'' +
          thumbnail + '\'></a><br>' +
          'Surveyed by: ' + island.Surveyor;
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
  }
  
  function onZoomEnd(e) {
    var nextZoom = map.getZoom();
    console.log('Zoomed to: ' + nextZoom);
    if (nextZoom > -4 && prevZoom <= -4) {
      // if zoomed in to the max display island screenshots instead of markers
      map.removeLayer(poiLayers.islandLayer);
      map.addLayer(poiLayers.zoomedIslandLayer);
    }
    else if (nextZoom <= -4 && prevZoom > -4) {
      // switch back to circle markers
      map.removeLayer(poiLayers.zoomedIslandLayer);
      map.addLayer(poiLayers.islandLayer);
    }
    else if (nextZoom === -6 && prevZoom > -6) {
      // switch to zone name display
      map.removeLayer(poiLayers.islandLayer);
      map.addLayer(poiLayers.zoneLayer);
    }
    else if (nextZoom > -6 && prevZoom === -6) {
      // switch to island display
      map.removeLayer(poiLayers.zoneLayer);
      map.addLayer(poiLayers.islandLayer);
    }
    prevZoom = nextZoom;
  }
  
  function onSelectChange(e) {
    console.log('Selected option: ' + e.feature);
    changeServerMap(e.feature);
  }
  
  function changeServerMap(server) {
    if(selectedServer !== server) {
      for (var layer in poiLayers) {
        poiLayers[layer].clearLayers();
      }
      
      selectedServer = server;
      
      // Write a cooky to store preference
      var d = new Date();
      d.setTime(d.getTime() + (360 * 24 * 60 * 60 * 1000));
      document.cookie='server=' + selectedServer + ';expires=' + d.toUTCString() + ';';
      
      // Async load the zone data file
      $.ajax({
        dataType: 'json',
        url: 'data/' + selectedServer + '/zone_data.json',
        cache: false,
        success: onZoneDataLoaded,
        error: function (jqXHR, textStatus, errorThrown) {
          console.error(errorThrown);
        }
      });
    }
  }

  // Retrieve Html GET parameters
  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
    function(m,key,value) {
      vars[key] = value;
    });
    return vars;
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