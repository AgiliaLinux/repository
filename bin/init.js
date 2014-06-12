#!/usr/bin/node

var settings = require('../settings')
var Repository = require('../core/repository')
var User = require('../core/user')

var suser = settings.permissions.user
User.create(suser.name, suser.email, suser.password, function(err, user) {
	if (err)
		return console.log(err)
	user.addGroup(suser.group, function(err, user) {
		console.log('User added')
	})
})
Repository.create(settings.repository.repository).then(function(repo){
	console.log('Repository added')
	process.exit()
}).catch(function (err){
	console.log(err)
	process.exit()
})


