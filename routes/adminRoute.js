const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController')
const productController = require('../controller/productController')
const categoryController = require('../controller/categoryController')
const orderController = require('../controller/orderController')
const { isAdminLogin } = require('../middleware/auth');


router.get('/login', adminController.signInGet)
router.post('/login', adminController.signInPost)

router.get('/dashboard', isAdminLogin, adminController.dashboardGet)

router.get('/userlist', isAdminLogin, adminController.userlistGet)
router.post('/toggleUserBlock/:id', adminController.toggleUserBlock);

// Block and unblock users
// router.post('/blockUser/:id', adminController.blockUser);
// router.post('/unblockUser/:id', adminController.unblockUser);

router.get('/category', isAdminLogin, categoryController.categoryGet);
router.post('/addcategory', categoryController.addcategoryPost);
router.post('/updatecategory/:id', categoryController.updatecategoryPost);
router.post('/deletecategory/:id', categoryController.deletecategoryPost);

router.get('/products', isAdminLogin, productController.productsGet);
router.get('/addproduct', isAdminLogin, productController.addproductGet)
router.post('/addproduct', productController.addproductPost)
router.get('/updateproduct/:id', isAdminLogin, productController.updateproductGet)
router.post('/updateproduct/:id', productController.updateproductPost)
router.post('/deleteproduct/:id', productController.deleteproductPost);

router.post('/deleteimage',productController.deleteimage)

router.get('/orders', isAdminLogin, adminController.orderGet)
router.post('/orders/:orderId/status', adminController.updateOrderStatus);

    
module.exports = router