function(doc) {
    if (doc.type == 'lang') {
        emit(doc.code, null); 
    }
}
