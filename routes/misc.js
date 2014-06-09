
var mongo = require('../core/mongo').adapter

function footer(req, res, next) {
	return mongo.connection.then(function(db) {
		var packages = db.collection('packages')
		return packages.count(function (err, count){
			if (err) {
				res.context.footer = {error: err}
				return next()
			}

			return packages.aggregate([
				{'$group': {
					'_id': null, 'compressed_size': {'$sum': '$compressed_size'}
				}}, {'$project': {
					'_id': 0, 'compressed_size': '$compressed_size'
				}}
			], function(err, result) {
				if (err)
					res.context.footer = { error: err }
				else
					res.context.footer = {
						packages_count: count,
						packages_size: result[0].compressed_size || 0
					}
				return next()
			})
		})
	})
}


module.exports = {
	init: function(app) {
		app.get('*', footer)
	}
}
