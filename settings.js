
module.exports = {
	base: {
		secret: 'secret',
	},
	permissions: {
		user: 'admin',
		everyone: '@everyone',
		actions: ['read', 'write', 'admin']
	},
	paths: {
		storage: ''
	},
	repository: {
		repository: 'master',
		osver: '9.0',
		branch: 'test',
		subgroup: 'stable',
	},
	mongodb: {
		host: 'localhost',
		port: 27017,
		options: {},
		database: 'Agilia',
	}
}
