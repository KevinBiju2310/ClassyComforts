const User = require('../modal/userModal')

exports.isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        // Check if the user is blocked
        if (req.session.user.isBlocked) {
            // If the user is blocked, redirect to login page
            res.redirect('/user/signin');
        } else {
            // If the user is not blocked, proceed to the next middleware
            next();
        }
    } else {
        // If there is no user session, redirect to login page
        res.redirect('/user/signin');
    }
}

exports.isAdminLogin = async (req, res, next) => {
    try {
        if (req.session.adminId) {
            // Check if the user is an admin (isAdmin === '1')
            const user = await User.findById(req.session.adminId);
            if (user && user.isAdmin === '1') {
                next();
            } else {
                res.redirect('/admin/login');
            }
        } else {
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}


