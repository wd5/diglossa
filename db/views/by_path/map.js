function(doc) {
    if (doc.type == 'text') {
      emit(doc.path, {nic: doc.nic, name: doc.name, html: doc.html, lang:doc.lang}); 
    }
}
