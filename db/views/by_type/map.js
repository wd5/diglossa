function(doc) {
    if (doc.type == 'author') {
        emit(doc.nic, null); 
    }
//  emit([doc.type, doc.updated_at], doc._id);
}
