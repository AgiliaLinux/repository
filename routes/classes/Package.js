
var Base = require('./Base.js').BaseRoute
var Package = require('../../core/package')
var mongo = require('../../core/mongo').adapter
var settings = require('../../settings')
var when = require('when')


var package_route = {
	render: function(req) {
		var self = this
		return when.promise(function(resolve, reject) {
			return self.get_package(req).then(function (package) {
				return resolve({
					title: 'Package ' + package.name,
					package: package,
				})
			}).catch(reject)
		})
	},

	get_packages: function(req) {
		var md5 = req.param('md5', 1)
		var condition = {}
		return Package(md5)
	}
}

function PackageRoute(options) {
	this.options = options
}

package_route.prototype = Base
PackageRoute.prototype = package_route

module.exports = {
	PackageRoute: PackageRoute
}