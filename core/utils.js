
var fs = require('fs');
var when = require('when')

var walk_options = {
	f: 'isFile',
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
	walk: walk
}
