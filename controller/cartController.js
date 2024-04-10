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
            if (product.quantity < cart.products[existingProductIndex].quantity + quantityChange) {
                return res.json({
                    quantityExceedsStock: true,
                    productStock: product.quantity
                });
            }

            cart.products[existingProductIndex].quantity += quantityChange;

            if (cart.products[existingProductIndex].quantity > 10) {
                cart.products[existingProductIndex].quantity = 10;
            }

            if (cart.products[existingProductIndex].quantity < 1) {
                cart.products[existingProductIndex].quantity = 1;
            }

            const subtotal = cart.products[existingProductIndex].quantity * product.price;

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

