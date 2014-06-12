
module.exports = {
	base: {
		secret: 'secret',
	},
	permissions: {
		user: {
			name: 'admin',
			email: 'admin@localhost',
			password: 'admin',
			group: 'admins'
		},
		everyone: '@everyone',
		read: 'read',
		actions: ['read', 'write', 'admin'],
		defaults: {
			read: ['@everyone'],
			write: ['@admins', '@maintainers'],
			admin: ['admin']
        },
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
