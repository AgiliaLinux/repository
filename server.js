
var port = 3000;
var express = require('express');
var routes = require('./routes');

var app = express();
app.use(routes);


app.listen(port);
console.log('Server started on port %s', port);
