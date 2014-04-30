
/* Scan directory for files and store it into database
 * As for now, mostly for debugging, but should be extended to useful stuff
 */
var Package = require('package').Package
var when = require('when')
var utils = require('utils')

function add_to_db(pkg, root_path, repo, is_latest) {
	db = MongoConnection::c()->agiliarepo
	p = pkg.metadata(root_path)
	p.repositories = repo
	p.add_date = new MongoDate();

	p._rev = 1;
	p.latest = int(is_latest)
	db.packages.remove({md5: p.md5});
	db.package_files.remove({md5: p.md5});
	db.packages.insert($p);
	db.package_files.insert({md5: p.md5, files: pkgfilelist()});
}

function import_dir(dir, root, repository, osversion, branch, subgroup, latest)
{
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
	utils.walk(dir, ['f'] function(files) {
		files = files.filter(function(n){ return /.*\.t[gx]z/.test(file) })
		var l = files.length
		files.forEach(function(file, i){
			console.log("[" + i + "/" + l + "] Importing " + file)
			var pkg = new Package(file);
			add_to_db(pkg, root, repo, latest)
		})
	})
}
