const path = require('path');
const Product = require("../modal/productModel");
const Category = require("../modal/categoryModel");
const Cart = require("../modal/cartModel");
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const fsmod = require('fs')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).array('productImages', 10);


function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Please upload only JPEG, JPG, or PNG images.'));
    }
}

exports.productsGet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 15;
        let query = { deleted: false };

        if (req.query.category && req.query.category !== "All") {
            query.category = req.query.category;
        }

        if (req.query.search) {
            query.productname = { $regex: new RegExp(req.query.search, "i") };
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / perPage);
        const skip = (page - 1) * perPage;
        const products = await Product.find(query).skip(skip).limit(perPage);
        const category = await Category.find({ deleted: false });

        res.render('products', { products, category, totalPages, currentPage: page, layout: false });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
}

exports.addproductGet = async (req, res) => {
    try {
        const category = await Category.find({ deleted: false });
        res.render('addproduct', { category });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
}

exports.addproductPost = async (req, res) => {
    try {
        upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).send("Error uploading files.");
                } else {
                    return res.status(400).send(err.message);
                }
            }

            const { productname, description, category, price, quantity, length, width, height, material, shape, weight, color } = req.body;
            const productImages = req.files.map(file => file.path);

            const resizedImages = await Promise.all(
                productImages.map(async filePath => {
                    const resizedImageBuffer = await sharp(filePath)
                        .resize(700, 700)
                        .toBuffer();
                    const { filename, destinationPath } = await saveResizedImage(resizedImageBuffer, path.basename(filePath));
                    return filename;
                })
            );

            const product = new Product({
                productname,
                description,
                category,
                price,
                quantity,
                length,
                width,
                height,
                shape,
                weight,
                material,
                color,
                productImages: resizedImages
            });
            await product.save();

            res.redirect('/admin/products');
        });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
};

async function saveResizedImage(buffer, originalFilename) {
    const ext = path.extname(originalFilename);
    const filename = `cropped_${Date.now()}${ext}`;
    const destinationPath = path.join('public', 'uploads', filename);
    try {
        await fs.writeFile(destinationPath, buffer);
        return { filename, destinationPath };
    } catch (error) {
        console.error('Error saving resized image:', error);
        throw error;
    }
}

exports.updateproductGet = async (req, res) => {
    try {
        const productId = req.params.id;
        const category = await Category.find({ deleted: false });
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
        const productId = req.params.id;
        upload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.log(`Multer error: ${err}`);
                return res.status(500).send("Error uploading the images");
            } else if (err) {
                console.log(`Unknown error: ${err}`);
                return res.status(500).send(`Unknown Error Occurred. The Error: ${err}`);
            }

            try {
                const productImages = req.files.map(file => file.path);

                const resizedImages = await Promise.all(
                    productImages.map(async filePath => {
                        const resizedImageBuffer = await sharp(filePath)
                            .resize(700, 700)
                            .toBuffer();
                        const { filename, destinationPath } = await saveResizedImage(resizedImageBuffer, path.basename(filePath));
                        return filename;
                    })
                );

                const { productname, description, category, price, quantity, length, width, height, material, shape, weight, color } = req.body;

                const updatedProduct = await Product.findByIdAndUpdate(productId, {
                    productname,
                    description,
                    category,
                    price,
                    quantity,
                    length,
                    width,
                    height,
                    shape,
                    weight,
                    material,
                    color,
                    $push: { productImages: { $each: resizedImages } }
                }, { new: true });

                if (!updatedProduct) {
                    return res.status(404).send("Product not found");
                }

                // Update product price in carts
                await Cart.updateMany(
                    { "products.productId": productId }, // Find all carts containing the updated product
                    { $set: { "products.$.productPrice": price } } // Update product price
                );

                // Recalculate total in each cart
                const carts = await Cart.find({ "products.productId": productId }); // Find all carts containing the updated product
                for (const cart of carts) {
                    let total = 0;
                    for (const product of cart.products) {
                        total += product.productPrice * product.quantity;
                    }
                    await Cart.findByIdAndUpdate(cart._id, { total });
                }

                res.redirect('/admin/products');
            } catch (err) {
                console.log(`Error occurred while updating the product: ${err}`);
                return res.status(500).send(`Error updating product: ${err.message}`);
            }
        });
    } catch (err) {
        console.log(`Error occurred: ${err}`);
        res.status(500).send("Error editing Product.");
    }
};




exports.deleteimage = async (req, res) => {
    try {
        const { productId, imageName } = req.body; // Assuming you pass productId and imageName from the frontend

        // Delete the image from the database
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Remove the image from the product's images array
        const updatedImages = product.productImages.filter(image => image !== imageName);
        product.productImages = updatedImages;
        await product.save();

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



exports.deleteproductPost = async (req, res) => {
    try {
        const productId = req.params.id;
        const updatedProduct = await Product.findByIdAndUpdate(productId, { deleted: true }, { new: true });
        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }
        res.redirect('/admin/products')
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).send('Internal Server Error');
    }
}

exports.stockCheck = async (req, res) => {
    const productId = req.params.productId;

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error retrieving product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}




exports.singleproductGet = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
        const relatedProducts = await Product.find({ category: product.category, _id: { $ne: productId }, deleted: false }).limit(4);
        res.render('singleproduct', { product, relatedProducts });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
}



exports.searchProduct = async (req, res) => {
    try {
        const searchQuery = req.query.query;
        console.log(searchQuery)
        const regex = new RegExp(searchQuery, 'i');
        const products = await Product.find({ productname: regex, deleted: false });

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}



exports.filterProducts = async (req, res) => {
    const { search, sort, category } = req.query;
    let query = { deleted: false };

    if (search) {
        query.productname = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    if (category && category !== "all") {
        query.category = category;
    }

    let sortOption = {};
    if (sort === 'lowToHigh') {
        sortOption.price = 1; // ascending
    } else if (sort === 'highToLow') {
        sortOption.price = -1; // descending
    } else if (sort === 'atoz') {
        sortOption.productname = 1; // alphabetical
    } else if (sort === 'ztoa') {
        sortOption.productname = -1; // reverse alphabetical
    } else if (sort === 'releasedate') {
        sortOption.releaseDate = -1; // newest first
    }

    try {
        const products = await Product.find(query).sort(sortOption).exec();
        res.json({ products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
}

