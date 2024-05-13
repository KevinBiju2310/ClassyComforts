const Product = require('../modal/productModel');
const Cart = require('../modal/cartModel');
const Address = require('../modal/addressModel');
const Order = require('../modal/orderModel');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Wallet = require("../modal/walletModel");
const Coupon = require('../modal/couponModel');
const PDFDocument = require('pdfkit-table');
const fs = require('fs');


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


exports.orderconfirm = (req, res) => {
    try {
        res.render('orderSuccessfull');
    } catch (error) {

    }
}



const checkedProducts = [];



exports.checkoutPageGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/signin');
        }
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });
        const cart = await Cart.findOne({ userId });
        const coupons = await Coupon.find();

        res.render('checkout', { addresses, checkedProducts, cart, coupons });

    } catch (error) {
        console.error('Error getting checkoutpage:', error);
        res.status(500).send('Internal Server Error');
    }
}



exports.checkoutPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/signin');
        }

        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });
        const cart = await Cart.findOne({ userId });
        const coupons = await Coupon.find();

        const checkedProductsIds = req.body.checkedProducts;
        checkedProducts.length = 0;

        for (const item of cart.products) {
            if (checkedProductsIds.includes(item.productId.toString())) {
                const product = await Product.findById(item.productId);
                if (product) {
                    checkedProducts.push({
                        productId: product,
                        quantity: item.quantity,
                        productPrice: item.productPrice
                    });
                }
                console.log(checkedProducts);
            }
        }
        res.render('checkout', { addresses, checkedProducts, cart, coupons });

    } catch (error) {
        console.error('Error processing checkout page:', error);
        res.status(500).send('Internal Server Error');
    }
}



exports.editAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const { name, phone, address, district, state, city, pincode, addressType } = req.body;

        await Address.findOneAndUpdate(
            { "items._id": addressId },
            {
                $set: {
                    "items.$.name": name,
                    "items.$.phone": phone,
                    "items.$.address": address,
                    "items.$.district": district,
                    "items.$.state": state,
                    "items.$.city": city,
                    "items.$.pincode": pincode,
                    "items.$.addressType": addressType
                }
            }
        );

        res.redirect('/user/checkout');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while editing the address');
    }
}

exports.addAddress = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send('Please log in to add an address');
        }

        const { name, phone, address, district, state, city, pincode, addressType } = req.body;
        const userId = req.session.user._id;

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                items: []
            });
        }

        userAddress.items.push({
            name,
            phone,
            address,
            district,
            state,
            city,
            pincode,
            addressType
        });

        await userAddress.save();
        res.redirect('/user/checkout');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while adding the address');
    }
}




exports.orderPlaced = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send('Please log in to place an order');
        }

        const userId = req.session.user._id;
        const addressId = req.body.selected_shipping_address;
        const totalValue = parseFloat(req.body.total);
        const paymentMethod = req.body.payment_option;
        const couponId = req.body.couponId || null;
        const subtotal = parseFloat(req.body.subtotal);
        console.log(subtotal);
        const cart = await Cart.findOne({ userId });

        const userAddresses = await Address.findOne({ userId }).populate('items');
        if (!userAddresses) {
            console.log("User's addresses not found for ID:", userId);
            return res.status(404).send("User's addresses not found");
        }
        const address = userAddresses.items.find(item => item._id.toString() === addressId.toString());
        if (!address) {
            console.log("Address not found for ID:", addressId);
            return res.status(404).send('Address not found');
        }

        let couponPercentage = 0;
        let couponAmount = 0;

        // Check if a coupon is provided
        if (couponId) {
            const coupon = await Coupon.findById(couponId);
            if (coupon) {
                couponPercentage = coupon.discountamount;
                couponAmount = (subtotal * couponPercentage) / 100;
            }
        }

        if (paymentMethod === 'cod') {
            if (totalValue >= 1000) {
                return res.json({ success: false, message: 'Above 1000 not allowed for Cash on Delivery' });
            }
            const order = new Order({
                userId,
                products: checkedProducts.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    productPrice: item.productPrice
                })),
                address: address,
                paymentMethod: paymentMethod,
                totalAmount: totalValue,
                couponPercentage,
                couponAmount
            });
            await order.save();

            for (const checkedProduct of checkedProducts) {
                const product = await Product.findById(checkedProduct.productId);
                if (product) {
                    product.quantity -= checkedProduct.quantity;
                    await product.save();
                }
            }
            await Cart.findOneAndUpdate(
                { userId },
                { $pull: { products: { productId: { $in: checkedProducts.map(item => item.productId) } } } }
            );
            await cart.save()

            checkedProducts.length = 0;

            return res.json({ success: true, message: 'Order placed successfully' });
        } else if (paymentMethod === 'razorpay') {
            console.log(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET)
            const options = {
                amount: totalValue * 100, // amount in smallest currency unit (paise)
                currency: 'INR',
                receipt: 'order_receipt_' + userId,
                payment_capture: 1 // auto capture payment
            };
            const razorpayOrder = await razorpayInstance.orders.create(options);
            console.log(razorpayOrder)
            const order = new Order({
                userId,
                products: checkedProducts.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    productPrice: item.productPrice
                })),
                address: address,
                paymentMethod: paymentMethod,
                totalAmount: totalValue,
                couponPercentage,
                couponAmount
            });
            await order.save();

            for (const checkedProduct of checkedProducts) {
                const product = await Product.findById(checkedProduct.productId);
                if (product) {
                    product.quantity -= checkedProduct.quantity;
                    await product.save();
                }
            }
            await Cart.findOneAndUpdate(
                { userId },
                { $pull: { products: { productId: { $in: checkedProducts.map(item => item.productId) } } } }
            );
            await cart.save()

            checkedProducts.length = 0;

            res.json({
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                orderID: order._id
            });
        } else if (paymentMethod === 'wallet') {
            const userWallet = await Wallet.findOne({ userId });
            if (!userWallet || userWallet.amount < totalValue) {
                return res.json({ success: false, message: 'Insufficient wallet balance' });
            }
            userWallet.transaction.push({
                date: new Date(),
                paymentMethod: paymentMethod,
                amount: -totalValue,
                paymentStatus: 'debit'
            });
            userWallet.amount -= totalValue;
            await userWallet.save();


            const order = new Order({
                userId,
                products: checkedProducts.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    productPrice: item.productPrice
                })),
                address: address,
                paymentMethod: paymentMethod,
                totalAmount: totalValue,
                paymentStatus: "success",
                couponPercentage,
                couponAmount
            });
            await order.save();
            for (const checkedProduct of checkedProducts) {
                const product = await Product.findById(checkedProduct.productId);
                if (product) {
                    product.quantity -= checkedProduct.quantity;
                    await product.save();
                }
            }
            await Cart.findOneAndUpdate(
                { userId },
                { $pull: { products: { productId: { $in: checkedProducts.map(item => item.productId) } } } }
            );
            await cart.save()

            checkedProducts.length = 0;

            return res.json({ success: true, message: 'Order placed successfully' });
        }
    } catch (error) {
        console.log("Error occurred: ", error);
        res.status(500).send('Error occurred while placing the order');
    }
}


