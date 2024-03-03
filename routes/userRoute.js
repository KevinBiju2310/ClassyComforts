const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

router.get('/signup', userController.signupGet);
router.post('/send', userController.signupPost);
router.get('/signin', userController.signinGet);
router.post('/send2', userController.signinPost);

module.exports = router;
