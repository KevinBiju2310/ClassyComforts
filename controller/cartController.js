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

        const existingCartItemIndex = user.cart.findIndex(item => String(item.product._id) === String(productId));
        console.log(existingCartItemIndex)
        if (existingCartItemIndex !== -1) {
            return res.send('Product already added to cart'); 
        } else {
            user.cart.push({
                product: product,
                quantity: 1,
                subTotal: product.price
            });
        }

        await user.save();
        res.redirect('/user/cart'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};





exports.updateCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;

        console.log('Received productId:', productId);
        console.log('Received quantity:', quantity);
        console.log('Extracted userId:', userId);

        let user = await User.findById(userId).populate('cart.product');
        console.log('User:', user);
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const product = await Product.findById(productId);
        console.log('Product:', product);
        if (!product) {
            console.log('Product not found');
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingCartItemIndex = user.cart.findIndex(item => String(item.product._id) === String(productId));
        console.log('Existing cart item index:', existingCartItemIndex);
        if (existingCartItemIndex !== -1) {
            if (quantity === 0) {
                console.log('Removing item from cart');
                user.cart.splice(existingCartItemIndex, 1);
            } else {
                console.log('Updating quantity and subtotal');
                user.cart[existingCartItemIndex].quantity = quantity;
                user.cart[existingCartItemIndex].subTotal = product.price * quantity;
            }
        } else {
            if (quantity > 0) {
                console.log('Adding new item to cart');
                user.cart.push({
                    product: product,
                    quantity: quantity,
                    subTotal: product.price * quantity
                });
            }
        }
                                     
        await user.save();

        const totalPrice = user.cart.reduce((total, item) => total + item.subTotal, 0);
        console.log('Total price:', totalPrice);
        user.totalPrice = totalPrice;
        await user.save();

        res.status(200).send('cart updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
