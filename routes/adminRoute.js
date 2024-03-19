const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController')
const productController = require('../controller/productController')


router.get('/login', adminController.signInGet)
router.post('/login', adminController.signInPost)

router.get('/dashboard', adminController.dashboardGet)

router.get('/userlist', adminController.userlistGet)
router.post('/toggleUserBlock/:id', adminController.toggleUserBlock);

// Block and unblock users
// router.post('/blockUser/:id', adminController.blockUser);
// router.post('/unblockUser/:id', adminController.unblockUser);

router.get('/category', adminController.categoryGet);
router.post('/addcategory', adminController.addcategoryPost);
router.post('/updatecategory/:id', adminController.updatecategoryPost);
router.post('/deletecategory/:id', adminController.deletecategoryPost);

router.get('/products', productController.productsGet);
router.get('/addproduct', productController.addproductGet)
router.post('/addproduct', productController.addproductPost)
router.get('/updateproduct/:id',productController.updateproductGet)
router.post('/updateproduct/:id',productController.updateproductPost)
// router.post('/admin/deleteproduct/:productId', productController.deleteproductPost);


module.exports = router