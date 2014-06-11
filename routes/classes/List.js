
var Base = require('./Base.js').BaseRoute
var mongo = require('../../core/mongo').adapter
var settings = require('../../settings')
var _ = require('underscore')

var when = require('when')

var render_types = [
	{ name: 'Simple', template: 'package_link.html'},
	{ name: 'Complex', template: 'package_short.html'}
]

function List(options) {
	Base.call(this, options)
	this.options.url = 'browser'
	var rparams = ['repository', 'os', 'branch', 'subgroup']
	this.options.request_params = rparams
	this.options.url_params = _.union(rparams, ['limit'])
}

List.prototype = new Base()
List.prototype.constructor = List

List.prototype.render = function(req) {
	var self = this
	var params = this.get_params(req, {page: 1, limit: 50})
	return when.promise(function(resolve, reject) {
		return when.join(self.get_packages(req, params),
				self.get_repository(req, params)).then(function(values){
			var packages = values[0]
			var repository = values[1]
			return resolve({
				title: self.options.title,
				repository: repository,
				render_type: render_types[self.options.type],
				packages: packages.items,
				count: packages.count,
				pages: {
					link: self.reverse_url(req, params),
					count: packages.count / params.limit + 1,
					current: params.page
				}
			})
		}).catch(reject)
	})
}

List.prototype.get_packages = function(req, params) {
	var limit = params.limit
	var offset = (params.page - 1) * limit
	var condition = {}
	var mongo_params = this.options.request_params
	for (var i = 0; i < mongo_params.length; ++i){
		var pname = mongo_params[i]
		if (params[pname])
			condition['repositories.' + pname] = params[pname]
	}

	return mongo.connection.then(function(db){
		return when.promise(function(resolve, reject) {
			return db.collection('packages', function(err, packages){
				if (err)
					return reject(err)
				var cursor = packages.find(condition).limit(limit)
								.skip(offset).sort({add_date: -1})
				cursor.count(function(err, count) {
					if (err)
						return reject(err)
					cursor.toArray(function(err, items){
						if (err)
							return reject(err)

						return resolve({
							items: items,
							count: count
						})
					})
				})
			})
		})
	})
}

function get_values(values, params, defaults) {
	var data = {}
	for (var i = 0; i < values.length; ++i) {
		var value = values[i]
		data[value] = params[value] || defaults[value]
	}
	return data
}

List.prototype.get_repository = function(req, params) {
	var self = this
	var options = this.options
	var info = get_values(options.request_params, params, settings.repository)
	return when.promise(function(resolve, reject) {
		if (!options.show_repo)
			return resolve(info)
		return resolve(info)
	})
}



module.exports = {
	ListRoute: List
}