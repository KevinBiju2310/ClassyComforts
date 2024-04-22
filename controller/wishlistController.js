const Product = require('../modal/productModel');
const Wishlist = require('../modal/wishlistModel');


exports.wishlistpage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
        if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
            res.render('wishlist', { wishlist: { products: [] } })
        } else {
            res.render('wishlist', { wishlist: wishlist })
        }
    } catch (error) {
        console.log("Error: ", error)
    }
}


exports.addtoWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: userId,
                products: [{ productId: productId }]
            });
        } else {
            const productExists = wishlist.products.some(item => item.productId.equals(productId));
            if (productExists) {
                return res.json({ alreadyInWishlist: true });
            }

            wishlist.products.push({ productId: productId });
        }
        await wishlist.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.deleteFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user._id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const wishlist = await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId: productId } } },
            { new: true }
        );
        if (!wishlist) {
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};