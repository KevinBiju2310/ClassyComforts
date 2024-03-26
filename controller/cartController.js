const User = require("../modal/userModal");
const Product = require("../modal/productModel");

exports.cartGet = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Retrieve the user's cart from the database
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('cart.product'); // Populate product details

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update cart items with product details
        const updatedCart = user.cart.map(item => ({
            product: {
                id: item.product._id,
                name: item.product.name,
                price: item.product.price,
                image: item.product.image
                // Add more product details as needed
            },
            quantity: item.quantity
        }));

        // Send the updated cart data to the client
        res.render('cart',{ cart: updatedCart });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};


exports.cartPost = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { productId } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if product is already in the cart, if yes, increment quantity
        const existingCartItem = user.cart.find(item => item.product.equals(productId));
        if (existingCartItem) {
            existingCartItem.quantity++;
        } else {
            // Otherwise, add new item to cart with product details
            user.cart.push({
                product: productId,
                quantity: 1,
                image: product.productImages,
                name: product.productname,
                price: product.price,
                url: `/user/singleproduct/${product.id}`
            });
        }

        await user.save();
        res.redirect('/user/cart');
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
};

