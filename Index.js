const mongoose = require('mongoose')
mongoose.connect("mongodb+srv://classyComforts:classyComforts1234@clustercc.7oa4bdn.mongodb.net/")
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session')
const passport = require('passport')
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const bodyparser = require('body-parser');
const app = express();
const nocache = require('nocache');
require('dotenv').config();

app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);


app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.set('views', [path.join(__dirname, 'views/admin'), path.join(__dirname, 'views/user')]);

app.use(passport.initialize());
app.use(passport.session());

app.use('/admin', adminRoute);
app.use('/user', userRoute);

app.use('/user/*', (req, res) => {
  res.redirect('/user/pagenotfound')
})

app.use(nocache());

app.listen(5000, () => {
  console.log('Server is running');
});
