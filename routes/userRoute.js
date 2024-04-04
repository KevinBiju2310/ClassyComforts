const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const productController = require('../controller/productController');
const cartController = require('../controller/cartController');
const userProfileController = require('../controller/userProfileController')
const { isLoggedIn } = require('../middleware/auth');

router.get('/home', userController.homeGet)

router.get('/signup', userController.signupGet);
router.post('/signup', userController.signupPost);
router.get('/signin', userController.signinGet);
router.post('/signin', userController.signinPost);

router.get('/auth/google', userController.googleSignIn);
router.get('/auth/google/callback', userController.googleSignInCallback);
router.get('/auth/google/failure', userController.googleSignInFailure);
router.get('/auth/protected', userController.protectedRoute);
router.use('/auth/logout', userController.logout);

router.get('/verifyotp', userController.verifyOTPGet)
router.post('/verifyotp', userController.verifyOTP)

router.get('/forgotpassword', userController.forgotPasswordGet);
router.post('/forgotpassword', userController.forgotPasswordPost);
router.get('/resetpassword/:id/:token', userController.resetPasswordGet);
router.post('/resetpassword/:id/:token', userController.resetPasswordPost);

router.get('/shop', userController.shoppageGet);
router.get('/singleproduct/:id', productController.singleproductGet);
router.get('/accountdetails', isLoggedIn, userProfileController.profileGet);
router.post('/address', userProfileController.addAddress);
router.post('/editaddress/:addressId', userProfileController.editAddress); 
router.delete('/deleteaddress/:addressId', userProfileController.deleteAddress);

router.get('/cart', isLoggedIn, cartController.cartPage);
router.post('/addtocart', isLoggedIn, cartController.addtoCart);
router.post('/update', cartController.updateCart);
router.delete('/:productId', cartController.deleteFromCart);

router.get('/checkout',isLoggedIn,cartController.checkoutPage);
router.post('/checkout/editaddress/:addressId',isLoggedIn,cartController.editAddress);
router.post('/checkout/address',isLoggedIn, cartController.addAddress)

router.get('/sort', productController.sortproductGet);

router.get('/logout', userController.logoutuser);

module.exports = router;
