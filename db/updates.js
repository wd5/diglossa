{
    "hello" : "function(doc, req) {
if (!doc) {
if (req.id) {
return [{
_id : req.id
}, 'New World']
}
return [null, 'Empty World'];
}
doc.world = 'hello';
doc.edited_by = req.userCtx;
return [doc, 'hello doc'];
},

"bump-counter" : "function(doc, req) {
    if (!doc.counter) doc.counter = 0;
    doc.counter += 1;
    var message = '<h1>bumped it!</h1>';
    return [doc, message];
}"
}