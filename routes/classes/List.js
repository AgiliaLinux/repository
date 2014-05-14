
var Base = require('./Base.js').BaseRoute
var mongo = require('../../core/mongo').adapter
var when = require('when')

var render_types = ['Simple', 'Complex']

var list_route = {
	render: function(req) {
		var self = this
		return when.promise(function(resolve, reject) {
			return when(self.get_packages(req)).then(function (packages) {
				return resolve(this.target, {
					render_type: render_types[self.options.type],
					packages: packages.items,
					count: packages.count,
					pages: {
						// TODO: link
						link: '/',
						count: packages.count / req.param('limit', 50) + 1,
						current: req.param.page
					}
				})
			}).catch(reject)
		})
	},

	get_packages: function(req) {
		var page = req.param.page
		var limit = req.param('limit', 50)
		var offset = (page - 1) * limit
		return mongo.connection.then(function(db){
			var query = db.packages.find().sort({
				'add_date': -1
			}).skip(offset).limit(limit)
			return {
				items: query,
				count: query.count()
			}
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