function(doc) {
    if (doc.type == 'par') {
        emit([doc.path, doc.position], null); 
    }
}
