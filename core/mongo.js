
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

	this.add = function(collection, data) {
		return this.connection.then(function(db) {
			return when.promise(function(resolve, reject) {
				return db.collection(collection).insert(data, {w: 1},
					function(err, records) {
					if (err)
						return reject(err)
					return resolve(records)
				})
			})
		})
	}

	this.load = function(collection, query){
		return this.connection.then(function(db) {
			return when.promise(function(resolve, reject) {
				return db.collection(collection).findOne(query, function(err, item) {
					if (err)
						return reject(err)
					return resolve(item)
				})
			})
		})
	}

	this.save_nodiff = function(coll_name, search_query, set_query, callback) {
		return this.connection.then(function(db) {
			return db.collection(coll_name, function(err, collection) {
				if (err) return callback(err)
				collection.findAndModify(search_query, setquery, callback)
			})
		})
	}

	this.count = function(coll_name, query) {
		return this.connection.then(function(db) {
			return when.promise(function(resolve, reject) {
				return db.collection(coll_name).count(query, function(err, c) {
					if (err) return reject(err)
					return resolve(c)
				})
			})
		})
	}

	this.save = function(coll_name, data, search_query, dry_run, callback) {
		return this.connection.then(function(db) {
			var collection = db.collection(coll_name)
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
			return this.save_nodiff(coll_name, search_query, set_query, callback)
		})
	}


}

module.exports = {
	adapter: new MongoAdapter()
}
