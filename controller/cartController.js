const User = require("../modal/userModal");
const Product = require("../modal/productModel");

exports.cartGet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('cart.product');
        if (!user) {
            return res.status(404).send('User not found');
        }

        if (user.cart.length === 0) {
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
        const userId = req.session.user._id; // Assuming you're using sessions to store user information

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingCartItemIndex = user.cart.findIndex(item => String(item.product._id) === String(productId));

        if (existingCartItemIndex !== -1) {
            if (quantity === 0) {
                user.cart.splice(existingCartItemIndex, 1);
            } else {
                user.cart[existingCartItemIndex].quantity = quantity;
                user.cart[existingCartItemIndex].subTotal = product.price * quantity;
            }

            await user.save();
        } else {
            // If the product does not exist in the cart, add it with the given quantity
            user.cart.push({
                product: product,
                quantity: quantity,
                subTotal: product.price * quantity
            });

            // Save the updated user object to the database
            user = await user.save();
        }

        const totalPrice = user.cart.reduce((total, item) => total + item.subTotal, 0);

        user.totalPrice = totalPrice;

        user = await user.save();

        res.json({ success: true, message: 'Cart updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};