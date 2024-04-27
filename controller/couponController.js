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