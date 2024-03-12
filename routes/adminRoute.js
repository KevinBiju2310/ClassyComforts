const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController')


router.get('/login',adminController.signInGet)
router.post('/login',adminController.signInPost)

router.get('/dashboard',adminController.dashboardGet)

router.get('/userlist',adminController.userlistGet)

router.post('/toggleUserBlock/:id', adminController.toggleUserBlock);

// Block and unblock users
// router.post('/blockUser/:id', adminController.blockUser);
// router.post('/unblockUser/:id', adminController.unblockUser);

router.get('/category',adminController.categoryGet)


module.exports = router