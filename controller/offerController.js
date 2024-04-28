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

        product.mainprice = discountedPrice;
        product.discount = discountPercentage;

        await product.save();
        res.redirect('/admin/productoffer')
    } catch (error) {
        console.log("Error Occured: ", error);
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
        const updatedProduct = await Product.findOneAndUpdate(
            { productname: productName },
            { $set: { discount: 0, mainprice: 0 } },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product offer not found' });
        }

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
        res.redirect('/admin/categoryoffer')
    } catch (error) {
        console.log("Error Occured: ", error);
    }
}


exports.updatecategoryOffer = async(req,res) => {
    try{
        const { productName, discountPercentage } = req.body;
        const category = await Category.findOne({name: productName})

        category.discount = discountPercentage;
        await category.save();
        res.redirect('/admin/categoryoffer')
    }catch(error){  
        console.log("Error Occured: ",error);
    }
}