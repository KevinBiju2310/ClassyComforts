const Product = require("../modal/productModel")
const Category = require("../modal/categoryModel")
const multer = require('multer');

// Configure multer for file upload
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
        const product = await Product.find()
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
       upload(req,res,async function(err){
        if(err){
            console.error(err);
            return res.status(400).send('File upload error')
        }
        const productImage = req.files.map(file=>file.filename);
        const {productname, description, price, category, quantity} = req.body;

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

exports.updateproductGet = async(req,res)=>{
    try{
        res.render('updateproduct')
    }catch(error){
        console.log("Error Occured: ",error)
    }
}

exports.updateproductPost = async(req,res)=>{
    try{
        const editProduct = await Product.findByIdAndUpdate(req.params.id)

        res.redirect('/admin/product')
    }catch(error){
        console.log("Error Occured: ",error)
    }
}