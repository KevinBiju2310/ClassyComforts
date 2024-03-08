const { check, validationResult } = require('express-validator');
const User = require('../modal/userModal')
const bcrypt = require('bcrypt')
const passport = require('passport')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
require('dotenv').config()
require('../passportSetup')

const emailConfig = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.PASS_ID,
    },
};

const transporter = nodemailer.createTransport(emailConfig);

exports.signupGet = (req, res) => {
    res.render('signup', { errors: '' });
};

exports.signupPost = [
    check('name').trim().notEmpty().withMessage('Name is Required').custom(value => {
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(value)) {
            throw new Error('Name should contain only letters');
        }
        return true;
    }),
    check('email').trim().notEmpty().withMessage('Email is Required'),
    check('phone').trim().notEmpty().withMessage('Phone is Required'),
    check('password').trim().notEmpty().withMessage('Password is Required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('confirmpassword').trim().notEmpty().withMessage('Confirm Password is Required').custom((val, { req }) => {
        if (val !== req.body.password) {
            throw new Error('Passwords do not match')
        }
        return true;
    }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('signup', { errors: errors.mapped() });
        }
        try {
            const { name, email, phone, password } = req.body;
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = new User({
                name,
                email,
                phone,
                password: hashedPassword,
            });

            await newUser.save();
            res.send('Signup successful!');
        } catch (error) {
            console.error("Error saving to database", error);
        }
    },
];

exports.signinGet = (req, res) => {
    res.render('signin', { errors: '' });
};

exports.signinPost = [
    check('email').trim().isEmail().notEmpty().withMessage('Email is Required'),
    check('password').notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('signin', { errors: errors.mapped() });
        }
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email })
            if (!user) {
                return res.render('signin', { errors: { email: { msg: 'Invalid email' } } });
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.render('signin', { errors: { password: { msg: 'Invalid password' } } });
            }
            res.send("signin successfull")
        } catch (error) {
            console.error("Error in signing in" + error)
        }

    },
];



exports.googleSignIn = passport.authenticate('google', {
    scope: ['profile'],
});

exports.googleSignInCallback = passport.authenticate('google', {
    successRedirect: '/user/auth/protected',
    failureRedirect: '/user/auth/google/failure',
});

exports.googleSignInFailure = (req, res) => {
    res.send('Something went wrong with Google Sign-In!');
};

exports.protectedRoute = (req, res) => {
    res.send(`Hello ${req.user.displayName}`);
};

exports.logout = (req, res) => {
    req.logout();
    res.send('See you again!');
};

exports.forgotPasswordGet = (req, res) => {
    res.render('forgotpassword', { errors: '' });
};


exports.forgotPasswordPost = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.send("User not registered");
        }

        const secret = process.env.JWT_SECRET + user.password;
        const payload = { email: user.email, id: user.id };
        const token = jwt.sign(payload, secret, { expiresIn: '15m' });
        const link = `http://localhost:5000/user/resetpassword/${user.id}/${token}`;

        const mailOptions = {
            from: process.env.EMAIL_ID,
            to: user.email,
            subject: 'Password Reset Link',
            text: `Click the link to reset your password: ${link}`,
        };

        await transporter.sendMail(mailOptions);
        return res.send('Password reset link sent to email');
    } catch (error) {
        console.error(error.message);
        return res.send(error.message);
    }
};


exports.resetPasswordGet = async (req, res) => {
    const { id, token } = req.params;
    
    try {
        const user = await User.findById(id);

        if (!user) {
            return res.send('Invalid ID');
        }

        const secret = process.env.JWT_SECRET + user.password;
        const payload = jwt.verify(token, secret);
        return res.render('resetpassword', { id,token,email: user.email });
    } catch (error) {
        console.error(error.message);
        return res.send(error.message);
    }
};

exports.resetPasswordPost = async (req, res) => {
    const { id, token } = req.params;
    const { password, password2 } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('resetpassword', {
            errors: errors.array(),
            email: req.body.email,
        });
    }

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.send('Invalid ID');
        }

        const secret = process.env.JWT_SECRET + user.password;
        const payload = jwt.verify(token, secret);
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.updateOne({ _id: user._id }, { password: hashedPassword });
        return res.send('Password updated successfully.');
    } catch (error) {
        console.error(error.message);
        return res.send(error.message);
    }
};

