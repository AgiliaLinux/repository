
var session = require('express-session')
var MemcachedStore = require('connect-memcached')(session)
var flash = require('connect-flash')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var settings = require('../settings')
var User = require('../core/user')

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
	done(null, user.username);
});

// used to deserialize the user
passport.deserializeUser(function(username, done) {
	User.get(username, true, done);
});

var local_config = {
	usernameField: 'login',
    passwordField: 'password',
	passReqToCallback : true
}

passport.use('local-signup', new LocalStrategy(local_config,
function(req, login, password, done) {
	User.get(login, false, function(err,  user) {
		if (user)
			return done(null, false, req.flash('signup_flash',
				req.gettext('That username is not avaliable.')));

		var email = req.param('email')
		return User.create(login, email, password, done);
	})
}))

passport.use('local-login', new LocalStrategy(local_config,
function(req, login, password, done) {
	User.get(login, true, function(err, user) {
		if (err)
			return done(null, false, req.flash('error', err))

		if (!user)
			return done(null, false, req.flash('login_flash', req.gettext('No user found.')))

		return user.validate(password, function(err, res) {
			if (err)
				return done(null, false, req.flash('error', err))
			if (!res)
				return done(null, false, req.flash('login_flash', req.gettext('Wrong password.')))
			return done(null, user)
		})
	})
}))

var passport_routes = [
	// url, target, succes, failure
	['/signup', 'local-signup', '/', '/signup'],
	['/login', 'local-login', '/', '/login'],
]

var routes = [
	// url, template, messages
	['/signup', 'user/signup_static.html', ['signup_flash']],
	['/login', 'user/login_static.html', ['login_flash']]
]


function init(app) {
	// Auth
	app.use(session({
		secret: settings.base.secret,
		key : 'test',
		store: new MemcachedStore({hosts: ['127.0.0.1:11211']})
    }))
	app.use(passport.initialize())
	app.use(passport.session()) // persistent login sessions
	app.use(flash()) // use connect-flash for flash messages stored in session

	// Routes
	passport_routes.forEach(function(route) {
		var url = route[0], target = route[1],
			success = route[2], failure = route[3]
		app.post(url, passport.authenticate(target, {
			successRedirect : success,
			failureRedirect : failure,
			failureFlash : true
		}))
	})

	routes.forEach(function(route) {
		var url = route[0],
			template = route[1],
			messages = route[2]
		app.get(url, function(req, res) {
			var data = {error_flash: req.flash('error')}
			for (var el = 0; el < messages.length; ++el)
				data[messages[el]] = req.flash(messages[el])
			res.render_context(template, data)
		})
	})

	// Special case for logout
	app.get('/logout', function(req, res){
		req.logout()
		res.redirect(req.header('Referrer') || '/')
	})
}


module.exports = {
	init: init,
	passport: passport
}

