const Product = require('../modal/productModel');
const Category = require('../modal/categoryModel');


exports.offerPage = async (req, res) => {
    try {
        const products = await Product.find({ deleted: false });
        res.render('productoffer', { products })
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}


exports.addproductOffer = async (req, res) => {
    try {
        const productName = req.body.product;
        const productPrice = req.body.productPrice;
        const discountPercentage = req.body.discountPercentage;

        const calDiscount = productPrice * discountPercentage / 100;
        const discountedPrice = productPrice - calDiscount;

        const product = await Product.findOne({ productname: productName });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const category = await Category.findOne({ name: product.category });

        if (category && category.discount >= discountPercentage) {
            return res.status(400).json({ error: "Better Category Offer Applied" });
        }

        product.mainprice = discountedPrice;
        product.discount = discountPercentage;

        await product.save();
        res.status(200).json({ success: true, message: "Product offer added successfully" });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}




exports.updateproductOffer = async (req, res) => {
    try {
        const { productName, discountPercentage } = req.body;
        const product = await Product.findOne({ productname: productName });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        product.discount = discountPercentage;
        product.mainprice = product.price * (1 - discountPercentage / 100);

        await product.save();
        res.redirect('/admin/productoffer')
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}


exports.deleteproductOffer = async (req, res) => {
    try {
        const productName = req.params.productName;
        console.log(productName);
        const product = await Product.findOne({ productname: productName });
        if (!product) {
            return res.status(404).json({ error: 'Product offer not found' });
        }

        product.discount = 0;
        product.mainprice = 0;
        if (product.categorydiscount !== 0) {
            product.mainprice = product.price * (1 - product.categorydiscount / 100);
        }

        await product.save();

        res.status(200).json({ message: 'Product offer removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


exports.categoryofferPage = async (req, res) => {
    try {
        const category = await Category.find({ deleted: false });
        res.render('categoryoffer', { category })
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}


exports.addcategoryOffer = async (req, res) => {
    try {
        const categoryName = req.body.category;
        const discountPercentage = req.body.discountPercentage;

        const category = await Category.findOne({ name: categoryName });
        category.discount = discountPercentage;
        await category.save();

        const products = await Product.find({ category: categoryName });
        for (const product of products) {
            product.categorydiscount = discountPercentage;
            const mainPrice = product.price * (1 - discountPercentage / 100);
            product.mainprice = mainPrice;
            await product.save();
        }

        console.log(products);
        res.redirect('/admin/categoryoffer')
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}


exports.updatecategoryOffer = async (req, res) => {
    try {
        const { categoryName, discountPercentage } = req.body;
        const category = await Category.findOne({ name: categoryName })

        category.discount = discountPercentage;
        await category.save();

        const products = await Product.find({ category: categoryName });
        for (const product of products) {
            product.categorydiscount = discountPercentage;
            const mainPrice = product.price * (1 - discountPercentage / 100);
            product.mainprice = mainPrice;
            await product.save();
        }

        res.redirect('/admin/categoryoffer')
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}




exports.deletecategoryOffer = async (req, res) => {
    try {
        const categoryName = req.params.categoryName;
        console.log(categoryName);

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).json({ error: 'Category offer not found' });
        }

        category.discount = 0;
        await category.save();

        const products = await Product.find({ category: categoryName });

        for (const product of products) {
            product.categorydiscount = 0;
            product.mainprice = 0;
            await product.save();
            if (product.discount !== 0) {
                const mainPrice = product.price * (1 - product.discount / 100);
                product.mainprice = mainPrice;
                await product.save();
            }
        }

        res.status(200).json({ message: 'Category offer removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}