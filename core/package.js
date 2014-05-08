
var settings = require('../settings')
var comparator = require('./vercmp')
var mongo = require('./mongo').adapter
var fs = require('fs')
var xml2js = require('xml2js')
var tar = require('tar')
var crypto = require('crypto')
var child_process = require('child_process');
var path = require('path')
var when = require('when')
var dataFile = 'install/data.xml'

function read_dep(dep) {
	return {
		name: dep.name.trim(),
		condition: dep.condition.trim(),
		version: dep.version.trim()
	}
}

function trim(s) {
	return s.trim()
}

function package_data(data, filename, location, size, length, md5) {
	return {
		arch: data.arch.trim(),
		build: parseInt(data.build.trim()),
		compressed_size: length,
		conflicts: data.conflicts.trim().split(' ').map(trim),
		config_files: data.config_files.map(trim),
		dependencies: data.dependencies.map(read_dep),
		description: data.description.trim(),
		filename: filename,
		installed_size: size,
		location: location,
		maintainer: {
			name: data.mantainer.name.trim(),
			email: data.mantainer.email.trim(),
		},
		md5: md5,
		name: data.name.trim(),
		provides: data.provides.trim().split(' ').map(trim),
		repositories: [],
		short_description: data.short_description.trim(),
		suggests: data.suggests.map(read_dep),
		tags: data.tags.map(trim),
		version: data.version.trim()
	}
}


var package_file_proto = {

	datasize: function(filename) {
		var self = this
		return when.promise(function(resolve, reject){
			if (self.size)
				return resolve(self.size)
			child_process.exec('xz -l --robot ' + filename + ' | grep totals',
				function (error, stdout, stderr) {
					resolve(self.size = stdout.split('\\t')[4])
			})
		})
	},

	readData: function(filename) {
		return when.promise(function(resolve, reject) {
			var xml = ''
			var files = []
			var hash = crypto.createHash('md5')
			var tarparser = new tar.Parser()
			tarparser.on("entry", function (header, stream) {
				files.push(header.name)
				if (header.name == dataFile)
					stream.on("data", function (chunk) { xml += chunk })
			})

			var length = 0
			readable = fs.createReadStream(filename);
			readable.on("data", function (buffer) {
				length += buffer.length;
				hash.update(buffer)
				tarparser.write(buffer)
			});

			readable.on("end", function() {
				var jsparser = new xml2js.Parser()
				resolve(files, jsparser.parseString(xml), length,
					hash.digest('hex'))
			})
		})
	},

	prepareMeta: function(root) {
		var self = this
		return when.promise(function(resolve, reject) {
			if (self.meta)
				return resolve(self.meta)
			var filename = path.basename(self.filename)
			var location = path.dirname(self.filename)
			// FIXME: wtf?
			if (root)
				location = location.substring(root.length + 1)
			var package_data = self.readData(self.filename)
			package_data.then(function(files, data, length, md5) {
				self.files = files
				return self.datasize(self.filename).then(function(size) {
					self.meta = package_data(data, self.filename, location,
						size, length, md5)
					resolve(self.meta)
				})
			})
		})
	},

	metadata: function (root, callaback) {
		return this.prepareMeta(root)
	}
}

var storable_keys = [
	'_id', '_rev', 'add_date', 'arch', 'build', 'compressed_size',
	'dependencies', 'description', 'filename', 'installed_size',
	'location', 'maintainer', 'md5', 'name', 'repositories',
    'short_description', 'suggests', 'tags', 'version'
]

var package_proto = {

	load: function(data) {
		for (var i = 0; i < storable_keys.length; ++i) {
			var key = storable_keys[i]
			this[key] = data[key]
		}
	},

	save: function() {
		var data = this.data();
		return mongo.connection.then(function(db){
			var searchquery = {md5: data.md5}
			if (data._rev)
				searchquery._rev = data._rev
			db.save('packages', data, searchquery)
		})
	},

	data: function() {
		var ret = {}
		for (var i = 0; i < storable_keys.length; ++i) {
			var key = storable_keys[i]
			ret[key] = this[key]
		}
		return ret;
	},

	recheckLatest: function(packages, path, save_inplace) {
		var latest = packages.reduce(function(last, pkg){
			return (pkg.compare(last) > 0) ? pkg : last;
		})
		packages.forEach(function(pkg) {
			pkg.setLatest(path, pkg.md5 === latest.md5);
			if (save_inplace)
				pkg.save()
		})
		return packages
	},

	compare: function(pkg) {
		var vcmp = comparator.vercmp(this.get('version'). pkg.get('version'))
		return vcmp !== 0 ? vcmp : comparator.vercmp(this.build. pkg.build)
	},

	toString: function() {
		return [this.name, this.version, this.arch, this.build].join('-')
	},

	fromPath: function(path) {
		var components = path.split('/')
		return {
			repository: components[0],
			osversion: components[1],
			branch: components[2],
			subgroup: components[3]
		}
	},

	setLatest: function(path, is_latest) {
		is_latest = is_latest === undefined ? true : false
		var params = self.fromPath(path)
		//console.log(this.toString() + ' at ' + path + ': is_latest = ' + is_latest)
		this.repositories.forEach(function(p) {
			for (var key in params)
				if (p[key] !== params[key])
					return
			p.latest = is_latest
		})
	},

	altVersions: function(path) {
		var params = self.fromPath(path)
		var query = {name: this.name, repositories: params}
		var arch = this.queryArchSet()
		if (arch)
			query.arch = arch
		return mongo.connection.then(function(db){
			var packages = db.collection('packages').find(query)
			return when(packages.map(function(item) { return new Package(item) }))
		})
	},

	queryArchSet: function() {
		if (/^..*86$/.test(this.arch))
			return {'$in': ['x86', 'i386', 'i486', 'i586', 'i686', 'noarch', 'fw']}
		else if (arch == 'x86_64')
			return {'$in': ['x86_64', 'noarch', 'fw']}
		return ''
	},

	fspath: function() {
		return path.join(settings.server.root, this.location, this.filename)
	},

	packageFile: function() {
		return new PackageFile(this.fspath())
	},

	packageFiles: function() {
		return mongo.connection().then(function(db){
			return when(db.package_files.findOne({md5: this.md5}))
		})
	},
}


function PackageFile(filename) {
	this.filename = filename;
	if (!fs.existsSync(filename))
		throw new Error("bad file specified for package")
}

PackageFile.prototype = package_file_proto

function Package(data) { this.load(data) }
Package.prototype = package_proto


var packages = {}
module.exports = {
	PackageFile: PackageFile,
	Package: function(md5) {
	return when.promise(function(resolve, reject) {
		if (packages[md5])
			return resolve(packages[md5])
		mongo.load('packages', {md5: md5}).then(function(data) {
				resolve(packages[md5] = new Package(data))
			})
		})
	}
}