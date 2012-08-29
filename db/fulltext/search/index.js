function(doc) { 
  //if (doc.type != "text") return null;
  if (!doc.text) return null;
  var res = new Document();
  res.add(doc.text,{field:'text', store:'yes'});
  res.add(doc.url, {field:'url', index:'not_analyzed', store:'yes'});
  //res.add(doc.nic, {field:'nic', index:'not_analyzed', store:'yes'});
  res.add(doc.nic, {field:'nic', store:'yes'});
  res.add(doc.lang, {field:'lang', index:'not_analyzed', store:'yes'});
  res.add(doc.pos, {field:'pos', index:'not_analyzed', store:'yes'});
  return res;
 }