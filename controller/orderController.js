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
// async function getOrderDetails(orderId) {
//     try {
//         const order = await Order.findById(orderId).populate('products.productId').populate('userId');
//         return order;
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         throw error;
//     }
// }

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
                        quantity: item.quantity,
                        productPrice: item.productPrice
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
                quantity: item.quantity,
                productPrice: item.productPrice
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
    try {
        // Find the order to be canceled
        const order = await Order.findById(orderId).populate('products.productId');
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Update order status to 'cancelled' and save cancel reason
        order.orderStatus = 'cancelled';
        order.cancelReason = cancelReason;
        await order.save();

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




exports.removeProduct = async(req, res) => {
    const { productId, orderId } = req.body;
    console.log(productId,orderId)
    try {
        // Fetch the order from the database
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the index of the product in the order
        const productIndex = order.products.findIndex(
            (product) => product.productId.toString() === productId
        );

        // If product not found in the order, return error
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found in order' });
        }

        // Get the product details
        const productToRemove = order.products[productIndex];
        const { productPrice, quantity } = productToRemove;

        // Update total amount by subtracting the price of the removed product
        order.totalAmount -= productPrice * quantity;

        // Remove the product from the order
        order.products.splice(productIndex, 1);

        // Save the updated order
        await order.save();

        // Update the quantity of the product in the inventory
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Increase the quantity in inventory by the quantity that was in the order
        product.quantity += quantity;

        // Save the updated product
        await product.save();

        res.status(200).json({ message: 'Product removed from order and quantity updated', order });
    } catch (error) {
        console.error('Error removing product from order:', error);
        res.status(500).json({ error: 'Failed to remove product from order' });
    }
}



// exports.downloadInvoice = async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const order = await getOrderDetails(orderId);

//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         const user = await User.findById(order.userId);

//         const invoiceDirectory = path.join(__dirname, '../invoices');
//         if (!fs.existsSync(invoiceDirectory)) {
//             fs.mkdirSync(invoiceDirectory);
//         }

//         const doc = new PDFDocument({ margin: 50 });

//         const invoicePath = path.join(__dirname, `../invoices/invoice_${orderId}.pdf`);
//         const writeStream = fs.createWriteStream(invoicePath);
//         doc.pipe(writeStream);

//         // Set up fonts
//         doc.font('Helvetica-Bold');
//         doc.fontSize(25).text('Invoice', { align: 'center' });
//         doc.moveDown();

//         // Add logo
//         const logoPath = path.join(__dirname, '../public/assets/imgs/theme/project-logo.png');
//         doc.image(logoPath, 50, 50, { width: 100 });

//         // Add user details
//         doc.moveDown();
//         doc.fontSize(14).text(`Customer: ${user.name}`);
//         doc.moveDown();
//         doc.fontSize(14).text(`Email: ${user.email}`, { align: 'left' });

//         // Add order date
//         doc.moveDown();
//         doc.fontSize(14).text(`Order Date: ${order.createdAt.toDateString()}`, { align: 'left' });

//         // Add order details
//         doc.moveDown();
//         doc.fontSize(16).text('Order Details:', { align: 'left' });

//         // Define constants for column widths
//         const colWidth = 120;
//         const colImageWidth = 100;
//         const colQtyWidth = 60;
//         const colTotalWidth = 100;

//         // Draw table headers
//         const tableX = 50;
//         const tableHeaders = ['Product Name', 'Image', 'Price', 'Quantity', 'Total'];
//         const tableY = doc.y + 30;

//         doc.font('Helvetica-Bold');
//         doc.rect(tableX, tableY, colWidth, 20).fill('#f2f2f2');
//         doc.rect(tableX + colWidth, tableY, colImageWidth, 20).fill('#f2f2f2');
//         doc.rect(tableX + colWidth + colImageWidth, tableY, colWidth, 20).fill('#f2f2f2');
//         doc.rect(tableX + colWidth + colImageWidth + colWidth, tableY, colQtyWidth, 20).fill('#f2f2f2');
//         doc.rect(tableX + colWidth + colImageWidth + colWidth + colQtyWidth, tableY, colTotalWidth, 20).fill('#f2f2f2');

//         doc.fontSize(12);
//         doc.fillColor('#000000');
//         doc.text(tableHeaders[0], tableX + 5, tableY + 5);
//         doc.text(tableHeaders[1], tableX + colWidth + 5, tableY + 5);
//         doc.text(tableHeaders[2], tableX + colWidth + colImageWidth + 5, tableY + 5);
//         doc.text(tableHeaders[3], tableX + colWidth + colImageWidth + colWidth + 5, tableY + 5);
//         doc.text(tableHeaders[4], tableX + colWidth + colImageWidth + colWidth + colQtyWidth + 5, tableY + 5);

//         // Draw table rows
//         let yPos = tableY + 30;
//         order.products.forEach(product => {
//             const productName = product.productId.productname;
//             const image = path.join(__dirname, `../public/uploads/${product.productId.productImages[0]}`);
//             const price = `$${product.productId.price.toFixed(2)}`;
//             const quantity = product.quantity;
//             const total = `$${(product.productId.price * product.quantity).toFixed(2)}`;

//             doc.image(image, tableX + colWidth + 5, yPos, { width: colImageWidth - 10 });
//             doc.text(productName, tableX + 5, yPos + 5);
//             doc.text(price, tableX + colWidth + colImageWidth + 5, yPos + 5);
//             doc.text(quantity.toString(), tableX + colWidth + colImageWidth + colWidth + 5, yPos + 5);
//             doc.text(total, tableX + colWidth + colImageWidth + colWidth + colQtyWidth + 5, yPos + 5);

//             yPos += 20;
//         });

//         // Add total amount
//         const grandTotal = `$${order.totalAmount.toFixed(2)}`;
//         doc.moveDown();
//         doc.fontSize(16).text(`Grand Total: ${grandTotal}`, { align: 'right' });

//         // Finalize the PDF
//         doc.end();

//         // Send the PDF file as a response
//         res.download(invoicePath);
//     } catch (err) {
//         console.error("Error occurred while generating or downloading invoice:", err);
//         res.status(500).send('Internal server error');
//     }
// }