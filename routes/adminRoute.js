const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController')
const productController = require('../controller/productController')
const categoryController = require('../controller/categoryController')
const orderController = require('../controller/orderController')


router.get('/login', adminController.signInGet)
router.post('/login', adminController.signInPost)

router.get('/dashboard', adminController.dashboardGet)

router.get('/userlist', adminController.userlistGet)
router.post('/toggleUserBlock/:id', adminController.toggleUserBlock);

// Block and unblock users
// router.post('/blockUser/:id', adminController.blockUser);
// router.post('/unblockUser/:id', adminController.unblockUser);

router.get('/category', categoryController.categoryGet);
router.post('/addcategory', categoryController.addcategoryPost);
router.post('/updatecategory/:id', categoryController.updatecategoryPost);
router.post('/deletecategory/:id', categoryController.deletecategoryPost);

router.get('/products', productController.productsGet);
router.get('/addproduct', productController.addproductGet)
router.post('/addproduct', productController.addproductPost)
router.get('/updateproduct/:id',productController.updateproductGet)
router.post('/updateproduct/:id',productController.updateproductPost)
router.post('/deleteproduct/:id', productController.deleteproductPost);


router.get('/orders',orderController.orderGet)


module.exports = router