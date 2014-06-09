
var _ = require('underscore')
var path = require('path')

var Bytes = [
	{"UNIT": "TB", "VALUE": Math.pow(1024, 4)},
	{"UNIT": "GB", "VALUE": Math.pow(1024, 3)},
	{"UNIT": "MB", "VALUE": Math.pow(1024, 2)},
	{"UNIT": "KB", "VALUE": 1024},
	{"UNIT":  "B", "VALUE": 1}
]

var Deps = {
	atleast: '>=',
	equal: '=',
	any: ''
}


var filters = {
	branch_full: function(repository) {
		return repository.branch + '/' + repository.subgroup
	},
	to_string: function(obj) {
		return JSON.stringify(obj);
	},
	dep_string: function(dep) {
		if (dep in Deps)
			return Deps[dep]
		return _.values(Deps).indexOf(dep) < 0 ? '' : dep
	},
	basename: function(p) {
		return path.basename(p)
	},

	humanize_size: function(bytes, fixed) {
		fixed = fixed || 2
		for (var i = 0; i < Bytes.length; ++i) {
			if (bytes < Bytes[i].VALUE)
				continue;
			var result = (bytes / Bytes[i].VALUE).toFixed(fixed)
			return '' + result + ' ' + Bytes[i].UNIT
		}
	}
}

module.exports = {
	init: function (env) {
		for(var filter in filters)
			env.addFilter(filter, filters[filter])

		env.addFilter('map', function(array, filter) {
			if (!(filter in env.filters))
				throw new Error('Wrong filter name')
			return _.map(array, _.bind(env.filters[filter], env))
		})
	}
}