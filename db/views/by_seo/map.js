function(doc) {
  if (doc.type == 'text') {
    var split = doc.url.split('/');
    emit([split[0], split[1], split[2]], null); 
  }
}
