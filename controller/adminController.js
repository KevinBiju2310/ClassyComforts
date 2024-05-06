const { check, validationResult } = require('express-validator')
const User = require('../modal/userModal')
const bcrypt = require('bcrypt');
const Order = require('../modal/orderModel')
const Product = require('../modal/productModel')
const Category = require('../modal/categoryModel')


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
    check('password').trim().notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('login', { errors: errors.mapped() })
        }
        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) {
                res.render('login', { errors: { email: { msg: "User not found " } } })
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.render('login', { errors: { password: { msg: 'Incorrect password' } } });
            }
            if (user.isAdmin == 1) {
                req.session.adminId = user._id;
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
        const page = parseInt(req.query.page) || 1;
        const perPage = 7;
        const totalUsers = await User.countDocuments({ isAdmin: { $ne: "1" } });
        const totalPages = Math.ceil(totalUsers / perPage);
        const skip = (page - 1) * perPage;
        const users = await User.find({ isAdmin: { $ne: "1" } }).skip(skip).limit(perPage);
        res.render('userlist', { users, totalPages, currentPage: page });
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
        if (req.session.user && req.session.user._id.toString() === userId) {
            req.session.user.isBlocked = user.isBlocked;
        }
        await user.save();
        res.status(200).json({ status: user.isBlocked ? 'Blocked' : 'Unblocked' });
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).send('Internal Server Error');
    }
};

// exports.blockUser = async (req, res) => {
//     const userId = req.params.id;
//     try {
//         const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
//         if (!updatedUser) {
//             return res.status(404).send('User not found');
//         }

//         res.redirect('/admin/userlist');
//     } catch (error) {
//         console.error('Error blocking user:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

// exports.unblockUser = async (req, res) => {
//     const userId = req.params.id;

//     try {
//         const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });

//         if (!updatedUser) {
//             return res.status(404).send('User not found');
//         }

//         res.redirect('/admin/userlist');
//     } catch (error) {
//         console.error('Error unblocking user:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };


// Admin
exports.orderGet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 7;
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / perPage);
        const skip = (page - 1) * perPage;

        const order = await Order.find()
            .populate('userId')
            .populate('products.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage);

        res.render('orders', {
            order,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.log("Error Happened: ", error);
    }
}


exports.updateOrderStatus = async (req, res) => {
    const orderId = req.params.orderId;
    const { newStatus } = req.body;
    console.log(newStatus);
    try {
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { orderStatus: newStatus }, { new: true });

        if (newStatus === 'cancelled') {
            const order = await Order.findById(orderId).populate('products.productId');

            for (const productItem of order.products) {
                const product = await Product.findById(productItem.productId);
                if (product) {
                    product.quantity += productItem.quantity;
                    await product.save();
                }
            }
        } else if (newStatus === 'shipped') {
            const order = await Order.findById(orderId).populate('products.productId');

            for (const productItem of order.products) {
                const product = await Product.findById(productItem.productId);
                if (product) {
                    product.quantity -= productItem.quantity;
                    await product.save();
                }
            }
        } else if (newStatus === 'delivered') {
            const order = await Order.findByIdAndUpdate(orderId, { paymentStatus: "success" }, { new: true })
            await order.save();
        }
        res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};


//Sales Report
exports.salesreport = async (req, res) => {
    try {
        // Get filter type from query parameters
        const filterType = req.query.filter || 'day'; // Default to 'day' if no filter specified

        // Initialize variables for pagination
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;
        let totalOrders, totalPages, skip;

        // Calculate date range based on filter type
        let startDate, endDate;
        if (filterType === 'day') {
            startDate = new Date(); // Today's date
            startDate.setHours(0, 0, 0, 0); // Set time to the beginning of the day
            endDate = new Date(); // Today's date
            endDate.setHours(23, 59, 59, 999); // Set time to the end of the day
        } else if (filterType === 'week') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week (Sunday)
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End of current week (Saturday)
            endDate.setHours(23, 59, 59, 999);
        } else if (filterType === 'month') {
            startDate = new Date();
            startDate.setDate(1); // Start of current month
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // End of current month
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
        }

        // Query total orders based on date range
        totalOrders = await Order.countDocuments({
            orderStatus: 'delivered',
            updatedAt: { $gte: startDate, $lte: endDate }
        });

        // Calculate total pages and skip
        totalPages = Math.ceil(totalOrders / perPage);
        skip = (page - 1) * perPage;

        // Query orders based on date range with pagination
        const order = await Order.find({
            orderStatus: 'delivered',
            updatedAt: { $gte: startDate, $lte: endDate }
        })
            .populate('userId')
            .populate('products.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage);

        // Render the salesreport view with data
        res.render('salesreport', {
            order,
            currentPage: page,
            totalPages,
            filterType // Pass filter type to the view for display
        });
    } catch (error) {
        console.log("Error Happened: ", error);
    }
}


