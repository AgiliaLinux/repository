
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

function package_data(data, filename, location, size, length, md5) {
	return {
		md5: md5,
		compressed_size: length,
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

	datasize: function(filename) {
		return when.promise(function(resolve, reject){
			if (this.size)
				return resolve(this.size)
			child_process.exec('xz -l --robot ' + filename + ' | grep totals',
				function (error, stdout, stderr) {
					resolve(this.size = stdout.split('\\t')[4])
			})
		}).with(this)
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
		return when.promise(function(resolve, reject) {
			if (this.meta)
				return resolve(this.meta)
			var filename = path.basename(this.filename)
			var location = path.dirname(this.filename)
			// FIXME: wtf?
			if (root)
				location = location.substring(root.length + 1)
			var package_data = this.readData(this.filename)
			package_data.then(function(files, data, length, md5) {
				this.files = files
				return this.datasize(this.filename).then(function(size) {
					this.meta = package_data(data, this.filename, location,
						size, length, md5)
					resolve(this.meta)
				}).with(this)
			})
		}).with(this)
	},

	metadata: function (root, callaback) {
		return this.prepareMeta(root).then(callback(meta))
	}
}

module.Package = function Package(filename) {
	this.filename = filename;
	if (!fs.existsSync(filename))
		throw new Error("bad file specified for package")
}

Package.prototype = proto

