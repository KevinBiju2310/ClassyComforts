const User = require('../modal/userModal');
const Product = require('../modal/productModel');
const Cart = require('../modal/cartModel');

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
        console.log('Error Occured : ', error);
        res.status(501).send('Internet Server Error');
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
        console.log("Error Occured : ", error);
        res.status(500).send('Internet Server Error');
    }
}




exports.updateCart = async (req, res) => {
    try {
        const { productId, quantityChange } = req.body;
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        let cart = await Cart.findOne({ userId: userId }).populate('products.productId');

        const existingProductIndex = cart ? cart.products.findIndex(item => item.productId.equals(productId)) : -1;

        if (existingProductIndex !== -1) {
            // Update quantity
            cart.products[existingProductIndex].quantity += quantityChange;

            // Ensure quantity doesn't go below 1
            if (cart.products[existingProductIndex].quantity < 1) {
                cart.products[existingProductIndex].quantity = 1;
            }

            // Calculate subtotal
            const subtotal = cart.products[existingProductIndex].quantity * product.price;

            // Update total using reduce
            cart.total = cart.products.reduce((acc, item) => {
                if (item.productId.equals(productId)) {
                    return acc + subtotal;
                } else {
                    return acc + (item.quantity * item.productId.price);
                }
            }, 0);

            // Save cart changes
            await cart.save();

            // Calculate cart subtotal and total
            const cartSubtotal = cart.products.reduce((acc, item) => acc + (item.quantity * item.productId.price), 0);
            const cartTotal = cartSubtotal; // Assuming no shipping cost for now

            // Send updated data in the response
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
        console.log('Error Occurred : ', error);
        res.status(500).send('Internal Server Error');
    }
};
