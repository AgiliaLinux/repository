
var settings = require('../settings')
var MongoClient = require('mongodb').MongoClient
var when = require('when')
var _ = require('underscore')


function MongoAdapter() {
	var self = this
	this._db = null

	this.connection = when.promise(function(resolve, reject) {
		if (self._db)
			return resolve(self._db)
		MongoClient.connect(settings.mongodb.server,
			settings.mongodb.options, function(error, db) {
				if (error)
					return reject(error)
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
}

module.exports = {
	adapter: new MongoAdapter()
}
