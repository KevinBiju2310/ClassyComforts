const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

router.get('/signup', userController.signupGet);
router.post('/signup', userController.signupPost);
router.get('/signin', userController.signinGet);
router.post('/signin', userController.signinPost);

router.get('/auth/google', userController.googleSignIn);
router.get('/auth/google/callback', userController.googleSignInCallback);
router.get('/auth/google/failure', userController.googleSignInFailure);
router.get('/auth/protected', userController.protectedRoute);
router.use('/auth/logout', userController.logout);

router.get('/forgotpassword', userController.forgotPasswordGet);
router.post('/forgotpassword', userController.forgotPasswordPost);
router.get('/resetpassword/:id/:token', userController.resetPasswordGet);
router.post('/resetpassword/:id/:token', userController.resetPasswordPost);

module.exports = router;
