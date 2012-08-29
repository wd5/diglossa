function(doc) {
  if (doc.type == 'text') {
    var split = doc.url.split('/');
    var root = split[0] + '/' + split[1];
    emit(root, null); 
  }
}
