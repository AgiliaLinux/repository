
var Base = require('./Base.js').BaseRoute
var mongo = require('../../core/mongo').adapter
var when = require('when')

var render_types = ['Simple', 'Complex']

var list_route = {
	render: function(req) {
		var self = this
		return when.promise(function(resolve, reject) {
			return self.get_packages(req).then(function (packages) {
				return resolve({
					render_type: render_types[self.options.type],
					packages: packages.items,
					count: packages.count,
					pages: {
						// TODO: link
						link: '/',
						count: packages.count / req.param('limit', 50) + 1,
						current: req.param('page', 1)
					}
				})
			}).catch(reject)
		})
	},

	get_packages: function(req) {
		var page = req.param('page', 1)
		var limit = req.param('limit', 50)
		var offset = (page - 1) * limit
		var condition = {}
		return mongo.connection.then(function(db){
			return when.promise(function(resolve, reject) {
				return db.collection('packages', function(err, packages){
					if (err)
						return reject(err)
					var cursor = packages.find(condition)
						.limit(limit).skip(offset).sort({add_date: -1})
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
}

function List(options) {
	this.options = options
}

list_route.prototype = Base
List.prototype = list_route

module.exports = {
	ListRoute: List
}