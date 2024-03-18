const Product = require("../modal/productModel");
const Category = require("../modal/categoryModel");
const multer = require('multer');
const path = require('path'); // Don't forget to require path module
const sharp = require('sharp');


const storage = multer.diskStorage({
    destination: './public/uploads/', // Destination directory for uploaded files
    filename: function (req, file, cb) {
        // Generate unique filename for uploaded file
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload middleware
const upload = multer({
    storage: storage, // Specify the storage configuration
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: function (req, file, cb) {
        // Check file type using custom function checkFileType
        checkFileType(file, cb);
    }
}).array('productImages', 10); // Allow uploading up to 10 images with the field name 'images'

// Middleware function to check file type
function checkFileType(file, cb) {
    // Allowed file extensions
    const filetypes = /jpeg|jpg|png/;
    // Check file extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check MIME type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images only! (JPEG, JPG, PNG)');
    }
}

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images only!');
    }
}

exports.productsGet = async (req, res) => {
    try {
        const products = await Product.find(); // Fetch products from database
        res.render('products', { products: products }); // Pass products to the template
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
        // Call the upload middleware to handle file uploads
        upload(req, res, async function (err) {
            if (err) {
                // If upload encountered an error, return an error response
                console.log("Upload Error: ", err);
                return res.status(400).send("Upload Error: " + err);
            }

            // Extracting data from the request body
            const { productname, description, category, price, quantity } = req.body;
            const productImages = req.files; // Files are available in req.files due to Multer

            // Cropping and processing each image
            const processedImages = [];
            for (let image of productImages) {
                const croppedImageBuffer = await sharp(image.buffer) // Assuming image.buffer contains image data
                    .resize({ width: 300, height: 300 }) // Resize the image
                    .toBuffer(); // Convert the image to a buffer
                processedImages.push(croppedImageBuffer);
            }

            // Creating a new product document
            const newProduct = new Product({
                productname,
                description,
                category,
                price,
                quantity,
                productImages: processedImages // Assigning the processed images to productImages field
            });

            // Saving the new product to the database
            await newProduct.save();

            // Sending success response
            res.status(201).send("Product added successfully");
        });
    } catch (error) {
        // Handling errors
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
};

// exports.addproductPost = async (req, res, next) => {
//     try {
//         upload(req, res, async function (err) {
//             if (err) {
//                 console.error(err);
//                 return res.status(400).send('File upload error');
//             }
//             const productImages = req.files.map(file => {
//                 const croppedFileName = 'cropped-' + file.filename;
//                 const croppedFilePath = `/uploads/${croppedFileName}`;
//                 cropAndSaveImage(file.path, croppedFileName);
//                 return {cropped: croppedFilePath };
//             });
//             const { productname, description, price, category, quantity } = req.body;

//             const newProduct = new Product({
//                 productname: productname,
//                 description: description,
//                 price: price,
//                 category: category,
//                 quantity: quantity,
//                 productImages: productImages,
//             });

//             await newProduct.save();
//             res.redirect('/admin/products');
//         })
//     } catch (error) {
//         console.log("Error Occurred: ", error);
//         res.status(500).send("Internal Server Error");
//     }
// }

exports.updateproductGet = async (req, res) => {
    try {
        const productId = req.params.productId;
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

exports.singleproductGet = async (req, res) => {
    try {
        res.render('singleproduct');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send("Internal Server Error");
    }
}
