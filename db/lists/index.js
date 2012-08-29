function(head, req) {
  
  //var Mustache = require("lib/mustache");
  //var template = require('lib/mustache.couch').compile(this, 'pages');
  //var ddoc = this;

  var row;
  var path_parts = req.path;
  //var template = "<p>tmpl: {{url}}</p>";

  provides("html", function () {

    send('<html>\n<head>\n<title>diglossa</title>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="yandex-verification" content="5d6904e4aafe5908" />\n<link href="/css/diglossa.css" media="screen, projection" rel="stylesheet" type="text/css" />\n<link href="/css/skin-vista/ui.dynatree.css" media="screen, projection" rel="stylesheet" type="text/css" />\n</head>\n <script type="text/javascript">\nvar i_am_not_old_ie = false;\n <!--[if (LT GT  9) | !IE ]>\n  i_am_not_old_ie = true;\n <!--[endif]-->\n </script>\n<body>\n<div class="window closed" id="window"  style="display:none"></div>\n<div id="container" class="init">\n<div id="pages" class="pages">\n');


    var html = {};
    var langs = {};
    while(row = getRow()) {
      if (html[row.doc.nic] == null) html[row.doc.nic] = '';
      html[row.doc.nic] += row.doc.par;
      langs[row.doc.nic] = row.doc.lang;
    }

    var i = 0;
    var zero_nic = "";
    for (var nic in html) {
      zero_nic = nic;
      i++;
    }

    if (i == 1){
      // only translator, no author
      send('<div id="page_0" class="page">\n');
      send('  <div id="header_0" class="header"></div>\n');
      send('  <div id="view_0" class="view" nic="zero" lang="zero">'+html[zero_nic]+'</div>');
      send('</div>\n');
    } else if (i > 1) { i = 0; }

    for (var nic in html) {
      send('<div id="page_'+i+'" class="page">\n');
      send('  <div id="header_'+i+'" class="header"></div>\n');
      send('  <div id="view_'+i+'" class="view" nic="'+nic+'" lang="'+langs[nic]+'">'+html[nic]+'</div>');
      send('</div>\n');
      i++;
    }

    return '</div>\n</div>\n<script src="/js/default.js" type="text/javascript" charset="utf-8">\n</script></body>\n</html>\n';

});

  function inspect(object){
    var result = '';
    for (var key in object){
      result += key + ': ' + object[key] + '\n';
    }
    return result;
  }

}