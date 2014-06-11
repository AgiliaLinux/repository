
var pool = require('./pool').Pool
var fs = require('fs')
var when = require('when')
var child_process = require('child_process')

var walk_options = {
	f: 'isFile',
}

function run_command(command) {
	return when.promise(function(resolve, reject) {
		pool.add(function(pool_done) {
			child_process.exec(command, {maxBuffer: 500*1024}, function (error, stdout, stderr) {
				pool_done()
				if (error)
					return reject(error)
				var error_output = stderr.trim()
				if (error_output) {
					console.log(error_output)
					//return reject(error_output)
				}
				return resolve(stdout)
			})
		})
	})
}

function walk(dir, options, done) {
	var results = []
	var checks = []
	for (var i = 0; i < options.length; ++i)
		if (options[i] in walk_options)
			checks.push(walk_options[options[i]])
	fs.readdir(dir, function(err, list) {
		if (err)
			return done(err)
		var pending = list.length
		if (!pending)
			return done(null, results)
		list.forEach(function(file) {
			file = dir + '/' + file
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, options, function(err, res) {
						results = results.concat(res)
						if (!--pending)
							done(null, results)
					})
				} else {
					var i = checks.length;
					while (--i >= 0)
						if (!stat[checks[i]]())
							break
					if (i < 0)
						results.push(file)
					if (!--pending)
						done(null, results)
				}
			});
		});
	});
}

module.exports = {
	walk: walk,
	run: run_command,
}
