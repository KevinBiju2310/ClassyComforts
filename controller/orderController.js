const Product = require('../modal/productModel');
const Cart = require('../modal/cartModel');
const Address = require('../modal/addressModel');
const Order = require('../modal/orderModel');

const checkedProducts = [];

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
            paymentMethod: 'cod'
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