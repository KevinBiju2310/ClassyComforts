const Address = require('../modal/addressModel');
const User = require('../modal/userModal')


exports.profileGet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addresses = await Address.find({ user: userId })
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
        const { name, phone, address, district, state, pincode, addressType } = req.body;

        const newAddress = new Address({
            userId: req.session.user.id,
            name,
            phone,
            address,
            district,
            state,
            pincode,
            addressType
        })

        await newAddress.save()
        res.status(201).send('Address added successfully');
    } catch (error) {
        console.log(error);
        res.status(501).send('Internet Server Error');
    }
}