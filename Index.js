const express = require('express');
const path = require('path');
const ejs = require('ejs');
const userRoute = require('./routes/userRoute');
const bodyparser = require('body-parser');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use('/user', userRoute);

app.listen(4000, () => {
  console.log('Server is running');
});
