const path = require('path');
const Product = require("../modal/productModel");
const Category = require("../modal/categoryModel");
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
        let query = { deleted: false };
        if (req.query.category && req.query.category !== "All") {
            query.category = req.query.category;
        }
        const products = await Product.find(query);
        const category = await Category.find({ deleted: false })
        res.render('products', { products: products, category });
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

            const { productname, description, category, price, quantity, length, width, height, material, shape, weight } = req.body;
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
        const { productname, description, category, price, quantity, length, width, height, material, shape, weight } = req.body;
        let productImages = [];

        // Handle uploaded images
        if (req.files && req.files.length > 0) {
            await Promise.all(req.files.map(async file => {
                const filename = file.path.split('/').pop();
                const outputPath = `public/uploads/${filename}`;
                await sharp(file.path)
                    .resize(700, 700) // Crop and resize
                    .toFile(outputPath); // Save cropped image
                productImages.push(outputPath); // Push path to array
            }));
        }

        // Handle deleted images
        if (req.body.deletedImages && req.body.deletedImages.length > 0) {
            await Promise.all(req.body.deletedImages.map(async imagePath => {
                // Remove image from filesystem
                await fsmod.unlink(imagePath);
                // Remove image path from database
                await Product.findByIdAndUpdate(productId, {
                    $pull: { productImages: imagePath }
                });
            }));
        }
        // Update product in database
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
            $addToSet: { productImages: { $each: productImages } }
        }, { new: true });

        if (!updatedProduct) {
            return res.status(404).send("Product not found");
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
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

exports.singleproductGet = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
        const relatedProducts = await Product.find({ category: product.category, _id: { $ne: productId } }).limit(4);
        res.render('singleproduct', { product, relatedProducts });
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
}
