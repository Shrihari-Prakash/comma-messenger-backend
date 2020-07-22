//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const dotenv = require('dotenv');
dotenv.config({path: __dirname + '/.env'});

console.log(__dirname + '/.env')

const RESTv1 = require("./rest/v1/middleware");

/* app.use(cors()); */
//we need to allow requests from outside our own domain.
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers","Authorization"
  );
  next();
});

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(require('express-session')({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

//API v1 routes.

app.use("/api/rest/v1", RESTv1);

module.exports = app;
