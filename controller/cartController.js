const Product = require('../modal/productModel');
const Cart = require('../modal/cartModel');
const Address = require('../modal/addressModel');


exports.cartPage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId }).populate('products.productId')
        if (!cart || !cart.products || cart.products.length === 0) {
            res.render('cart', { cart: { products: [], total: 0 } })
        } else {
            res.render('cart', { cart: cart })
        }
    } catch (error) {
        console.log('Error Occurred: ', error);
        res.status(501).send('Internal Server Error');
    }
}

exports.addtoCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        let cart = await Cart.findOne({ userId: userId });
        const existingProductIndex = cart ? cart.products.findIndex(item => item.productId.equals(productId)) : -1;

        if (existingProductIndex !== -1) {
            return res.status(400).send('Product already in cart');
        }
        if (!cart) {
            cart = new Cart({ userId });
        }
        cart.products.push({ productId: productId, quantity: 1 });

        cart.total += product.price;
        await cart.save();
        res.redirect('/user/cart');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Internal Server Error');
    }
}


exports.updateCart = async (req, res) => {
    try {
        console.log("start of updatecart");
        const { productId, quantityChange, checkedProducts } = req.body;
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        let cart = await Cart.findOne({ userId: userId }).populate('products.productId');

        const existingProductIndex = cart ? cart.products.findIndex(item => item.productId.equals(productId)) : -1;

        if (existingProductIndex !== -1) {
            // Update quantity with quantityChange
            cart.products[existingProductIndex].quantity += quantityChange;

            if (cart.products[existingProductIndex].quantity > 10) {
                cart.products[existingProductIndex].quantity = 10;
            }

            if (cart.products[existingProductIndex].quantity < 1) {
                cart.products[existingProductIndex].quantity = 1;
            }

            // Calculate subtotal for this product
            const subtotal = cart.products[existingProductIndex].quantity * product.price;

            // Calculate cart subtotal and total based on checked products
            cart.total = cart.products.reduce((acc, item) => {
                if (checkedProducts.includes(item.productId._id.toString())) {
                    return acc + (item.quantity * item.productId.price);
                } else {
                    return acc;
                }
            }, 0);

            await cart.save();

            const cartSubtotal = cart.products.reduce((acc, item) => {
                if (checkedProducts.includes(item.productId._id.toString())) {
                    return acc + (item.quantity * item.productId.price);
                } else {
                    return acc;
                }
            }, 0);
            const cartTotal = cartSubtotal;
            res.json({
                quantity: cart.products[existingProductIndex].quantity,
                subtotal: subtotal,
                cartSubtotal: cartSubtotal,
                cartTotal: cartTotal,
            });
        } else {
            return res.status(400).send('Product not found in cart');
        }
    } catch (error) {
        console.log('Error Occurred: ', error);
        res.status(500).send('Internal Server Error');
    }
};



exports.deleteFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user._id;

        let cart = await Cart.findOne({ userId: userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        const index = cart.products.findIndex(item => item.productId.equals(productId));
        if (index === -1) {
            return res.status(404).send('Product not found in cart');
        }
        cart.products.splice(index, 1);
        cart.total = cart.products.reduce((acc, item) => acc + (item.quantity * item.productId.price), 0);

        await cart.save();

        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting product from cart:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.checkoutPageGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/signin');
        }
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });

        res.render('checkout', { addresses });

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
        const checkedProducts = [];

        // Fetch details for each checked product individually
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

        // Save the updated address document
        await userAddress.save();
        res.redirect('/user/checkout');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while adding the address');
    }
}