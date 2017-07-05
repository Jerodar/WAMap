L.Control.Select = {};
L.Control.entries = {};

L.Control.Select = L.Control.extend({
  options: {
    position: 'topright',
    title: '',
    exclude: [],
    include: [],
    entries: L.Control.Select.entries,
    initial: -1
  },
  onAdd: function(map) {
    this.div = L.DomUtil.create('div','leaflet-select-container');
    this.select = L.DomUtil.create('select','leaflet-select',this.div);
    var content = '';
    
    if (this.options.title.length > 0 ){
      content += '<option>'+this.options.title+'</option>';
    }
    
    var entries = (Array.isArray(this.options.include) && this.options.include.length > 0) ? this.options.include : this.options.entries;

    var entryKeys = Object.keys(entries);
    for (i in entryKeys){
      if (this.options.exclude.indexOf(entryKeys[i]) == -1){
          content+='<option>'+entryKeys[i]+'</option>';
      }
    }
    
    this.select.innerHTML = content;
    
    this.select.onmousedown = L.DomEvent.stopPropagation;
    
    L.DomEvent.disableClickPropagation(this.div);
    
    return this.div;
  },
  on: function(type,handler){
    if (type == 'change'){
      this.onChange = handler;
      L.DomEvent.addListener(this.select,'change',this._onChange,this);      
    } else if (type == 'click'){ //don't need this here probably, but for convenience?
      this.onClick = handler;
      L.DomEvent.addListener(this.select,'click',this.onClick,this);      
    } else {
      console.log('LeafletSelect - cannot handle '+type+' events.')
    }
  },
  _onChange: function(e) {
    var selectedEntry = this.select.options[this.select.selectedIndex].value;
    e.feature = this.options.entries[selectedEntry];
    this.onChange(e);
  }
});

L.control.select = function(id,options){
  return new L.Control.Select(id,options);
};