
var fs = require('fs')
var xml2js = require('xml2js')
var tar = require('tar')
var crypto = require('crypto')
var child_process = require('child_process');
var path = require('path')
var dataFile = 'install/data.xml'


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

	datasize: function() {
		if (!this.datasize)
			child_process.exec('xz -l --robot ' + this.filename + ' | grep totals',
				function (error, stdout, stderr) {
					self.datasize = stdout.split('\\t')[4]
			})
		return this.datasize;
	},

	readData: function(filename, root, callback) {
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

		var self = this
		readable.on("end", function() {
			var jsparser = new xml2js.Parser()
			self.files = files
			self.meta = callback(root, parser.parseString(xml))
			self.meta.md5 = hash.digest('hex')
			self.meta.compressed_size = length
		})
	},

	prepareMeta: function(root, data) {
		var ret = {}
		var filename = path.basename(this.filename)
		var location = path.dirname(this.filename)
		// FIXME: wtf?
		if (root)
			location = location.substring(root.length + 1)

		function read_dep(dep) {
			return {
				name: dep.name.trim(),
				condition: dep.condition.trim(),
				version: dep.version.trim()
			}
		}

		return {
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
			installed_size: this.datasize(),
			filename: filename,
			location: location,
			dependencies: dependencies.map(read_dep),
			suggests: suggests.map(read_dep),
			tags: data.tags.map(function(tag) { return tag.trim() })
	}
}

module.Package = function Package(filename) {
	this.filename = filename;
	if (!fs.existsSync(filename))
		throw new Error("bad file specified for package");
}

Package.prototype = proto;

