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
            return res.json({ alreadyInCart: true });
        }
        if (!cart) {
            cart = new Cart({ userId });
        }
        let productPrice;
        if (product.mainprice !== 0 && product.mainprice < product.price) {
            productPrice = product.mainprice;
        } else {
            productPrice = product.price;
        }

        cart.products.push({ productId: productId, quantity: 1, productPrice: productPrice });
        cart.total += productPrice; // Use the determined product price for calculation
        await cart.save();
        res.json({ success: true });
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

            // Determine the price to be used for calculation (mainprice or original price)
            let productPrice;
            if (cart.products[existingProductIndex].productId.mainprice < cart.products[existingProductIndex].productId.price) {
                productPrice = cart.products[existingProductIndex].productId.mainprice !== 0 ? cart.products[existingProductIndex].productId.mainprice : cart.products[existingProductIndex].productId.price;
            } else {
                productPrice = cart.products[existingProductIndex].productId.price;
            }

            const subtotal = cart.products[existingProductIndex].quantity * productPrice;

            cart.total = cart.products.reduce((acc, item) => {
                if (checkedProducts.includes(item.productId._id.toString())) {
                    const price = item.productId.mainprice !== 0 && item.productId.mainprice < item.productId.price ? item.productId.mainprice : item.productId.price;
                    return acc + (item.quantity * price);
                } else {
                    return acc;
                }
            }, 0);

            await cart.save();

            const cartSubtotal = cart.products.reduce((acc, item) => {
                if (checkedProducts.includes(item.productId._id.toString())) {
                    const price = item.productId.mainprice !== 0 && item.productId.mainprice < item.productId.price ? item.productId.mainprice : item.productId.price;
                    return acc + (item.quantity * price);
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

