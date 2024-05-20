const { check, validationResult } = require('express-validator')
const User = require('../modal/userModal')
const bcrypt = require('bcrypt');
const Order = require('../modal/orderModel');
const Product = require('../modal/productModel');
const moment = require("moment")
const PDFDocument = require('pdfkit-table');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path')
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
        // Calculate total revenue (sum of totalAmount for delivered orders)
        const totalRevenue = await Order.aggregate([
            { $match: { orderStatus: 'delivered' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        // Calculate total number of delivered orders
        const totalDeliveredOrders = await Order.countDocuments({ orderStatus: 'delivered' });

        // Calculate total number of products
        const totalProducts = await Product.countDocuments({ deleted: false });

        const totalCategories = await Product.distinct('category', { deleted: false });
        console.log(totalCategories.length)

        // Calculate monthly earning of the current month
        const currentDate = new Date();
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const monthlyEarning = await Order.aggregate([
            { $match: { createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: null, monthlyEarning: { $sum: '$totalAmount' } } }
        ]);

        // Calculate top 10 products based on the count of product orders
        const topProducts = await Order.aggregate([
            { $match: { orderStatus: 'delivered' } },
            { $unwind: "$products" }, // Split array of products into separate documents
            { $group: { _id: "$products.productId", totalOrders: { $sum: 1 } } }, // Group by product ID and count the orders
            { $sort: { totalOrders: -1 } }, // Sort by totalOrders in descending order
            { $limit: 10 } // Limit to top 10 products
        ]);

        // Fetch product details for top products
        const topProductDetails = await Product.find({ _id: { $in: topProducts.map(p => p._id) } });

        // Combine product details with total orders count
        const topProductsData = topProducts.map(product => {
            const productDetail = topProductDetails.find(p => p._id.equals(product._id));
            return {
                _id: productDetail._id,
                productName: productDetail.productname,
                description: productDetail.description,
                productImages: productDetail.productImages,
                totalOrders: product.totalOrders
            };
        });

        // Aggregate count of products ordered per category
        const topCategories = await Order.aggregate([
            { $match: { orderStatus: 'delivered' } },
            { $unwind: "$products" }, // Split array of products into separate documents
            { $lookup: { from: 'products', localField: 'products.productId', foreignField: '_id', as: 'productInfo' } }, // Lookup product details
            { $unwind: "$productInfo" }, // Unwind the productInfo array
            { $group: { _id: "$productInfo.category", totalOrders: { $sum: 1 } } }, // Group by category and count orders
            { $sort: { totalOrders: -1 } }, // Sort by totalOrders in descending order
            { $limit: 10 } // Limit to top 10 categories
        ]);
        res.render('dashboard', {
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0,
            totalDeliveredOrders,
            totalProducts: totalProducts,
            totalCategories: totalCategories.length,
            monthlyEarning: monthlyEarning.length > 0 ? monthlyEarning[0].monthlyEarning : 0,
            topProducts: topProductsData,
            topCategories
        });
    } catch (error) {
        console.error("Error rendering dashboard: ", error);
        res.status(500).send('Internal Server Error');
    }
}



exports.sortGraph = async (req, res) => {
    const interval = req.query.interval;
    let labels = [];
    let values = [];

    try {
        if (interval === 'monthly') {
            // Get orders for the current year, grouped by month
            const orders = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'delivered',
                        createdAt: {
                            $gte: new Date(new Date().getFullYear(), 0, 1),
                            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Populate labels and values arrays
            labels = Array.from({ length: 12 }, (_, i) => moment(new Date(null, i)).format('MMM'));
            values = Array.from({ length: 12 }, (_, i) => 0);
            orders.forEach(order => {
                const month = order._id - 1;
                values[month] = order.count;
            });
        } else if (interval === 'yearly') {
            // Get orders for the next 5 years, grouped by year
            const currentYear = new Date().getFullYear();
            const orders = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'delivered',
                        createdAt: {
                            $gte: new Date(currentYear, 0, 1),
                            $lt: new Date(currentYear + 5, 0, 1)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $year: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Populate labels and values arrays
            labels = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());
            values = Array.from({ length: 5 }, () => 0);
            orders.forEach(order => {
                const year = order._id - currentYear;
                values[year] = order.count;
            });
        } else if (interval === 'weekly') {
            // Get orders for the current week, grouped by day
            const currentDate = new Date();
            const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
            console.log("start", startOfWeek, endOfWeek)
            const orders = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'delivered',
                        createdAt: {
                            $gte: startOfWeek,
                            $lte: endOfWeek
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfWeek: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Populate labels and values arrays
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            values = Array.from({ length: 7 }, () => 0);
            orders.forEach(order => {
                const dayIndex = order._id - 1;
                values[dayIndex] = order.count;
            });
        }

        res.json({ labels, values });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
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


exports.searchUser = async (req, res) => {
    try {
        const searchTerm = req.query.term;
        console.log(searchTerm)
        // Construct regex to perform case-insensitive search
        const searchRegex = new RegExp(searchTerm, 'i');
        console.log(searchRegex)
        // Perform search on name and email fields
        const users = await User.find({
            $or: [
                { name: { $regex: searchRegex } },
                { email: { $regex: searchRegex } }
            ]
        });
        console.log(users);
        res.json({ users });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};





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



exports.searchOrder = async (req, res) => {
    try {
        const searchTerm = req.query.term;

        const populatedOrders = await Order.find({})
            .populate('userId')
            .populate('products.productId')
            .exec();

        const orders = populatedOrders.filter(order => {
            return (
                order.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.products.some(product => product.productId.productname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                order.orderStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to search orders' });
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
            console.log(startDate, endDate)
        } else if (filterType === 'month') {
            startDate = new Date();
            startDate.setDate(1); // Start of current month
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // End of current month
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
        } else if (filterType === 'custom') {
            startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            startDate.setHours(0, 0, 0, 0);
            endDate = req.query.endDate ? new Date(req.query.endDate) : null;
            endDate.setHours(23, 59, 59, 999);
        }

        // Query total orders based on date range
        const query = {
            orderStatus: 'delivered'
        };

        if (startDate && endDate) {
            query.updatedAt = { $gte: startDate, $lte: endDate };
        }

        // Query total orders based on date range
        totalOrders = await Order.countDocuments(query);

        // Calculate total pages and skip
        totalPages = Math.ceil(totalOrders / perPage);
        skip = (page - 1) * perPage;

        // Query orders based on date range with pagination
        const order = await Order.find(query)
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
            filterType,
            startDate: startDate ? startDate.toISOString().slice(0, 10) : null,
            endDate: endDate ? endDate.toISOString().slice(0, 10) : null
        });
    } catch (error) {
        console.log("Error Happened: ", error);
    }
}


exports.downloadPDF = async (req, res) => {
    try {
        // Get filter type from query parameters
        const filterType = req.query.filter || 'day'; // Default to 'day' if no filter specified
        console.log(filterType)
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
        } else if (filterType === 'custom') {
            startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            startDate.setHours(0, 0, 0, 0);
            endDate = req.query.endDate ? new Date(req.query.endDate) : null;
            endDate.setHours(23, 59, 59, 999);
        }

        // Query total orders based on date range
        const query = {
            orderStatus: 'delivered'
        };

        if (startDate && endDate) {
            query.updatedAt = { $gte: startDate, $lte: endDate };
        }

        // Query total orders based on date range
        totalOrders = await Order.countDocuments(query);

        // Calculate total pages and skip
        totalPages = Math.ceil(totalOrders / perPage);
        skip = (page - 1) * perPage;

        // Query orders based on date range with pagination
        const order = await Order.find(query)
            .populate('userId')
            .populate('products.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage);

        let overallSalesCount = 0;
        let overallDiscountTotal = 0;
        let overallTotalAmount = 0;

        order.forEach(order => {
            overallSalesCount += 1;
            overallDiscountTotal += order.couponAmount;
            overallTotalAmount += order.totalAmount;
        });

        // Create a new PDF document
        const doc = new PDFDocument({ margin: 30 });
        const filename = 'sales_report.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Write content to the PDF
        doc.fontSize(16).text('Sales Report', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Filter Type: ${filterType}`).moveDown();

        // Add order data as a table
        doc.font('Helvetica-Bold').text('Order Details').moveDown();
        console.log(order)

        doc.font('Helvetica').fontSize(10).lineGap(8);
        doc.font('Helvetica').table({
            headers: ['Customer Name', 'Product Name', 'Payment Method', 'Quantity', 'Price', 'Discount', 'Total Amount'],
            rows: order.map(o => [
                o.userId.name,
                o.products.map(p => p.productId.productname).join('\n'),
                o.paymentMethod,
                o.products.map(p => p.quantity).join('\n'),
                o.products.map(p => `$${p.productPrice.toFixed(2)}`).join('\n'),
                `$${o.couponAmount.toFixed(2)}`,
                `$${o.totalAmount.toFixed(2)}`
            ]),

        });

        doc.fontSize(8).text(`Sales Count: ${overallSalesCount}`, { align: 'right' })
        doc.fontSize(8).text(`Discount Total: $${overallDiscountTotal.toFixed(2)}`, { align: 'right' });
        doc.fontSize(8).text(`Total Amount: $${overallTotalAmount.toFixed(2)}`, { align: 'right' });

        // End the document
        doc.end();

    } catch (error) {
        console.log("Error Happened: ", error);
    }
}






exports.downloadExcel = async (req, res) => {
    try {
        const filterType = req.query.filter || 'day';
        console.log(filterType)

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
        } else if (filterType === 'custom') {
            startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            startDate.setHours(0, 0, 0, 0);
            endDate = req.query.endDate ? new Date(req.query.endDate) : null;
            endDate.setHours(23, 59, 59, 999);
        }

        // Query total orders based on date range
        const query = {
            orderStatus: 'delivered'
        };

        if (startDate && endDate) {
            query.updatedAt = { $gte: startDate, $lte: endDate };
        }

        // Query total orders based on date range
        totalOrders = await Order.countDocuments(query);

        // Calculate total pages and skip
        totalPages = Math.ceil(totalOrders / perPage);
        skip = (page - 1) * perPage;

        // Query orders based on date range with pagination
        const orders = await Order.find(query)
            .populate('userId')
            .populate('products.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage);


        let overallSalesCount = 0;
        let overallDiscountTotal = 0;
        let overallTotalAmount = 0;

        orders.forEach(order => {
            overallSalesCount += 1;
            overallDiscountTotal += order.couponAmount;
            overallTotalAmount += order.totalAmount;
        });

        console.log(orders)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        const header = worksheet.addRow(['Customer Name', 'Product Name', 'Payment Method', 'Quantity', 'Price', 'Discount', 'Total Amount']);
        header.font = { bold: true };
        header.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' }
        }

        worksheet.getColumn(1).width = 20; // Customer Name
        worksheet.getColumn(2).width = 30; // Product Name
        worksheet.getColumn(3).width = 25; // Payment Method
        worksheet.getColumn(4).width = 10; // Quantity
        worksheet.getColumn(5).width = 10; // Price
        worksheet.getColumn(6).width = 20; // Discount
        worksheet.getColumn(7).width = 22; // Total Amount

        orders.forEach(order => {
            order.products.forEach(product => {
                const { userId, paymentMethod, totalAmount, couponAmount } = order;
                const { productId, quantity, productPrice } = product;
                worksheet.addRow([userId.name, productId.productname, paymentMethod, quantity, productPrice, couponAmount, totalAmount]);
            });
        });


        const summaryRow = worksheet.addRow([
            `Sales Count: ${overallSalesCount}`,
            '',
            '',
            '',
            '',
            `Discount Total: $${overallDiscountTotal.toFixed(2)}`,
            `Total Amount: $${overallTotalAmount.toFixed(2)}`
        ]);

        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDDDDD' }
        };
        // Save workbook to a file or stream
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
        await workbook.xlsx.write(res)
    } catch (error) {
        console.log("Excel Download Failed: ", error);
    }
}







exports.logoutadmin = async (req, res) => {
    try {
        req.session.adminId = null;
        res.redirect('/admin/login')
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}