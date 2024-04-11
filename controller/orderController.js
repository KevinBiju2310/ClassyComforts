const Product = require('../modal/productModel');
const Cart = require('../modal/cartModel');
const Address = require('../modal/addressModel');
const Order = require('../modal/orderModel');
const User = require('../modal/userModal');
const PDFDocument = require('pdfkit');
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose');



const checkedProducts = [];
async function getOrderDetails(orderId) {
    try {
        const order = await Order.findById(orderId).populate('products.productId').populate('userId');
        return order;
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error;
    }
}

exports.checkoutPageGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/signin');
        }
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });
        const cart = await Cart.findOne({ userId });

        res.render('checkout', { addresses, checkedProducts, cart });

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

        const checkedProductsIds = req.body.checkedProducts;
        checkedProducts.length = 0;

        for (const item of cart.products) {
            if (checkedProductsIds.includes(item.productId.toString())) {
                const product = await Product.findById(item.productId);
                if (product) {
                    checkedProducts.push({
                        productId: product,
                        quantity: item.quantity
                    });
                }
            }
        }
        res.render('checkout', { addresses, checkedProducts, cart });

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



// Admin
exports.orderGet = async (req, res) => {
    try {
        res.render('orders');
    } catch (error) {
        console.log("Error Happend : ", error);
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
        console.log(totalValue)

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

        const order = new Order({
            userId,
            products: checkedProducts.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            })),
            address: address,
            paymentMethod: 'cod',
            totalAmount: totalValue
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

        res.render('orderSuccessfull');
    } catch (error) {
        console.log("Error occurred: ", error);
        res.status(500).send('Error occurred while placing the order');
    }
}


exports.orderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log(orderId);

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


exports.cancelOrder = async (req, res) => {
    const { orderId, cancelReason } = req.body;
    console.log(orderId)
    console.log(cancelReason)
    try {
        await Order.findByIdAndUpdate(orderId, { orderStatus: 'cancelled', cancelReason });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error occurred:', error);
        res.sendStatus(500);
    }
}



exports.downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await getOrderDetails(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const user = await User.findById(order.userId);

        const invoiceDirectory = path.join(__dirname, '../invoices');
        if (!fs.existsSync(invoiceDirectory)) {
            fs.mkdirSync(invoiceDirectory);
        }

        const doc = new PDFDocument({ margin: 50 });

        const invoicePath = path.join(__dirname, `../invoices/invoice_${orderId}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);
        doc.pipe(writeStream);

        // Set up fonts
        doc.font('Helvetica-Bold');
        doc.fontSize(25).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Add logo
        const logoPath = path.join(__dirname, '../public/assets/imgs/theme/project-logo.png');
        doc.image(logoPath, 50, 50, { width: 100 });

        // Add user details
        doc.moveDown();
        doc.fontSize(14).text(`Customer: ${user.name}`, { continued: true });
        doc.fontSize(14).text(`Email: ${user.email}`, { align: 'left' });

        // Add order date
        doc.moveDown();
        doc.fontSize(14).text(`Order Date: ${order.createdAt.toDateString()}`, { align: 'left' });

        // Add order details
        doc.moveDown();
        doc.fontSize(16).text('Order Details:', { align: 'left' });

        // Set up table headers
        const tableHeaders = ['Product Name', 'Image', 'Price', 'Quantity', 'Total'];
        const tableY = doc.y + 20;

        // Draw table headers
        doc.font('Helvetica-Bold');
        doc.rect(50, tableY, 100, 20).fill('#f2f2f2');
        doc.rect(150, tableY, 100, 20).fill('#f2f2f2');
        doc.rect(250, tableY, 50, 20).fill('#f2f2f2');
        doc.rect(300, tableY, 50, 20).fill('#f2f2f2');
        doc.rect(350, tableY, 100, 20).fill('#f2f2f2');

        doc.fontSize(12);
        doc.fillColor('#000000');
        doc.text(tableHeaders[0], 55, tableY + 5);
        doc.text(tableHeaders[1], 155, tableY + 5);
        doc.text(tableHeaders[2], 255, tableY + 5);
        doc.text(tableHeaders[3], 305, tableY + 5);
        doc.text(tableHeaders[4], 355, tableY + 5);

        // Draw table rows
        let yPos = tableY + 20;
        order.products.forEach(product => {
            const productName = product.productId.productname;
            const image = path.join(__dirname, `../public/uploads/${product.productId.productImages[0]}`);
            const price = `$${product.productId.price.toFixed(2)}`;
            const quantity = product.quantity;
            const total = `$${(product.productId.price * product.quantity).toFixed(2)}`;

            doc.image(image, 155, yPos, { width: 50 });
            doc.text(productName, 55, yPos + 5);
            doc.text(price, 255, yPos + 5);
            doc.text(quantity.toString(), 305, yPos + 5);
            doc.text(total, 355, yPos + 5);

            yPos += 20;
        });

        // Add total amount
        const grandTotal = `$${order.totalAmount.toFixed(2)}`;
        doc.moveDown();
        doc.fontSize(16).text(`Grand Total: ${grandTotal}`, { align: 'right' });

        // Finalize the PDF
        doc.end();

        // Send the PDF file as a response
        res.download(invoicePath);
    } catch (err) {
        console.error("Error occurred while generating or downloading invoice:", err);
        res.status(500).send('Internal server error');
    }
}
