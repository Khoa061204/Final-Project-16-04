var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");
require("dotenv").config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require("./routes/auths"); // Authentication routes
var githubRouter = require("./routes/github"); // GitHub routes

var app = express();

// View engine setup (Jade/Pug)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: "http://localhost:3000", // Allow frontend requests
  credentials: true
}));


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use("/api/auth", authRouter); // Authentication routes
app.use("/api/github", githubRouter); // GitHub routes

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;
//abcxyz
