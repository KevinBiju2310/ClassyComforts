const { check, validationResult } = require('express-validator')
const User = require('../modal/userModal')
const bcrypt = require('bcrypt')


exports.signInGet = async (req, res) => {
    try {
        await res.render('login', { errors: '' });
    } catch (error) {
        console.error("Error rendering signin: ", error);
        res.status(500).send('Internet Server Error');
    }
};


exports.signInPost = [
    check('email').trim().isEmail().notEmpty().withMessage('Email is Required'),
    check('password').notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('login', { errors: errors.mapped() })
        }
        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email })
            if (!user) {
                res.render('login', { errors: { email: { msg: "User not found " } } })
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.render('login', { errors: { password: { msg: 'Incorrect password' } } });
            }
            if (user.isAdmin == 1) {
                return res.redirect('/admin/dashboard');
            } else {
                return res.status(403).send('Forbidden');
            }
        } catch (error) {

        }
    }
]

exports.dashboardGet = async (req, res) => {
    try {
        await res.render('dashboard');
    } catch (error) {
        console.error("Error rendering dashboard: ", error);
        res.status(500).send('Internet Server Error');
    }
}

exports.userlistGet = async (req, res) => {
    try {
        const users = await User.find({isAdmin:{$ne:"1"}})
        res.render('userlist', { users });
    } catch (error) {
        console.error("Error rendering dashboard: ", error);
        res.status(500).send('Internet Server Error');
    }
}

exports.toggleUserBlock = async (req, res) => {
    const userId = req.params.id;
    console.log(userId)
    try {
        const user = await User.findById(userId);
        console.log(user)
        if (!user) {
            return res.status(404).send('User not found');
        }
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({ status: user.isBlocked ? 'Blocked' : 'Unblocked' });
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).send('Internal Server Error');
    } 
};

exports.blockUser = async (req, res) => {
    const userId = req.params.id;
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        res.redirect('/admin/userlist');
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.unblockUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        res.redirect('/admin/userlist');
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.categoryGet = async (req, res) => {
    try {
        await res.render('category')
    } catch (error) {
        console.error("Error rendering Cateory: ", error);
        res.status(500).send('Internet Server Error');
    }
}