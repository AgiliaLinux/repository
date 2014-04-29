
var mongoose = require('mongoose')
var schemas = require('schemas')

exports.Package = mongoose.model('Package', schemas.packageSchema)