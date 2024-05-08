const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController');
const productController = require('../controller/productController');
const categoryController = require('../controller/categoryController');
const couponController = require('../controller/couponController');
const offerController = require('../controller/offerController');
const { isAdminLogin } = require('../middleware/auth');


router.get('/login', adminController.signInGet)
router.post('/login', adminController.signInPost)

router.get('/dashboard', isAdminLogin, adminController.dashboardGet);
router.get('/ordersgraph',isAdminLogin,adminController.sortGraph);

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

router.post('/deleteimage', productController.deleteimage)

router.get('/orders', isAdminLogin, adminController.orderGet)
router.post('/orders/:orderId/status', adminController.updateOrderStatus);


router.get('/coupon', isAdminLogin, couponController.couponPage);
router.post('/addcoupon', isAdminLogin, couponController.addCoupon);
router.put('/updatecoupon/:id', isAdminLogin, couponController.updateCoupon);
router.delete('/deletecoupon/:id', isAdminLogin, couponController.deleteCoupon);
router.post('/checkvalidation', isAdminLogin, couponController.checkvalidation);

router.get('/productoffer', isAdminLogin, offerController.offerPage);
router.post('/addproductoffer', offerController.addproductOffer);
router.post('/updateproductoffer', offerController.updateproductOffer);
router.delete('/deleteproductoffer/:productName', offerController.deleteproductOffer);

router.get('/categoryoffer', isAdminLogin, offerController.categoryofferPage);
router.post('/addcategoryoffer', offerController.addcategoryOffer);
router.post('/updatecategoryoffer', offerController.updatecategoryOffer);
router.delete('/deletecategoryoffer/:categoryName', offerController.deletecategoryOffer);


router.get('/salesreport', isAdminLogin, adminController.salesreport);
// router.get('/filtersales', isAdminLogin, adminController.filtersales);
router.get('/downloadPDF', isAdminLogin, adminController.downloadPDF);
module.exports = router