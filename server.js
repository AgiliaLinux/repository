
var port = 3000;
var nunjucks = require('nunjucks')
var express = require('express')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
//var csrf = require('csurf')
var i18n = require('i18n-abide')
var reverser = require('urlreverser').nunjucks
var routes = require('./routes')

var template_filters = require('./routes/filters')
var app = express();

// Localization
app.use(i18n.abide({
	supported_languages: ['en_US', 'ru',],
	default_lang: "en_US",
	translation_directory: "templates/static/i18n",
}))

// Templates setup
var env = nunjucks.configure('templates', { autoescape: true, express: app})
template_filters.init(env)
reverser(env)

// Core
app.use(cookieParser())
app.use(bodyParser())
// app.use(csrf())

// Routes setup
routes.init(app)

app.listen(port);
console.log('Server started on port %s', port);
