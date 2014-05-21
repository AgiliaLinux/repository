
var settings = require('../settings')
var comparator = require('./vercmp')
var utils = require('./utils')
var mongo = require('./mongo').adapter
var fs = require('fs')
var xml2js = require('xml2js')
var path = require('path')
var when = require('when')
var _ = require('underscore')

function flatten_data(data) {
	if (_.isArray(data)){
		if (data.length < 2)
			return flatten_data(data[0])
		return data.map(flatten_data)
	} else if (_.isObject(data)) {
		var subdata = {}
		for (var i in data)
			subdata[i] = flatten_data(data[i]);
		return subdata
	}
	return data.trim();
}

function promote_data(data, name) {
	if (!data)
		return []

	// FIXME: this strange way is in original source.
	// Key must be passed instead of guessing
	if (!name) {
		var obj = _.isArray(data) ? data[0] : data
		name = Object.keys(obj)[0]
		console.log('Key is ' + name)
	}

	if (_.isArray(data))
		return data.map(function (val) { return val[name] })
	else if (_.isObject(data))
		return data[name]
	return [data]
}

function split_data(data) {
	if (!data)
		return []
	return data.replace(/\s+/g, ' ').split(' ')
}

function package_data(pkgdata, filename, location, size, length, md5, files) {
	var data = flatten_data(pkgdata.package)
	return {
		arch: data.arch,
		build: parseInt(data.build),
		compressed_size: length,
		conflicts: split_data(data.conflicts),
		config_files: promote_data(data.config_files, 'conf_file'),
		dependencies: promote_data(data.dependencies, 'dep'),
		description: data.description,
		filename: filename,
		installed_size: size,
		location: location,
		maintainer: data.mantainer,
		md5: md5,
		name: data.name,
		provides: split_data(data.provides),
		repositories: [],
		short_description: data.short_description,
		suggests: promote_data(data.suggest /*, 'suggest'*/),
		tags: promote_data(data.tags, 'tag'),
		version: data.version
	}
}

var package_file_proto = {

	datasize: function() {
		var self = this
		return when.promise(function(resolve, reject){
			if (self.size)
				return resolve(self.size)
			return utils.run('xz -l --robot ' + self.filename + ' | grep totals'
				).then(function(data) {
					return resolve(self.size = data.split('\\t')[4])
			}).catch(reject)
		})
	},

	file: function(file) {
		var self = this
		return when.promise(function(resolve, reject){
			utils.run('tar xf ' + self.filename + ' ' + file + ' --to-stdout'
				).then(resolve).catch(reject)
		})
	},

	pkginfo: function() {
		return this.file('install/data.xml').then(function(xml) {
			return when.promise(function(resolve, reject) {
				xml2js.parseString(xml, function(error, result) {
					if (error)
						return reject(error)
					return resolve(result)
				})
			})
		})
	},

	md5sum: function() {
		var self = this
		return when.promise(function(resolve, reject){
			return utils.run('md5sum ' + self.filename).then(function(data) {
				return resolve(data.split(' ')[0])
			}).catch(reject)
		})
	},

	filelist: function() {
		var self = this
		return when.promise(function(resolve, reject){
			if (self.files)
				return resolve(self.files)
			utils.run('tar tf ' + self.filename).then(function(data) {
				var files = data.split('\n').map(function(x){
					return x.trim()
				}).filter(function(x) {
					return x && x != './'
				})
				return resolve(self.files = files)
			}).catch(reject)
		})
	},

	filesize: function() {
		var self = this
		return when.promise(function(resolve, reject) {
			fs.stat(self.filename, function (err, stats) {
				if (err)
					return reject(err)
				return resolve(stats.size)
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

			return when.join(self.pkginfo(), when(self.filename),
					when(location), self.datasize(), self.filesize(),
					self.md5sum(), self.filelist()).then(function(values){
				return resolve(self.meta = package_data.apply(null, values))
			}).catch(function (error) {
				console.log('Bad archive ' + self.filename)
				return reject(error)
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