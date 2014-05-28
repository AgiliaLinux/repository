
var express = require('express')
var path = require('path')
var _ = require('underscore')
var context = require('./context')
var List = require('./classes/List').ListRoute


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
			res.render(template, _.extend(context, {REQUEST: req}, data))
		}).catch(function(error) {
			res.status(500)
			res.render('500.html', {error: error})
		})
	})
}

function default_route(req, res, next){
	res.status(404)
	if (req.accepts('html'))
		res.render('404.html', _.extend(context, {REQUEST: req, url: req.url }))
	else if (req.accepts('json'))
		res.send({ error: req.gettext('Not found') })
	else
		res.type('txt').send(req.gettext('Not found'))
}


var urls_map = {
	'(?:/repo/:repository)?(?:/limit/:limit)?/:page?':
		['list.html', List, {type: 1}],
}

function init(app) {


	app.use('/static', express.static(path.join(__dirname, '..', 'templates', 'static')))
	app.param(process_param);
	app.param('page', /^\d+$/, 1)
	app.param('limit', /^\d+$/)

	for (var url in urls_map)
		bind_url(app, url, urls_map[url])

	app.use(default_route)
}

module.exports = {
	init: init
}
