/* Scan directory for files and store it into database
 * As for now, mostly for debugging, but should be extended to useful stuff
 */

var PackageFile = require('./package').PackageFile
var utils = require('./utils')
var mongo = require('./mongo').adapter
var _ = require('underscore')
var when = require('when')

function add_to_db(pkg, root_path, repo, is_latest) {
	return when.promise(function(resolve, reject) {
		return mongo.connection.then(function(db){
			return pkg.metadata(root_path).then(function(p) {
				var packages = db.collection('packages')
				var files = db.collection('package_files')

				if (is_latest)
					repo.latest = null

				p.repositories = [repo]
				p.add_date = new Date()
				p._rev = 1

				var concern = {w: 1}
				var md5_key = {md5: p.md5}
				var mongo_chain = [
					[packages.remove, packages, md5_key, concern],
					[packages.insert, packages, p, concern],
					[files.remove, files, md5_key, concern],
					[files.insert, files, {md5: p.md5, files: pkg.files}, concern]
				]

				mongo.generate_chain(mongo_chain, resolve, reject)()
			})
		})
	})
}

var pkg_re = new RegExp(/.*\.t[gx]z$/)
function import_dir(dir, root, repository, osversion, branch, subgroup, latest) {
	repository = repository || settings.repository.repository
	osversion = osversion || settings.repository.osversion
	branch = branch || settings.repository.branch
	subgroup = subgroup || settings.repository.subgroup
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
		var packages = _.map(files, function(file){
			var pkg = new PackageFile(file);
			return add_to_db(pkg, root, repo, latest).then(function() {
				console.log("[" + (count++) + "/" + l + "] Imported " + file)
			}).catch(function (error) {
				console.log("[" + (count++) + "/" + l + "] Failed to import " +
							file + " " + error)
			})
		})
		when.all(packages).then(function() {
			console.log("Folder " + dir  + " with " + l + " files processed.")
		})
	})
}

module.exports = {
	directory: import_dir
}
