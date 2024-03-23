const Cart = require('../modal/cartModel');
const Product = require('../modal/productModel');

exports.cartGet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const cart = await Cart.findOne({ user: userId })   
        if (cart && cart.items.length > 0) {
            res.render('cart', { cart });
        } else {
            res.render('cart', { message: 'No products found' });   
        }
    } catch (error) {
        console.log("Error Occured : ", error);
    }
}

exports.cartPost = async (req, res) => {
    const userId = req.session.user._id;
    const { productId, quantity } = req.body;
    try {
        // Find the user's cart
        let cart = await Cart.findOne({ user: userId });

        // If cart doesn't exist, create a new one
        if (!cart) {
            cart = new Cart({ user: userId, items: [], total: 0 });
        }

        // Check if the product already exists in the cart
        const existingItemIndex = cart.items.findIndex(item => item.productId.equals(productId));

        if (existingItemIndex !== -1) {
            // Update quantity if product already exists
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new product to the cart
            cart.items.push({ productId, quantity });
        }

        // Calculate total
        cart.total = cart.items.reduce((total, item) => {
            return total + item.quantity;
        }, 0);

        // Save the cart
        await cart.save();

        return res.status(200).json(cart);
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};