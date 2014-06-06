
var Base = require('./Base.js').BaseRoute
var Package = require('../../core/package').Package
var mongo = require('../../core/mongo').adapter
var settings = require('../../settings')
var _ = require('underscore')
var when = require('when')

var build_tree_location = 'usr/src/BuildTrees/'
var build_tree_re = new RegExp(build_tree_location + '.*build_tree.tar.xz')

var package_route = {
	render: function(req) {
		var self = this
		return when.promise(function(resolve, reject) {
			return self.get_package(req).then(function(package) {
				return package.packageFiles().then(function(filelist) {
					return package.altVersions().then(function(altversions) {
						var annotation = package.annotation()
						var info = {}
						for (var k in annotation)
							info[annotation[k]] = package[k]
						var files = filelist.files
						var abuild = null;
						for (var i = 0; i < files.length; ++i) {
							if (!build_tree_re.test(files[i]))
								continue
							abuild = files[i].replace(build_tree_location, '')
							break
						}

						var pkg = _.extend(package.data(), {
							info: info,
							files: files,
							abuild: abuild,
							altversions: altversions
						})
						return resolve({
							title: 'Package ' + package.name,
							package: pkg,
						})
					})
				}).catch(reject)
			}).catch(reject)
		})
	},

	get_package: function(req) {
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