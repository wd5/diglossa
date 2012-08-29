function(doc, req) {

  var map = doc.sitemap;
  var now = new Date();
  var date = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate(); // here month = 0 :(
  var date = "2012-01-02";
  var xml = '<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'; // \

    for (var k in map){
      xml +=  '<url><loc>' + map[k] + '</loc>';
      xml +=  '<lastmod>' + date + '</lastmod><changefreq>monthly</changefreq></url>';
    }
 
  xml += '</urlset>';

  return {
    body : xml, 
    headers : {
      "Content-Type" : "application/xml"
    }
  }

  function inspect(object){
    var result = '';
    for (var key in object){
      result += key + ': ' + object[key] + '\n';
    }
    return result;
  }
}
