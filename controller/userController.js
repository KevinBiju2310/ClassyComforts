const { check, validationResult } = require('express-validator');
const User = require('../modal/userModal')
const Product = require('../modal/productModel')
const Category = require('../modal/categoryModel')
const bcrypt = require('bcrypt')
const passport = require('passport')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
require('dotenv').config()
require('../passportSetup')

const emailConfig = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.PASS_ID,
    },
};

const transporter = nodemailer.createTransport(emailConfig);

exports.homeGet = async (req, res) => {
    try {
        const products = await Product.find({ deleted: false });
        res.status(200).render('home', { products });
    } catch (error) {
        console.error("Error rendering home: ", error);
        res.status(500).send('Internet Server Error')
    }
}

exports.signupGet = async (req, res) => {
    try {
        await res.status(200).render('signup', { errors: '' });
    } catch (error) {
        console.error("Error rendering singup: ", error);
        res.status(500).send('Internet Server Error');
    }
};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}


exports.signupPost = [
    // Validation checks
    check('name').trim()
        .notEmpty().withMessage('Name is Required')
        .isAlpha().withMessage('Name should contain only letters'),
    check('email').trim().notEmpty().withMessage('Email is Required').isEmail().withMessage('Invalid Email'),
    check('phone').trim().notEmpty().withMessage('Phone is Required'),
    check('password').trim()
        .notEmpty().withMessage('Password is Required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('confirmpassword').trim()
        .notEmpty().withMessage('Confirm Password is Required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
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

            // Generate and send OTP
            const otp = generateOTP();
            console.log(otp)
            const mailOptions = {
                from: process.env.EMAIL_ID,
                to: email,
                subject: 'OTP for Signup',
                text: `Your OTP for signup is: ${otp}`,
            };
            await transporter.sendMail(mailOptions);

            // Save user data and OTP to session
            req.session.user = {
                name,
                email,
                phone,
                password: hashedPassword,
                otp,
            };
            res.status(200).redirect('/user/verifyotp');
        } catch (error) {
            console.error("Error signing up:", error);
            res.status(500).send('Internal Server Error');
        }
    },
];


exports.verifyOTPGet = async (req, res) => {
    try {
        res.render('otppage')
    } catch (error) {
        console.error('Error rendering otppage: ', error)
    }
}



exports.verifyOTP = async (req, res) => {
    const { otp } = req.body;
    const newUser = req.session.user;
    if (newUser && newUser.otp === parseInt(otp)) {
        const { name, phone, password, email } = newUser;
        const isAdmin = 0;
        try {
            const user = new User({ name, email, phone, password, isAdmin });
            await user.save();
            req.session.user = user;
            res.redirect('/user/home');
        } catch (error) {
            console.error("Error saving user to database:", error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.render('otppage', { errors: 'Invalid OTP' });
    }
};

exports.signinGet = async (req, res) => {
    try {
        await res.render('signin', { errors: '' });
    } catch (error) {
        console.error("Error rendering signin: ", error);
        res.status(500).send('Internet Server Error');
    }

};


exports.signinPost = [
    check('email').trim().isEmail().notEmpty().withMessage('Email is Required'),
    check('password').trim().notEmpty().withMessage('Password is required'),
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

            if (user.isBlocked) {
                return res.render('signin', { errors: { email: { msg: 'This email address is blocked.' } } });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.render('signin', { errors: { password: { msg: 'Invalid password' } } });
            }
            req.session.user = user;
            res.redirect('/user/home')
        } catch (error) {
            console.error("Error in signing in" + error)
        }
    },
];

exports.logoutuser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/user/home');
        }
    });
};


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
    res.redirect('/user/home');
};

exports.logout = (req, res) => {
    req.logout();
    res.send('See you again!');
};



exports.forgotPasswordGet = async (req, res) => {
    try {
        return res.status(200).render('forgotpassword', { errors: '' });
    } catch (error) {
        console.error("Error rendering forgotpassword: ", error)
    }
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
        console.log(link)
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
        return res.status(200).render('resetpassword', { id, token, email: user.email });
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



exports.shoppageGet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 12;


        let query = { deleted: false }
        if (req.query.category) {
            query.category = req.query.category;
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / perPage);
        const skip = (page - 1) * perPage;

        const products = await Product.find(query).skip(skip).limit(perPage);
        const category = await Category.find({ deleted: false });
        res.status(200).render('shop', { products, category, totalPages, currentPage: page });
    } catch (error) {
        console.log("Error Occured");
    }
}
