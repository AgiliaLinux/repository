
var nunjucks = require('nunjucks');
var env = new nunjucks.Environment();


env.addFilter('branch_full', function(repository) {
	return repository.branch + '/' + repository.subgroup
});
