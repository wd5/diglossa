function(doc) {
    if (doc.type == 'text') {
      emit([doc.url, doc.pos], null); 
    }
}