exports.updatepaymentStatus = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderID } = req.body;

        // Verify the signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (generatedSignature === razorpay_signature) {
            // Update the order with the payment status
            const order = await Order.findById(orderID);
            order.paymentStatus = 'success';
            await order.save();

            res.status(200).json({ message: 'Payment successful' });
        } else {
            // Update the order with the payment status
            const order = await Order.findById(orderID);
            order.paymentStatus = 'failure';
            await order.save();

            for (const productItem of order.products) {
                const product = await Product.findById(productItem.productId);
                if (product) {
                    product.quantity += productItem.quantity;
                    await product.save();
                }
            }
            res.status(400).json({ message: 'Payment failed' });
        }

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Error verifying payment' });
    }
}



exports.retrypayment = async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const order = await Order.findById(orderId);
        console.log(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const options = {
            amount: order.totalAmount * 100,
            currency: 'INR',
            receipt: order._id.toString()
        };

        // Create a new Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create(options);

        return res.status(200).json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            orderID: order._id
        });
    } catch (error) {
        console.error('Error occurred:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}





exports.orderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId).populate('products.productId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('orderdetails', { order });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send('Internal server error');
    }
};



exports.generateInvoice = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        console.log(orderId);
        const order = await Order.findById(orderId).populate('products.productId');
        console.log(order);

        const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
        const filename = 'Invoice.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        // Company Name and Address
        doc.fillColor('#333333')
            .fontSize(18)
            .text('ClassyComforts', { align: 'left' })
            .moveDown()
        // Invoice Header
        doc.moveUp(2)
            .fillColor('#999999')
            .fontSize(16)
            .text('COMMERCIAL INVOICE', { align: 'right' });

        // Invoice Details
        const currentDate = new Date();
        doc.fillColor('#333333')
            .fontSize(10)
            .moveDown()
            .text(`DATE: ${currentDate.toLocaleDateString('en-IN')}`, { align: 'left' })
            .moveDown()
            .text(`ORDER DATE: ${order.createdAt.toLocaleDateString('en-IN')}`)
            .text(`INVOICE NUMBER: ${orderId}`, { align: 'right' })
            .moveDown()

        // Loop through each address in the order
        order.address.forEach((address, index) => {
            doc.text(`Delivered To: ${address.name}`, { align: 'right' })
                .text(`${address.address}`, { align: 'right' })
                .text(`${address.city}, ${address.state} ${address.pincode}`, { align: 'right' })
                .text(`${address.district}`, { align: 'right' })
                .moveDown();
        });

        doc.font('Helvetica').fontSize(10).lineGap(8);
        const tableData = order.products.map((product, index) => {
            return [
                index + 1, // Sr. No
                product.productId.productname, // Product Name
                `$${product.productPrice.toFixed(2)}`, // Price
                product.quantity, // Quantity
                `$${(product.productPrice * product.quantity).toFixed(2)}` // Total
            ];
        });

        doc.moveDown()
        doc.moveDown()
        doc.font('Helvetica').fontSize(10).lineGap(8);
        doc.font('Helvetica').table({
            headers: ['Sr.No', 'ProductName', 'Price', 'Quantity', 'Total'],
            rows: tableData,
            columnWidths: { 0: 50, 1: 50, 2: 150, 3: 50, 4: 50, 5: 50 },
        });


        const couponAmount = order.couponAmount;
        const grandTotal = order.totalAmount;

        // Create table data for additional table
        const additionalTableData = [
            ['Coupon Amount', `$${couponAmount.toFixed(2)}`],
            ['Grand Total', `$${grandTotal.toFixed(2)}`]
        ];

        // Draw the additional table
        doc.moveDown();
        doc.font('Helvetica').fontSize(10).lineGap(8);
        doc.font('Helvetica').table({
            headers: ['',''],
            rows: additionalTableData,
            columnWidths: { 0: 150, 1: 150 },
        });

        doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke();
        // Footer
        const footerText = 'Thank you for your business, we appreciate your custom!';
        doc.fillColor('#333333')
            .fontSize(10)
            .text(footerText, { align: 'center' });
        doc.moveDown()
        doc.moveDown()

            const imagePath = './public/assets/imgs/theme/project-logo.png'; // Provide the path to your image
            if (fs.existsSync(imagePath)) {
                doc.image(imagePath, {
                    fit: [doc.page.width - 500, doc.page.height - 500], // Adjust image size as needed
                    align: 'center',
                });
            }


        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
};




