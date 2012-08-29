var Remote = function(app) {
  
  var store = new Sammy.Store({name: 'dig', type: 'local'});

  this.helpers({
    // FIXME - ой
    getCouch: function(name, path, callback) {
      var stored = store.fetch(name, function() {
        path = path.replace('#!/', '');
        store.load(name, path, function(stored) {callback($.parseJSON(stored));});
      });
      if (typeof(stored) != 'undefined') {callback(stored);}
    },

    getTemplate: function(name, tpl, callback) {
      tpl = '/templates/' + tpl;
      var stored = store.fetch(name, function() {
        store.load(name, tpl, function(stored) {callback(stored);});
      });
      if (typeof(stored) != 'undefined') {callback(stored);}
    },

    getRemote: function(view, path, callback){
      var query = '/'+view+'?key="'+path+'"&include_docs=true'
      query = query.replace('!/', '');
      //console.log('before ajax call: ' + query);
      $.getJSON(query, function(data){
        //console.log('ajax data: ' + inspect(data.rows));
        callback(data.rows);
      });
    },

    getParagraphs: function(path, startkey, endkey, callback){ 
      var hash = {'startkey': [path, 0], 'endkey':[path, endkey]};
      var jsdata = encodeOptions(hash);
      var query = '/by_page/'; 

      $.getJSON(query, jsdata, function(data){
        var docs = _.pluck(data.rows, 'doc');
        callback(docs);
      });
    },

    pingCounter: function(obj){
      $.ajax({
        type: 'POST',
        url: '/counter', 
        data: JSON.stringify(obj), 
        dataType: 'json',
        contentType: 'application/json' //,
        // success: function(msg) {
        //   console.log( "ping saved: " + msg );
        // },
        // error: function(msg) {
        //   console.log( "ping error: "+msg);
        // }
      });
    },

    getWordForms: function(obj, callback){
      $.ajax({
        type: 'POST',
        url: '/by_forms',  // i.e. /latin-forms/_design/latin-forms/_list/sentence/by_all_forms
        data: JSON.stringify(obj), 
        dataType: 'json',
        contentType: 'application/json', //
        success: function(resp) {
          //console.log( "several forms values: " + inspect(resp["rows"][0])); 
          callback(resp["rows"]);
        },
        error: function(msg) {
          //console.log( "ping error: "+msg);
        }
      });
    },

    getSearch: function(query, callback){
      $.ajax({
        type: 'GET',
        url: '/diglossa/_fti/_design/diglossa/search?q=' + query + '&callback=?',
        dataType: 'jsonp',
        success: function(resp) {
          callback(resp.rows);
        },
        error: function(msg) {
          console.log( "search error: "+msg);
        }
      });
    },

    getDicts: function(obj, callback){
      $.ajax({
        type: 'POST',
        url: '/by_dict', // i.e. /latin/_design/latin/_view/by_dict
        data: JSON.stringify(obj), 
        dataType: 'json',
        contentType: 'application/json', //
        success: function(resp) {
          var docs = _.pluck(resp.rows, 'doc');
          docs = _.uniq( _.map( docs, function( x ){
            return JSON.stringify( x );
          }));
          docs = _.map(docs, function(doc){return JSON.parse(doc)}) // $.parseJSON(docs); 
          callback(docs);
        },
        error: function(msg) {
          //console.log( "ping error: "+msg);
        }
      });
    }

  });
};



  /**
   * @private
   */
  // Convert a options object to an url query string.
  // ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
  function encodeOptions(options) {
    var buf = [];
    if (typeof(options) === "object" && options !== null) {
      for (var name in options) {
        if ($.inArray(name,
                      ["error", "success", "beforeSuccess", "ajaxStart"]) >= 0)
          continue;
        var value = options[name];
        if ($.inArray(name, ["key", "startkey", "endkey"]) >= 0) {
          value = toJSON(value);
        }
        buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
      }
    }
    return buf.length ? "" + buf.join("&") : ""; // "?" + buf.join("&") : "";
  }

  /**
   * @private
   */
  function toJSON(obj) {
    return obj !== null ? JSON.stringify(obj) : null;
  }

