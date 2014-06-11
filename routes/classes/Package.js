
var Base = require('./Base.js').BaseRoute
var Package = require('../../core/package').Package
var mongo = require('../../core/mongo').adapter
var settings = require('../../settings')
var _ = require('underscore')
var when = require('when')

var build_tree_location = 'usr/src/BuildTrees/'
var build_tree_re = new RegExp(build_tree_location + '.*build_tree.tar.xz')

function PackageRoute(options) {
	Base.call(this, options)
	this.options.url = 'pkgview'
}

PackageRoute.prototype = Base.prototype
PackageRoute.prototype.constructor = PackageRoute

PackageRoute.prototype.render = function(req) {
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
						abuild = files[i]
						break
					}

					var pkg = _.extend(package.data(), {
						info: info,
						files: files,
						abuild: {
							path: abuild,
							filename: abuild.replace(build_tree_location, '')
						},
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
}

PackageRoute.prototype.get_package = function(req) {
	var md5 = req.param('md5', 1)
	var condition = {}
	return Package(md5)
}

module.exports = {
	PackageRoute: PackageRoute
}