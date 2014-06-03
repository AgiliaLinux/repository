
var session = require('express-session')
var flash = require('connect-flash');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var settings = require('./settings')
var User = require('./user')

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

var local_config = {
	usernameField: 'username',
    passwordField: 'password',
	passReqToCallback : true
}

passport.use('local-signup', new LocalStrategy(local_config,
function(req, username, email, password, done) {
	// find a user whose email is the same as the forms email
	// we are checking to see if the user trying to login already exists
	User.findOne({'local.email': email}, function(err, user) {
		if (err)
			return done(err);

		if (user)
			return done(null, false, req.flash('signupMessage',
				req.gettext('That email is already taken.')));
		User.create(username, email, password, done);
	})
}))

passport.use('local-login', new LocalStrategy(local_config,
function(req, email, password, done) {
	User.findOne({'local.email':  email}, function(err, user) {
		if (err)
			return done(err)

		if (!user)
			return done(null, false, req.flash('loginMessage', req.gettext('No user found.')))

		if (!user.validPassword(password))
			return done(null, false, req.flash('loginMessage', req.gettext('Wrong password.')))

		return done(null, user)
	})
}))

function init(app) {
	// Auth
	app.use(session({secret: settings.base.secret}));
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session
}


module.exports = {
	init: init,
	passport: passport
}

