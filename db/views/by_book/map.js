function(doc) {
    if (doc.type == 'book') {
        emit(doc.url, null); 
    }
}
