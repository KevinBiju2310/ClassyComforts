const Product = require("../modal/productModel")
const Category = require("../modal/categoryModel")
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage
}).array('productImage', 3);

exports.productsGet = async (req, res) => {
    try {
        const product = await Product.find({ deleted: false })
        res.render('products', { product })
    } catch (error) {
        console.log("Error Occurred: ", error)
    }
}

exports.addproductGet = async (req, res) => {
    try {
        const category = await Category.find({ deleted: false })
        res.render('addproduct', { category })
    } catch (error) {
        console.log("Error Occurred: ", error)
    }
}

exports.addproductPost = async (req, res, next) => {
    try {
        upload(req, res, async function (err) {
            if (err) {
                console.error(err);
                return res.status(400).send('File upload error')
            }
            const productImage = req.files.map(file => file.filename);
            const { productname, description, price, category, quantity } = req.body;

            const newProduct = new Product({
                productname: productname,
                description: description,
                price: price,
                category: category,
                quantity: quantity,
                productImage: productImage,
            });

            await newProduct.save();
            res.redirect('/admin/products')
        })
    } catch (error) {
        console.log("Error Occurred: ", error);
    }
}

exports.updateproductGet = async (req, res) => {
    try {
        const productId = req.params.productId;
        const category = await Category.find({ deleted: false })
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render('updateproduct', { product, category, productId });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
};


exports.updateproductPost = async (req, res) => {
    try {
        const productId = req.params.productId;
        const updatedProduct = {
            productname: req.body.productname,
            description: req.body.description,
            category: req.body.category,
            price: req.body.price,
            quantity: req.body.quantity,
            productImage: req.body.productImage
        };
        const product = await Product.findByIdAndUpdate(productId, updatedProduct, { new: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.deleteproductPost = async (req, res) => {
    try {
        const productId = req.params.productId;
        const updatedProduct = await Product.findByIdAndUpdate(productId, { deleted: true }, { new: true });
        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }
        res.status(200).send('Product soft deleted successfully');
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).send('Internal Server Error');
    }
}