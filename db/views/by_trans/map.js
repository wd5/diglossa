function(doc) {
    if (doc.type == 'i18n') {
        emit(doc.code, null); 
    }
}
