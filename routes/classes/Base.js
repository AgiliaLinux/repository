
var when = require('when')
var reverse = require('urlreverser').reverse

var BaseRoute = function(options) {
	this.options = options
}

BaseRoute.prototype = {
	render: function(request) {
		return when({})
	},

	get_params: function(req, defaults) {
		var data = {}
		defaults = defaults || {}
		var params = this.options.url_params
		for (var i = 0; i < params.length; ++i) {
			var name = params[i]
			var param = req.param(name, defaults[name])
			if (param)
				data[name] = param
		}
		return data
	},

	reverse_url: function(req, params) {
		var name = this.options.url
		params = params || this.get_params(req)
		return reverse(name, params)
	}
}

module.exports = {
	BaseRoute: BaseRoute
}
