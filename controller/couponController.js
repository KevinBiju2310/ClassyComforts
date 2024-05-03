const Coupon = require('../modal/couponModel');



exports.couponPage = async (req, res) => {
    try {
        const coupon = await Coupon.find();
        res.render('coupon', { coupon });
    } catch (error) {
        console.log("Error Occured: ", error);
        res.status(500).json({ error: 'Failed to get coupon' });
    }
}

exports.addCoupon = async (req, res) => {
    const { couponname, couponcode, minimumamount, discountamount, startDate, endDate, status } = req.body;
    try {
        const newCoupon = new Coupon({
            couponname,
            couponcode,
            minimumamount,
            discountamount,
            startDate,
            endDate,
            status
        })
        await newCoupon.save();
        res.redirect('/admin/coupon')
    } catch (error) {
        console.log("Error Occured: ", error);
        res.status(500).json({ error: 'Failed to get coupon' });
    }
}


exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        coupon.status = req.body.status;
        await coupon.save();

        res.json({ message: 'Coupon status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
}



exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({ message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
}

exports.checkvalidation = async (req, res) => {
    try {
        const { couponname, couponcode } = req.body;

        const existingCoupon = await Coupon.findOne({
            $or: [
                { couponname: couponname },
                { couponcode: couponcode }
            ]
        });

        let exists = false;
        let existingCouponName = false;
        let existingCouponCode = false;

        if (existingCoupon) {
            exists = true;
            if (existingCoupon.couponname === couponname) {
                existingCouponName = true;
            }
            if (existingCoupon.couponcode === couponcode) {
                existingCouponCode = true;
            }
        }

        res.json({ exists, couponname: existingCouponName, couponcode: existingCouponCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
}


exports.applyCoupon = async (req, res) => {
    try {
        const { couponId, subtotal } = req.body;
        const coupon = await Coupon.findById(couponId);
        console.log(coupon, "Coupons")
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code.' });
        }

        if (coupon.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Coupon is not active.' });
        }
        const currentDate = new Date();
        if (coupon.endDate < currentDate) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        if (subtotal < coupon.minimumamount) {
            return res.status(400).json({ success: false, message: 'Minimum amount not met to apply coupon.' });
        }
        res.status(200).json({ success: true, message: 'Coupon applied successfully.', coupon });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.' });
    }
}

