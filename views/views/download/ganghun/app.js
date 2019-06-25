var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql      = require('mysql');

var index = require('./routes/index');
var user = require('./routes/user');
var drive = require('./routes/drive');
var login = require('./routes/login');
var register = require('./routes/register');

var passport = require('passport');
var session = require('express-session');

//port
passport.serializeUser(function(user, done) {
  console.log('serialized');
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  console.log('deserialized');
  done(null, user);
});


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  port     : 3306,
  database : 'dropbox',
  //insecureAuth : true
});

app.use(session({
  secret: 'secrettexthere',
  saveUninitialized: true,
  resave: true
}));

app.use(express.static('public'));
app.use(express.static('views'));

app.use(passport.initialize());
app.use(passport.session());
app.use('/', index);
app.use('/user', user);
app.use('/drive', drive);
app.use('/login', login);
app.use('/register', register);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var server = app.listen(3000);
module.exports = app;
