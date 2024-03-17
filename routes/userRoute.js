const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const productController = require('../controller/productController')

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


router.get('/shop',userController.shoppageGet)
router.get('/singleproduct',productController.singleproductGet)

module.exports = router;
