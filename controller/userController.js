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

exports.homeGet = async (req, res) => {
    try {
        await res.render('home')
    } catch (error) {
        console.error("Error rendering home: ", error);
        res.status(500).send('Internet Server Error')
    }

}

exports.signupGet = async (req, res) => {
    try {
        await res.render('signup', { errors: '' });
    } catch (error) {
        console.error("Error rendering singup: ", error);
        res.status(500).send('Internet Server Error');
    }
};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}


exports.signupPost = [
    check('name')
        .notEmpty().withMessage('Name is Required')
        .custom(value => {
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(value)) {
                throw new Error('Name should contain only letters');
            }
            return true;
        }),
    check('email').notEmpty().withMessage('Email is Required'),
    check('phone').notEmpty().withMessage('Phone is Required'),
    check('password')
        .notEmpty().withMessage('Password is Required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('confirmpassword')
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

            // Generate OTP
            const otp = generateOTP(); // You need to implement generateOTP function
            console.log(otp)
            // Send OTP to user's email
            const mailOptions = {
                from: process.env.EMAIL_ID,
                to: email,
                subject: 'OTP for Signup',
                text: `Your OTP for signup is: ${otp}`,
            };

            await transporter.sendMail(mailOptions);

            // Save user and OTP to session for verification
            req.session.newUser = {
                name,
                email,
                phone,
                password: hashedPassword,
                otp,
            };
            req.session.save()
            res.redirect('/user/verifyotp'); // Render OTP page
        } catch (error) {
            console.error("Error saving to database", error);
        }
    },
]

exports.verifyOTPGet = async (req, res) => {
    try {
        res.render('otppage')
    } catch (error) {
        console.error('Error rendering otppage: ', error)
    }
}



exports.verifyOTP = async (req, res) => {
    const { otp } = req.body;
    console.log(otp)
    const finotp = parseInt(otp)
    const newUser = req.session.newUser;
    console.log(newUser)
    console.log(newUser.otp)
    if (newUser.otp !== finotp) {
        return res.render('otppage', { errors: 'Invalid OTP' });
    } else {
        // Save user to the database
        const { name, phone, password, email } = newUser;
        const isAdmin = 0;
        console.log(name, phone, password, email)
        const user = new User({
            name,
            email,
            phone,
            password,
            isAdmin,
        });
        await user.save();
        // Clear the session data
        req.session.newUser = null;
        res.render('home');
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
            res.render("home")
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



exports.forgotPasswordGet = async (req, res) => {

    try {
        return res.render('forgotpassword', { errors: '' });
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
        return res.render('resetpassword', { id, token, email: user.email });
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

