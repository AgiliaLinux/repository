

var express = require('express');
var app = module.exports = express();
var nunjucks = require('nunjucks');
var List = require('./classes/List').ListRoute

nunjucks.configure('templates', {
	autoescape: true, express: app});
app.use(express.static(__dirname));


var urls = {
	'(?:/limit/:limit)?/:page?': ['index.html', List, {type: 0}]
}

app.param(function(name, fn, dflt){
	if (fn instanceof RegExp) {
		return function(req, res, next, val){
			var captures;
			if (captures = fn.exec(String(val))) {
				req.params[name] = captures;
				next();
			} else {
			if (dflt)
				req.params[name] = dflt;
				next('route');
			}
		}
	}
});

app.param('page', /^\d+$/, 1)
app.param('limit', /^\d+$/)


for (var url in urls) {
	var current = urls[url]
	var template = current[0],
		renderer_class = current[1],
		render_opts = current[2]

	var Renderer = new renderer_class(render_opts || {})
	app.get(url, function(req, res) {
		Renderer.render(req).then(function(data) {
			res.render(template, data)
		}).catch(function(error) {
			res.render('504.html', error)
		})
	})
}


