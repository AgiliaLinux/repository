/* Scan directory for files and store it into database
 * As for now, mostly for debugging, but should be extended to useful stuff
 */

var PackageFile = require('./package').PackageFile
var utils = require('./utils')
var mongo = require('./mongo').adapter
var when = require('when')

function add_to_db(pkg, root_path, repo, is_latest) {
	return mongo.connection.then(function(db){
		return pkg.metadata(root_path).then(function(p) {
			var packages = db.collection('packages')
			var files = db.collection('package_files')

			p.repositories = [repo]
			p.add_date = new Date()
			p._rev = 1
			p.latest = is_latest ? 1 : 0
			return when.promise(function(resolve, reject) {
				packages.remove({md5: p.md5}, {w:0}, function(err, result) {
					if (err)
						return reject(err)
					packages.insert(p, {w:0}, function(err, result) {
						if (err)
							return reject(err)
						files.remove({md5: p.md5}, {w:0}, function(err, result) {
							if (err)
								return reject(err)
							files.insert({md5: p.md5, files: pkg.files}, {w:0},
								function(err, result) {
								if(err)
									return reject(err)
								return resolve(result)
							})
						})
					})
				})
			})
		})
	})
}

var pkg_re = new RegExp(/.*\.t[gx]z/)
function import_dir(dir, root, repository, osversion, branch, subgroup, latest) {
	repository = repository || []
	osversion = osversion || []
	branch = branch || []
	subgroup = subgroup || []
	var repo = {
		repository: repository,
		osversion: osversion,
		branch: branch,
		subgroup: subgroup
	}
	utils.walk(dir, ['f'], function(err, files) {
		if (err)
			return console.log(err)
		files = files.filter(function(file){ return pkg_re.test(file) })
		var l = files.length
		var count = 1;
		files.forEach(function(file){
			var pkg = new PackageFile(file);
			add_to_db(pkg, root, repo, latest).then(function() {
				console.log("[" + (count++) + "/" + l + "] Imported " + file)
			}).catch(function (error) {
				console.log("[" + (count++) + "/" + l + "] Failed to import " +
							file + " " + error)
			})
		})
	})
}

module.exports = {
	directory: import_dir
}
