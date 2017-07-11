L.Control.Watermark = L.Control.extend({
  options: {
    image: 'img/logo.png',
    width: '200px',
    url: false
  },

  onAdd: function(map) {
    var options = this.options;
    var img = L.DomUtil.create('img');
    var container = img;

    img.src = options.image
    img.style.width = options.width
    
    
    if(options.url) {
      container = L.DomUtil.create('a');
      container.href = options.url;
      container.target = '_blank';
      container.appendChild(img);
    }

  return container;
  },

  onRemove: function(map) {
    // Nothing to do here
  },
});

L.control.watermark = function(options) {
  return new L.Control.Watermark(options);
}
	