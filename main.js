var MapMaker = (function () {
  'use strict';

  var settings = {};
  var map = {};
  var poiLayers = {};
  var wasZoomedIn = false;

  function init() {
    // Create the map container
    map = L.map('mapid', {
      crs: L.CRS.Simple,
      minZoom: -6,
	  maxZoom: -3
    });
	
	// Set the renderer to render beyond the viewport to prevent weird half rendered polygons
	map.getRenderer(map).options.padding = 100;

    // Async load the settings file
    $.ajax({
      dataType: "json",
      url: "data/settings.json",
      cache: false,
      success: onSettingsLoaded,
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }

  function onSettingsLoaded(data) {
    settings = data;
	
	// Prepare the map layers

    var bounds = [[settings.minY, settings.minX], [settings.maxY, settings.maxX]];
    map.fitBounds(bounds);
	var maxBounds = [[settings.minY - 25000, settings.minX - 25000], 
					[settings.maxY + 25000, settings.maxX + 25000]];
	map.setMaxBounds(maxBounds);
	// L.imageOverlay("img/DocMap.png", bounds).addTo(map);
	
	map.on("zoomend", onZoomEnd);

	poiLayers.sectorLayer = new L.LayerGroup();
	poiLayers.sectorLayer.addTo(map);
	poiLayers.wallLayer = new L.LayerGroup();
	poiLayers.wallLayer.addTo(map);
	poiLayers.islandLayer = new L.LayerGroup();
    poiLayers.islandLayer.addTo(map);
	poiLayers.zoomedIslandLayer = new L.LayerGroup();
	// Zoomed layer is hidden at first
	
	L.control.mousePosition({separator: ",", lngFirst: true}).addTo(map);

	// Load the sector data
    // Async Load and read the csv file
    $.ajax({
      url: "data/sector_data.csv",
      type: "GET",
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text)
        onSectorDataLoaded(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }

  function onSectorDataLoaded(data) {
	// Render all walls
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "") {
		var sector = {}
		// Sector, Region, Tier, X1, Z1, X2, Z2, X3, Z3, X4, Z4, X5, Z5														
		sector.Sector = data[i][0];
		sector.Region = data[i][1];
		sector.Tier = Number(data[i][2]);
		sector.Pos = [];
		for (var j = 3; j < 17; j=j+2) {
			if(data[i][j] !== "") {
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
		var labelIcon = new L.divIcon({html: sector.Sector, className: "sector-label sector-label-"+sector.Tier});
		var labelPos = marker.getBounds().getCenter();
		options = settings.sectorLabelOptions;
		options.icon = labelIcon;
		var label = new L.Marker(labelPos,options).addTo(poiLayers.sectorLayer);
      }
    }
	
	poiLayers.sectorLayer.setZIndex(-100);

	
	// Load the wall data
    // Async Load and read the csv file
    $.ajax({
      url: "data/wall_data.csv",
      type: "GET",
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text)
        onWallDataLoaded(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
  
  function onWallDataLoaded(data) {
    // Render all walls
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "") {
		var wall = {}
		// Tier,X1,Z1,X2,Z2,Sector
		wall.Tier = Number(data[i][0]);
		wall.X1 = Number(data[i][1]);
		wall.Y1 = Number(data[i][2]);
		wall.X2 = Number(data[i][3]);
		wall.Y2 = Number(data[i][4]);
		
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
      url: "data/island_data.csv",
      type: "GET",
      cache: false,
      success: function (text) {
        var data = $.csv.toArrays(text)
        onIslandDataLoaded(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
  
  function onIslandDataLoaded(data) {
    // Render all islands
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "") {
		var island = {}
		island.Id = data[i][0];
		island.Name = data[i][1];
		island.Author = data[i][2];
		island.Sector = data[i][3];
		island.Tier = Number(data[i][4]);
		// island.Screenshot = data[i][5];
		// Mapping to 2d plane, so X = X, Y = Height (used for coloring), Z = Y
        island.X = Number(data[i][6]);
        island.Height = Number(data[i][7]);
		island.Y = Number(data[i][8]);
		island.Databanks = Number(data[i][9]);
		
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
		
		island.Screenshot = "img/" + island.Id + ".jpg"
		
		// Create and add the marker to the zoomed island layer
		var myIcon = L.icon({
			iconUrl: island.Screenshot.replace(".jpg","s.jpg"),
			iconSize: [90,90]
		});
		var zoomedMarker = L.marker([island.Y, island.X], {icon: myIcon})
			.addTo(poiLayers.zoomedIslandLayer);
		
		// Create the popup that will appear when clicked
		// adding m to an imgur link creates a medium thumbnail 320 width
		var thumbnail = island.Screenshot.replace(".jpg","m.jpg");
		var popup = "<b>" + island.Name + "</b><br>" + 
					"By: " + island.Author + "<br>" +
					"Databanks: " + island.Databanks + "<br>" +
					"<a href=\"" + island.Screenshot + "\"  target=\"_blank\"><img src=\"" + thumbnail + "\"></a>"
		marker.bindPopup(popup, {minWidth: "320"});
		zoomedMarker.bindPopup(popup, {minWidth: "320"});
      }
    }
  }
  
  function onZoomEnd(e) {
	if (map.getZoom() > -4 && !wasZoomedIn) {
		// if zoomed in to the max display island screenshots instead of markers
		wasZoomedIn = true;
		map.removeLayer(poiLayers.islandLayer);
		map.addLayer(poiLayers.zoomedIslandLayer);
	}
	else if (map.getZoom() < -3 && wasZoomedIn) {
		// switch back to circle markers
		wasZoomedIn = false;
		map.removeLayer(poiLayers.zoomedIslandLayer);
		map.addLayer(poiLayers.islandLayer);
	}
  }

  // RGB helper functions
  function rgb(rgbarray) {
    rgbarray[0] = Math.floor(rgbarray[0]);
    rgbarray[1] = Math.floor(rgbarray[1]);
    rgbarray[2] = Math.floor(rgbarray[2]);
    var rgbstring = "#" + ((1 << 24) + (rgbarray[0] << 16) + (rgbarray[1] << 8)
      + rgbarray[2]).toString(16).slice(1);
    return rgbstring;
  }

  function ShadeRgb(color) {
    var shade = []
    for (var i = 0; i < color.length; i++)
      shade[i] = color[i] * settings.shadingFactor;
    return shade;
  }

  function TintRgb(color) {
    var tint = []
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