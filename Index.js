const mongoose = require('mongoose')
mongoose.connect("mongodb://localhost:27017/classyComforts");
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session')
const passport = require('passport')
const userRoute = require('./routes/userRoute');
const bodyparser = require('body-parser');
const app = express();
require('./passportSetup')

app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);



app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(passport.initialize());
app.use(passport.session());
app.use('/user', userRoute);

app.listen(5000, () => {
  console.log('Server is running');
});
