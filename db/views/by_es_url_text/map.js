function(doc) {
  if (doc.type == 'text') {
    var split = doc.url.split('/');
    var root = split[0] + '/' + split[1];
    emit(root, {url:doc.url, pos:doc.pos, lang:doc.lang, nic:doc.nic, text:doc.text}); 
  }
}
