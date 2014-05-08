/* Scan directory for files and store it into database
 * As for now, mostly for debugging, but should be extended to useful stuff
 */

var PackageFile = require('./package').PackageFile
var utils = require('./utils')
var mongo = require('./mongo').adapter

function add_to_db(pkg, root_path, repo, is_latest) {
	return mongo.connection.then(function(db){
		pkg.metadata(root_path).then(function(p) {
			var packages = db.collection('packages')
			var files = db.collection('package_files')

			p.repositories = repo
			p.add_date = new Date()
			p._rev = 1
			p.latest = is_latest ? 1 : 0

			packages.remove({md5: p.md5}, {w:1}, function(err, result) {
				packages.insert(p)
			})
			files.remove({md5: p.md5}, {w:1}, function(err, result) {
				files.insert({md5: p.md5, files: pkg.files})
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
		files.forEach(function(file, i){
			var pkg = new PackageFile(file);
			add_to_db(pkg, root, repo, latest).then(function() {
				console.log("[" + (i + 1) + "/" + l + "] Imported " + file)
			}).catch(function (error) {
				console.log("[" + (i + 1) + "/" + l + "] Failed to import " +
							file + " " + error)
			})
		})
	})
}

module.exports = {
	directory: import_dir
}
