
var MongoClient = require('mongodb').MongoClient
var settings = require('settings')
var when = require('when')
var _ = require('underscore')


function MongoAdapter() {
	var self = this
	this._db = null

	function connection(){
		return when.promise(function(resolve, reject) {
			if (self._db)
				return resolve(self._db)
			MongoClient.connect(settings.mongodb.server,
				settings.mongodb.options, function(error, db) {
					if (error)
						return reject(error)
					resolve(self._db = db)
				})
		})
	}

	function load(collection, query){
		return this.connection().then(function(db) {
			return when.promise(function(resolve, reject) {
				db.collection(collection).findOne(query, function(err, item) {
					if (err)
						return reject(err)
					return resolve(item)
				})
			})
		})
	}

	function save(collection, data, search_query, dry_run) {
		return this.connection().then(function(db) {
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

module.adapter = new MongoAdapter()
