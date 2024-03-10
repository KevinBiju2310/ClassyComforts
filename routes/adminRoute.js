const express = require('express')
const router = express.Router()
const adminController = require('../controller/adminController')


router.get('/login',adminController.signInGet)
router.post('/login',adminController.signInPost)

router.get('/dashboard',adminController.dashboardGet)

router.get('/userlist',adminController.userlistGet)


module.exports = router