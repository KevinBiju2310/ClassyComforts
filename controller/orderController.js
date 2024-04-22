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


