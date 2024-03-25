const Address = require('../modal/addressModel');
const User = require('../modal/userModal')


exports.profileGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send('Please log in to view addresses');
        }
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId })
        res.render('accountdetails', { addresses })
    } catch (error) {
        console.log("Error Occured : ", error)
    }
}



exports.addressPost = async (req, res) => {
    try {

        if (!req.session.user) {
            return res.redirect('/user/signin');
        }

        const userId = req.session.user._id;
        const { name, phone, address, district, city, state, pincode, addressType } = req.body;

        const newAddress = new Address({
            userId: userId,
            name,
            phone,
            address,
            district,
            state,
            city,
            pincode,
            addressType
        })

        await newAddress.save()
        res.redirect('/user/accountdetails')
    } catch (error) {
        console.log(error);
        res.status(501).send('Internet Server Error');
    }
}