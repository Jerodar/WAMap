L.Control.Watermark = L.Control.extend({
  options: {
    image: 'img/logo.png',
    width: '200px'
  },

  onAdd: function(map) {
    var options = this.options;
    var img = L.DomUtil.create('img');

    img.src = options.image
    img.style.width = options.width

  return img;
  },

  onRemove: function(map) {
    // Nothing to do here
  }
});

L.control.watermark = function(options) {
  return new L.Control.Watermark(options);
}
	