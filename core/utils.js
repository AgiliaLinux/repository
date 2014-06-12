
var pool = require('./pool').Pool
var fs = require('fs')
var when = require('when')
var child_process = require('child_process')

var walk_options = {
	f: 'isFile',
}

/* Run external command in shell
 * Returns: promise
 */
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

/* Recursive walker
 *   dir - starting directory
 *   options - filter for processed files
 *   dir_done - callback called at the error or new directory processed
 */
function walk(dir, options, dir_done) {
	var results = []
	var checks = []
	for (var i = 0; i < options.length; ++i)
		if (options[i] in walk_options)
			checks.push(walk_options[options[i]])
	fs.readdir(dir, function(err, list) {
		if (err)
			return dir_done(err)
		var pending = list.length
		if (!pending)
			return dir_done(null, results)
		list.forEach(function(file) {
			file = dir + '/' + file
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, options, function(err, res) {
						results = results.concat(res)
						if (!--pending)
							dir_done(null, results)
					})
				} else {
					var i = checks.length;
					while (--i >= 0)
						if (!stat[checks[i]]())
							break
					if (i < 0)
						results.push(file)
					if (!--pending)
						dir_done(null, results)
				}
			});
		});
	});
}

/* Generate chain of sequential calls with error chec
 * CALLS WILL BE GENERATED IN REVERSED ORDER
 * array is array of parameters for call generation. Format are:
 *   [method, this object for call, arguments ... ]
 *   method can be either function or method name (in this case it will be
 *   considered as method of `this`)
 * Returns:
 *   Chain top-level function
 * Called functions must accept callback as last argument with fist error
 * parameter. If first parameter of callback is valid value, then reject
 * function will be called and chaining will stop.
 */
function generate_chain(array, resolve, reject) {
	var chain_results = []
	function resolver(err, result) {
		if(err)
			return reject(err)
		chain_results.shift()
		chain_results.push(result)
		return resolve.apply(null, chain_results)
	}

	var func = resolver
	for (var i = array.length - 1; i >= 0; --i) {
		func = (function(callback, options){
			var call_opt = options.shift()
			var self = options.shift()
			// Check if method was passed by the name
			if (typeof call_opt === "string")
				call_opt = self[call_opt]
			options.push(callback)
			return function(err, result){
				if(err)
					return reject(err)
				chain_results.push(result)
				return call_opt.apply(self, options)
			}
		})(func, array[i])
	}
	return func
}

module.exports = {
	walk: walk,
	run: run_command,
	chain: generate_chain
}
