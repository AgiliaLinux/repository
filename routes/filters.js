
var _ = require('underscore')
var path = require('path')

var filters = {
	branch_full: function(repository) {
		return repository.branch + '/' + repository.subgroup
	},
	to_string: function(obj) {
		return JSON.stringify(obj);
	},
	dep_string: function(dep) {
		var deps = {
			atleast: '>=',
			equal: '=',
			any: ''
		}
		if (dep in deps)
			return deps[dep]
		return _.values(deps).indexOf(dep) < 0 ? '' : dep
	},
	basename: function(p) {
		return path.basename(p)
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