
var port = 3000;
var nunjucks = require('nunjucks')
var express = require('express')
var routes = require('./routes')
var template_filters = require('./routes/filters')

var app = express();
var env = nunjucks.configure('templates', { autoescape: true, express: app})
template_filters.init(env)
routes.init(app)

app.listen(port);
console.log('Server started on port %s', port);
