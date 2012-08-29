function(doc) {
    if (doc.type == 'author') {
        emit(doc.nic, null); 
    }
}