exports.cancelOrder = async (req, res) => {
    const { orderId, cancelReason, paymentMethod, paymentStatus } = req.body;
    try {
        const userId = req.session.user._id;
        // Find the order to be canceled
        const order = await Order.findById(orderId).populate('products.productId');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        // Update order status to 'cancelled' and save cancel reason
        if (paymentMethod === 'cod') {
            order.orderStatus = 'cancelled';
            order.cancelReason = cancelReason;
            await order.save();
        } else if (paymentMethod === 'razorpay' && paymentStatus === 'success') {
            order.orderStatus = 'cancelled';
            order.paymentStatus = 'refunded'
            order.cancelReason = cancelReason;
            const totalAmount = order.totalAmount;
            const wallet = await Wallet.findOne({ userId });
            if (wallet) {
                // Check if transaction already exists
                const existingTransaction = wallet.transaction.find(transaction => transaction.paymentMethod === 'razorpay' && transaction.paymentStatus === 'refund' && transaction.amount === totalAmount);
                if (!existingTransaction) {
                    // Refund amount to the wallet
                    wallet.amount += totalAmount;
                    // Add transaction to wallet
                    const newTransaction = {
                        date: new Date(),
                        paymentMethod: 'razorpay',
                        amount: totalAmount,
                        paymentStatus: 'refund'
                    };
                    wallet.transaction.push(newTransaction);
                    await Promise.all([wallet.save(), order.save()]);
                }
            } else {
                const newWallet = new Wallet({
                    userId,
                    amount: totalAmount,
                    transaction: [{
                        date: new Date(),
                        paymentMethod: 'razorpay',
                        amount: totalAmount,
                        paymentStatus: 'refund'
                    }]
                });
                await Promise.all([newWallet.save(), order.save()]);
            }
        } else if (paymentMethod === 'wallet') {
            order.orderStatus = 'cancelled';
            order.paymentStatus = 'refunded';
            const totalAmount = order.totalAmount;
            const userWallet = await Wallet.findOne({ userId });
            if (!userWallet) {
                return res.status(404).send('Wallet not found');
            }
            userWallet.amount += totalAmount;
            const newTransaction = {
                date: new Date(),
                paymentMethod: paymentMethod,
                amount: totalAmount,
                paymentStatus: 'refund'
            };
            userWallet.transaction.push(newTransaction);
            await Promise.all([userWallet.save(), order.save()])
        }

        // Increment product quantities for canceled order
        for (const productItem of order.products) {
            const product = await Product.findById(productItem.productId);
            if (product) {
                product.quantity += productItem.quantity;
                await product.save();
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error occurred:', error);
        res.sendStatus(500);
    }
}




exports.removeProduct = async (req, res) => {
    const { productId, orderId } = req.body;
    console.log(productId, orderId)
    try {
        // Fetch the order from the database
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const productIndex = order.products.findIndex(
            (product) => product.productId.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found in order' });
        }

        const productToRemove = order.products[productIndex];
        const { productPrice, quantity } = productToRemove;

        order.totalAmount -= productPrice * quantity;
        order.products.splice(productIndex, 1);

        await order.save();

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        product.quantity += quantity;

        await product.save();

        res.status(200).json({ message: 'Product removed from order and quantity updated', order });
    } catch (error) {
        console.error('Error removing product from order:', error);
        res.status(500).json({ error: 'Failed to remove product from order' });
    }
}


