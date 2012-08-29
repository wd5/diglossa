function(doc) {
    if (doc.type == 'text') {
      emit(doc.url, null); 
    }
}
