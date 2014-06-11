
var settings = require('../settings')
var utils = require('./utils')
var mongo = require('./mongo').adapter
var _ = require('underscore')
var when = require('when')

function do_count(counter, count) {
	// if (AsyncTask::$current)
	//	AsyncTask::$current->setProgress(counter, count);
}

function save_package(pkg, params, cursor, next, reject) {
	var query = {md5: pkg.md5, _rev: pkg._rev}
	return mongo.save_nodiff('packages', query, params, function(err, result) {
		if (err)
			return reject(err)
		return cursor.nextObject(next)
	})
}


var repository_proto = {

	/* Constructor. Accepts repository name. */
	load: function() {
		var self = this
		return when.promise(function(resolve, reject) {
			return mongo.connection.then(function(db) {
				return db.collection('repositories').findOne({name: self.name},
					function(err, repo) {
					if(err)
						return reject(err)
					self.settings = repo
					return resolve(self)
				})
			}).catch(reject)
		})
	},

	/* Update repository settings: write to database new values
	 * Required permissions:
	 * repository: admin
	 */
	save: function() {
		this._settings.name = this.name
		var self = this
		return when.promise(function(resolve, reject) {
			return mongo.connection.then(function(db) {
				db.collection('repositories').update({name: self.name},
					self.settings, {upsert: true}, function(err, result) {
					if (err) return reject(err)
					resolve(result)
				})
			})
		})
	},

	/* Returns repository owner */
	owner: function() {
		return this._settings.owner || settings.permissions.user
	},

	/* Returns repository settings, such as permissions */
	get settings() {
		return this._settings
	},

	/* Set new settings
	 * Required permissions:
	 * repository: admin
	 */
	set settings(obj) {
		delete obj._id
		obj.name = this.name
		this._settings = obj
	},

	/* Returns user names which has specified permission on this repository */
	whoCan: function(perm) {
		var p = this.setting.permissions
		if (p && p[perm])
			return p[perm]
		return [settings.permissions.user]
	},

	/* Checks if specified user has specified permission.
	 * Returns true if it can do this, or false if he can't.
	 */
	can: function(user, perm) {
		var who = this.whoCan(perm)
		var userdata = user.getData()
		var users = [settings.permissions.everyone, userdata.username]
		users = _.union(users, _.map(userdata.groups,
			function(x){ return '@' + x }))
		for (var i = 0; i < users.length; ++i)
			if (who.indexOf(users[i]) >= 0) return true
		return false
	},

	/* Returns git remote URL
	 * FIXME: git model isn't implemented yet
	 */
	gitRemote: function() {
		return this.settings.git_remote
	},

	/* ------- Clone, merge, delete --------- */

	/* Creates a clone of repository
	 * Required permissions:
	 * source: read
	 * global: create_repository
	 */
	cloneTo: function(target) {
		var counter = 0
		var self = this

		function update_config(db, resolve, reject) {
			// Copy configuration record, if any
			return db.collections('repositories').findOne(
					{name: self.name}, function(err, configuration) {
				if (err)
					return reject(err)
				if (!configuration)
					resolve(counter)
				delete configuration._id
				configuration.name = target
				db.collections('repositories').insert(configuration,
						function(err, record) {
					if (err)
						return reject(err)
					return resolve(counter)
				})
			})
		}

		function extract_repos(pkg) {
			var records = pkg.repositories.filter(function(repo) {
				return repo.repository == self.name
			})
			records.forEach(function(repo) { repo.repository = target })
			return records
		}

		return when.promise(function(resolve, reject){
			return this.count().then(function(count) {
				return mongo.connection.then(function(db) {
					// TODO: lock
					db.collections('packages').find(
						{'repositories.repository': self.name },
						function(err, cursor) {
							if (err)
								return reject(err)

							function process(err, pkg){
								if (err)
									return reject(err)
								if (pkg === null)
									return update_config(db, resolve, reject)

								var records = extract_repos(pkg)
								if (!records.length)
									return cursor.nextObject(process)
								do_count(++counter, count)

								var params = {
									'$addToSet': {repositories: {'$each': records}},
									'$inc': {'_rev': 1}
								}
								save_package(pkg, params, cursor, process, reject)
							}
							cursor.nextObject(process)
					})
				}).catch(reject)
			})
		})
	},

	/* Merge specified repository into this
	 * Logic:
	 *	1. every os version and branch, which contains in $repo_name, but not in $this, should be added.
	 *	2. every package which contains in $repo_name, but not in $this, should be added to $this at the same location.
	 *
	 * TODO: implement
	 */
	merge: function(repo_name) {
	},

	/* Deletes repository
	 * Required permissions:
	 * repository: admin
	 */
	delete: function() {
		var counter = 0
		var self = this
		function remove_repo(db, resolve, reject) {
			// Copy configuration record, if any
			var cursor = db.collections('repositories')
			cursor.remove({name: self.name}, function(err, res) {
				if (err) return reject(err)
				resolve(res)
			})
		}
		function extract_repos(pkg) {
			return _.filter(pkg.repositories, function(repo) {
				return repo.repository != self.name
			})
		}

		return when.promise(function(resolve, reject){
			return this.count().then(function(count) {
				return mongo.connection.then(function(db) {
					// TODO: lock
					return db.collections('packages').find(
						{'repositories.repository': self.name },
						function(err, cursor) {
							if (err)
								return reject(err)

							function process(err, pkg){
								if (err)
									return reject(err)
								if (pkg === null)
									return remove_repo(db, resolve, reject)
								var records = extract_repos(pkg)
								if (!records.length)
									return cursor.nextObject(process)
								do_count(++counter, count)

								var params = {
									'$set': {repositories: records},
									'$inc': {'_rev': 1}
								}
								save_package(pkg, params, cursor, process, reject)
							}
							cursor.nextObject(process)
					})
				}).catch(reject)
			})
		})
	},

	get count() {
		var self = this
		return when.promise(function(resolve, reject) {
			return mongo.connection.then(function(db) {
				return db.collections('packages').find({
					'repositories.repository': self.name
				}).count(function(err, count) {
					if (err) return reject(err)
					return resolve(count)
				})
			})
		})
	},

	data: function(target, user, permission, restrictions, force_scan) {
		var self = this
		var stored = self.settings[target]
		var defacto = when.promise(function(resolve, reject) {
			if (stored || !force_scan)
				return resolve([])
			return mongo.connection.then(function(db) {
				db.collection('packages').distinct('repositories.' + target, {
					'repositories.repository': self.name
				}, function(err, items) {
					if (err) return reject(err)
					return resolve(items)
				})
			})
		})

		return when.promise(function(resolve, reject) {
			if (permission && (!user || !self.can(user, permission)))
				return resolve([])
			defacto.then(function(objects) {
				var targets = _.union(objects, stored)
				if (!permission)
					return resolve(targets)
				// TODO: add permission check for specific target
				//       version within that repository + restrictions
				resolve(targets)
			}).catch(reject)
		})
	},

	/* Returns OS versions inside this repository
	 * By default, returns all of it, based on repository settings.
	 * If user and permission are specified, returns only ones on which this user has specified permission. (TODO)
	 * If $force_scan is set to true, returns OS versions from packages inside repository, instead of settings. In other words, it returns 'de-facto' data.
	 */
	osversions: function(user, permission, force_scan) {
		return this.data('osversion', user, permission, {}, force_scan)
	},

	/* Returns branches inside this repository
	 * By default, returns all of it, based on repository settings.
	 * If user and permission are specified, returns only ones on which this user has specified permission. (TODO)
	 * If $force_scan is set to true, returns branches from packages inside repository, instead of settings. In other words, it returns 'de-facto' data.
	 */
	branches: function(osversion, user, permission, force_scan) {
		var restrictions = {osversion: osversion}
		return this.data('branch', user, permission, restrictions, force_scan)
	},

	/* Returns subgroups inside this repository
	 * By default, returns all of it, based on repository settings.
	 * If user and permission are specified, returns only ones on which this user has specified permission. (TODO)
	 * If $force_scan is set to true, returns subgroups from packages inside repository, instead of settings. In other words, it returns 'de-facto' data.
	 */
	subgroups: function(osversion, branch, user, permission, force_scan) {
		var restrictions = {osversion: osversion, branch: branch}
		return this.data('branch', user, permission, restrictions, force_scan)
	},

	/* Returns setup variants related to this repository */
	setup_variants: function(osversions) {
		var query = {'repository': this.name}
		if (_.isArray(osversions))
			query.osversions = {'$in': osversions}
		else if (osversions)
			query.osversions = osversions
		return when.promise(function(resolve, reject) {
			mongo.connection.then(function(db) {
				db.collection('setup_variants').distinct('name', query,
					function(err, result) {
					if (err) return reject(err)
					return resolve(result)
				})
			}).catch(reject)
		})
	},

	get permissions() {
		return this.settings.permissions
	},

	set permissions(perms) {
		var actions = settings.permissions.actions
		for (var p = 0; p < actions.length; ++p)
			this._settings.permissions[p] = perms[p]
		return this.save()
	},

	/* Returns default package path */
	path: function(prefix) {
		prefix = prefix || ''
		if (prefix.length && prefix[prefix.length - 1] != '/')
			prefix += '/'
		if (this.settings.default_path)
			return prefix + this.settings.default_path
		return prefix + this.name
	},
}

var Repository = function(name) { this.name = name }
Repository.prototype = Object.create(repository_proto)

// Static
Repository.prototype.get = function(name) {
	var repo = new Repository(name)
	return repo.load()
}

/* Returns repository list.
 * If user and permission are specified, return only ones on which user can specified permission
 */
Repository.prototype.getList = function(user, permission, force_scan) {
	return when.promise(function(resolve, reject) {
		if (permission && (!user || !self.can(user, permission)))
			return resolve([])

		return mongo.connection.then(function(db) {
			var repositories = db.collection('repositories')
			var packages = db.collection('packages')
			var chain = [
				[repositories.distinct, repositories, 'name'],
				[packages.distinct, packages, 'repositories.repository'],
			]
			function chained(values){
				var repos = values.shift().concat(values)
				if (!permission)
					return resolve(repos)
				var promises = _.map(repos, function(repo) {
					return Repository.get(repo)
				})
				when.all(promises).then(resolve)
			}
			mongo.generate_chain(chain, chained, reject)()
		})
	})
}
