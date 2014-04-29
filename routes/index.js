

var express = require('express');
var app = module.exports = express();
var nunjucks = require('nunjucks');

nunjucks.configure('views', {
	autoescape: true, express: app});
app.use(express.static(__dirname));


app.get('/', function(req, res){
	res.render('index.html');
});


