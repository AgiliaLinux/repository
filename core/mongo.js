
var settings = require('../settings')
var mongodb = require('mongodb')
var when = require('when')
var _ = require('underscore')

function MongoAdapter() {
	var self = this
	this._db = null

	this.connection = when.promise(function(resolve, reject) {
		if (self._db)
			return resolve(self._db)
		var client = new mongodb.MongoClient(new mongodb.Server(
				settings.mongodb.host, settings.mongodb.port),
				settings.mongodb.options);
		client.open(function (error, connection) {
			if (error)
				return reject(error)
			var db = connection.db(settings.mongodb.database)
			resolve(self._db = db)
		})
	})

	this.load = function(collection, query){
		return this.connection.then(function(db) {
			return when.promise(function(resolve, reject) {
				db.collection(collection).findOne(query, function(err, item) {
					if (err)
						return reject(err)
					return resolve(item)
				})
			})
		})
	}

	this.save = function(collection, data, search_query, dry_run) {
		return this.connection.then(function(db) {
			var collection = db.collection(collection)
			var orig = collection.findOne(search_query)
			if (_.isEqual(orig, data))
				return

			var changeset = {}
			data.keys().map(function(key) {
				if (orig[key] !== data[key])
					changeset[key] = data[key]
			})

			if (dry_run) {
				console.log(changeset)
				return
			}
			if (!changeset.length)
				return

			var setquery = {'$set': changeset, '$inc': {'_rev': 1}}
			db.collection(collection).findAndModify(search_query, setquery)
		})
	}

	this.generate_chain = function(array, resolve, reject) {
		function resolver(err, result) {
			if(err)
				return reject(err)
			return resolve(result)
		}

		var func = resolver
		for (var i = array.length - 1; i >= 0; --i) {
			func = (function(callback, options){
				var call_opt = options.shift()
				var self = options.shift()
				options.push(callback)
				return function(err, result){
					if(err)
						return reject(err)
					call_opt.apply(self, options)
				}
			})(func, array[i])
		}
		return func
	}
}

module.exports = {
	adapter: new MongoAdapter()
}
