
var fs = require('fs')
var xml2js = require('xml2js')
var tar = require('tar')
var crypto = require('crypto')
var child_process = require('child_process');
var path = require('path')
var dataFile = 'install/data.xml'

function read_dep(dep) {
	return {
		name: dep.name.trim(),
		condition: dep.condition.trim(),
		version: dep.version.trim()
	}
}

function package_data(data, filename, location, size, length, md5) {
	return {
		compressed_size: length,
		md5: md5,
		name: data.name.trim(),
		version: data.version.trim(),
		arch: data.arch.trim(),
		build: parseInt(data.build.trim()),
		short_description: data.short_description.trim(),
		description: data.description.trim(),
		maintainer: {
			name: data.mantainer.name.trim(),
			email: data.mantainer.email.trim(),
		},
		installed_size: size,
		filename: filename,
		location: location,
		dependencies: data.dependencies.map(read_dep),
		suggests: data.suggests.map(read_dep),
		tags: data.tags.map(function(tag) { return tag.trim() })
	}
}

var proto = {

	md5: function() {
		return this.meta.md5
	},

	files: function() {
		return this.meta.files
	},

	filesize: function() {
		return this.length
	},

	datasize: function(filename) {
		var self = this
		return new Promise(function(resolve, reject){
			if (self.size)
				return resolve(self.size)
			child_process.exec('xz -l --robot ' + filename + ' | grep totals',
				function (error, stdout, stderr) {
					resolve(self.size = stdout.split('\\t')[4])
			})
		})
	},

	readData: function(filename) {
		var self = this
		return new Promise(function(resolve, reject) {
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
				self.files = files
				var jsparser = new xml2js.Parser()
				resolve(jsparser.parseString(xml), length, hash.digest('hex'))
			})
		})
	},

	prepareMeta: function(root) {
		var self = this
		return new Promise(function(resolve, reject) {
			if (self.meta)
				return resolve(self.meta)
			var filename = path.basename(self.filename)
			var location = path.dirname(self.filename)
			// FIXME: wtf?
			if (root)
				location = location.substring(root.length + 1)
			var package_data = self.readData(self.filename)
			package_data.then(function(data, length, md5) {
				var datasize = this.datasize(this.filename)
				datasize.then(function(size) {
					self.meta = package_data(data, self.filename, location,
						size, length, md5)
					resolve(self.meta)
				})
			})
		})
	},

	metadata: function (root, callaback) {
		var promise = this.prepareMeta(root);
		promise.then(function(meta) { callback(meta) })
	}
}

module.Package = function Package(filename) {
	this.filename = filename;
	if (!fs.existsSync(filename))
		throw new Error("bad file specified for package")
}

Package.prototype = proto

