/* Scan directory for files and store it into database
 * As for now, mostly for debugging, but should be extended to useful stuff
 */
var PackageFile = require('package').PackageFile
var utils = require('utils')
var mongo = require('mongo').adapter

function add_to_db(pkg, root_path, repo, is_latest) {
	mongo.connection().then(function(db){
		pkg.metadata(root_path).then(function(p) {
			var packages = db.collection('packages')
			var files = db.collection('package_files')

			p.repositories = repo
			p.add_date = new Date();
			p._rev = 1;
			p.latest = is_latest

			packages.remove({md5: p.md5}, {w:1}, function(err, result) {
				packages.insert(p)
			})
			files.remove({md5: p.md5}, {w:1}, function(err, result) {
				files.insert({md5: p.md5, files: pkg.files})
			})
		})
	})
}

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
	utils.walk(dir, ['f'], function(files) {
		files = files.filter(function(n){ return /.*\.t[gx]z/.test(file) })
		var l = files.length
		files.forEach(function(file, i){
			console.log("[" + i + "/" + l + "] Importing " + file)
			var pkg = new PackageFile(file);
			add_to_db(pkg, root, repo, int(latest))
		})
	})
}
