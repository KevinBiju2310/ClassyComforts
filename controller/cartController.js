const User = require("../modal/userModal");
const Product = require("../modal/productModel");

exports.cartGet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('cart.product');
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if the user has any items in the cart
        if (user.cart.length === 0) {
            // If cart is empty, render cart.ejs with an empty cart message
            return res.render('cart', { cart: [], isEmpty: true });
        }

        // Render cart.ejs with the populated cart items
        res.render('cart', { cart: user.cart, isEmpty: false });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

exports.cartPost = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if the product already exists in the cart
        const existingCartItemIndex = user.cart.findIndex(item => String(item.product._id) === String(productId));
        console.log(existingCartItemIndex)
        if (existingCartItemIndex !== -1) {
            return res.send('Product already added to cart'); // Send response and exit function
        } else {
            // If the product does not exist in the cart, add it with quantity 1
            user.cart.push({
                product: product,
                quantity: 1,
                subTotal: product.price
            });
        }

        await user.save();
        res.redirect('/user/cart'); // Redirect to the cart page after adding the item
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};






exports.updateCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;

        console.log("Updating cart for user ID:", userId);
        console.log("Product ID:", productId);
        console.log("Quantity:", quantity);

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            console.error("User not found");
            return res.status(404).send('User not found');
        }

        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
            console.error("Product not found");
            return res.status(404).send('Product not found');
        }

        // Find the cart item corresponding to the provided productId
        const cartItem = user.cart.find(item => String(item.product._id) === String(productId));

        if (!cartItem) {
            console.error("Product not found in cart");
            return res.status(404).send('Product not found in cart');
        }

        // Update quantity
        cartItem.quantity = Math.min(Math.max(parseInt(quantity), 1), 10); // Limit quantity to 1-10
        cartItem.subTotal = cartItem.quantity * product.price; // Update subtotal

        console.log("Updated cart item:", cartItem);

        // Save the updated user object to the database
        await user.save();

        // Send the updated cart item as a response
        res.json({ cartItem });
    } catch (error) {
        console.error("Error updating cart:", error);
        res.status(500).send('Internal Server Error');
    }
};
