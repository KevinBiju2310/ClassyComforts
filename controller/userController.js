const { check, validationResult } = require('express-validator');


exports.signupGet = (req, res) => {
    res.render('signup', { errors: '' });
};

exports.signupPost = [
    check('name').trim().notEmpty().withMessage('Name is Required'),
    check('email').notEmpty().withMessage('Email is Required'),
    check('phone').notEmpty().withMessage('Phone is Required'),
    check('password').notEmpty().withMessage('Password is Required'),
    check('confirmpassword').notEmpty().withMessage('Confirm Password is Required'),
    (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('signup', { errors: errors.mapped() });
        }
        res.send('Signup successful!');
    },
];

exports.signinGet = (req, res) => {
    res.render('signin', { errors: '' });
};

exports.signinPost = [
    check('email').isEmail().notEmpty().withMessage('Email is Required'),
    check('password').notEmpty().withMessage('Password is required'),
    (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('signin', { errors: errors.mapped() });
        }
        res.send("signin successfull")
    },
];
