const { check, validationResult } = require('express-validator');
const User = require('../modal/userModal')
const bcrypt = require('bcrypt')
const passport = require('passport')
require('../passportSetup')

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
    check('email').isEmail().notEmpty().withMessage('Email is Required'),
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