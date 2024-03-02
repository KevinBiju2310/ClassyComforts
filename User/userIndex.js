const express = require("express")
const path = require("path")
const {check ,validationResult}  = require("express-validator")
const ejs = require("ejs")
const app = express()
const bodyparser = require("body-parser")

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({extended:true}))
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/',(req,res)=>{
    res.render('signup',{errors : ''})
})
app.post('/send',[
    check('name').trim().notEmpty().withMessage('Name is Required'),
    check('email').notEmpty().withMessage('Email is Required'),
    check('phone').notEmpty().withMessage('Phone is Required'),
    check('password').notEmpty().withMessage('Password is Required'),
    check('confirmpassword').notEmpty().withMessage('Confirm Password is Required')
],(req,res)=>{
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        res.render('signup',{errors : errors.mapped()})
    }
})


app.listen(4000,()=>{
    console.log("Server is running")
})