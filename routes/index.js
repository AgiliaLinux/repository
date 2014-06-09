
var express = require('express')
var path = require('path')
var _ = require('underscore')
var context = require('./context')
var auth = require('./auth')
var misc_routes = require('./misc')
var List = require('./classes/List').ListRoute
var PackageRoute = require('./classes/Package').PackageRoute


function process_param(name, fn, dflt){
	if (fn instanceof RegExp) {
		return function(req, res, next, val){
			var captures
			if (captures = fn.exec(String(val))) {
				req.params[name] = captures
				next()
			} else {
				if (dflt)
					req.params[name] = dflt
				next('route')
			}
		}
	}
}

function bind_url(app, url, params) {
	var template = params[0],
		renderer_class = params[1],
		render_opts = params[2]

	var Renderer = new renderer_class(render_opts || {})
	app.get(url, function(req, res) {
		Renderer.render(req).then(function(data, status) {
			res.status(status || 200)
			res.render_context(template, data)
		}).catch(function(error) {
			res.status(500)
			res.render_context('500.html', {error: error})
		})
	})
}

function default_route(req, res, next){
	res.status(404)
	if (req.accepts('html'))
		res.render_context('404.html', {url: req.url })
	else if (req.accepts('json'))
		res.send({ error: req.gettext('Not found') })
	else
		res.type('txt').send(req.gettext('Not found'))
}


var urls_map = {
	'(?:/repo/:repository)?(?:/limit/:limit)?/:page?':
		['list.html', List, {title: 'Package list', type: 1}],
	'/pkgview/:md5': ['package_details.html', PackageRoute],
}

function init(app) {
	app.use('/static', express.static(path.join(__dirname, '..', 'templates', 'static')))
	app.param(process_param);
	app.param('page', /^\d+$/, 1)
	app.param('limit', /^\d+$/)

	// Context
	app.use(function(req, res, next) {
		res.context = {}
		res.render_context = function(template, data) {
			var context_data = _.extend(context, res.context,
				{REQUEST: req, user: req.user}, data)
			res.render(template, context_data)
		}
		next()
	})

	// Routes
	auth.init(app)
	misc_routes.init(app)

	for (var url in urls_map)
		bind_url(app, url, urls_map[url])

	app.use(default_route)
}

module.exports = {
	init: init
}
