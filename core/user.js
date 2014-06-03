
var mongo = require('./mongo').adapter
var ObjectID = require('mongodb').ObjectID
var bcrypt = require('bcrypt')



var user_proto = {

	_create: function(username, email, password, callback) {
		var self = this
		if (!username || !password)
			return callback('Name or password are empty')
		return mongo.load('users', {'$or': [
				{username: username},
				{email: email},
		]}).then(function(data, db) {
			if (data)
				return callback('User with this name already exists')

			self.username = username
			self.email = email
			self.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8))
			self.join_date = new Date()
			self.enabled = 1
			self.permissions = []
			self.groups = []

			return db.collection('users').insert(self.getData(), {w: 1},
				function(err, record) { return callback(err, self) })
		}).catch(callback)
	},

	_load: function(username, callback) {
		var self = this
		return mongo.load('users', {username: username}).then(function(data, db) {
			self.username = data.username
			self.email = data.email
			self._id = ObjectId(data._id)
			self.enabled = data.enabled
			self.permissions = data.permissions
			self.groups = data.groups
			callback(null, self)
		}).catch(callback)
	},

	save: function(callback) {
		var searchquery = {_id: this._id}
		var data = this.getData()
		var self = this
		return mongo.save('users', data, searchquery, false, function(err, r){
			callback(err, self)
		})
	},

	delete: function(callback) {
		var searchquery = {_id: this._id}
		return mongo.connection.then(function(db) {
			db.collection('users').remove(searchquery, callback)
		})
	},

	getData: function() {
		return {
			username: this.username,
			email: this.email,
			enabled: this.enabled,
			permissions: this.permissions,
			groups: this.groups
		}
	},

	can: function(permission) {
		if (permission in this.permissions)
			return true

		for (var i = 0; i < this.groups.length; ++i)
			if (this.groups[i].can(permission))
				return true
		return false
	},

	addGroup: function(group, callback) {
		if (!group)
			return callback('Group name is empty')
		if (this.groups.indexOf(group) >= 0)
			return callback('Group already added')
		this.groups.push(group)
		return this.save(callback)
	},

	removeGroup: function(group, callback) {
		if (!group)
			return callback('Group name is empty')
		var index = this.groups.indexOf(group)
		if (index < 0)
			return callback('Group not found')
		this.groups.splice(index, 1)
		return this.save(callback)
	},

	memberOf: function(group) {
		return this.groups.indexOf(group) >= 0
	},

	addPermission: function(permname, callback) {
		if (!permname)
			return callback('Permission name is empty')

		if (this.permissions.indexOf(permission) >= 0)
			return callback('User already have this permission')

		this.permissions.push(permission)
		return this.save(callback)
	},

	removePermission: function(permname) {
		if (!permname)
			return callback('Permission name is empty')

		var index = this.permissions.indexOf(permname)
		if (index < 0)
			return callback('Permission not found')
		this.permissions.splice(index, 1)
		return this.save(callback)
	},

	setEnabled: function(enabled, callback) {
		this.enabled = enabled
		if (!enabled) {
			// TODO: disable session
			// self::db()->user_sessions->remove(['uid' => trim($user['_id'])]);
		}
		return this.save(callback)
	},

	setNewPassword: function(password) {
		if (!password)
			return callback('Password is empty')
		var query = {_id: this._id}
		var data = {
			password: bcrypt.hashSync(password, bcrypt.genSaltSync(8))
		}
		return mongo.save('users', data, query, false, callback)
	},

	homedir: function() {
		// FIXME: WTF?
		return path.join(__dirnam, '/../../../users/', this.name)
	}
}

var User = function(){}
User.prototype = user_proto

// Static methods
User.create = function(username, email, password, callback) {
	var user = new User()
	return user._create(username, email, password, callback);
}

User.get = function(username, callback) {
	var options = {username: name}
	if (enabled)
		options.enabled = true
	return mongo.load('users', options).then(function(user) {
		if (!user)
			return callback('User not found')
		return user._load(username, callback)
	}).catch(callback)
}

User.delete = function(username, callback) {
	return User.get(username, function(err, user){
		return user.delete(callback)
	})
}

