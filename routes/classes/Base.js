
var when = require('when')

base_route = {
	render: function(request) {
		return when({})
	}
}

var BaseRoute = function() { }
BaseRoute.prototype = base_route


module.exports = {
	BaseRoute: BaseRoute
}
