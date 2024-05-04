const Address = require('../modal/addressModel');
const User = require('../modal/userModal');
const bcrypt = require('bcrypt');
const Order = require('../modal/orderModel');
const Wallet = require('../modal/walletModel');

exports.profileGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/signin');
        }

        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const addresses = await Address.find({ userId });
        const orderPage = req.query.orderPage || 1;
        const orderPerPage = 5; // Adjust as needed
        const orderCount = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(orderCount / orderPerPage);
        const order = await Order.find({ userId })
            .populate('products.productId')
            .skip((orderPage - 1) * orderPerPage)
            .limit(orderPerPage);
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            const defaultWalletAmount = 0;
            res.render('accountdetails', { addresses, user, order, totalPages, orderPage, wallet: { amount: defaultWalletAmount } });
        } else {
            res.render('accountdetails', { addresses, user, order, totalPages, orderPage, wallet });
        }
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while fetching user profile');
    }
}


exports.addAddress = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send('Please log in to add an address');
        }

        const { name, phone, address, district, state, city, pincode, addressType } = req.body;
        const userId = req.session.user._id;

        // Find the user's address document
        let userAddress = await Address.findOne({ userId });

        // If the user doesn't have an address document, create one
        if (!userAddress) {
            userAddress = new Address({
                userId,
                items: []
            });
        }

        // Add the new address to the items array
        userAddress.items.push({
            name,
            phone,
            address,
            district,
            state,
            city,
            pincode,
            addressType
        });

        // Save the updated address document
        await userAddress.save();
        res.redirect('/user/accountdetails');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while adding the address');
    }
}



exports.editAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const { name, phone, address, district, state, city, pincode, addressType } = req.body;

        await Address.findOneAndUpdate(
            { "items._id": addressId },
            {
                $set: {
                    "items.$.name": name,
                    "items.$.phone": phone,
                    "items.$.address": address,
                    "items.$.district": district,
                    "items.$.state": state,
                    "items.$.city": city,
                    "items.$.pincode": pincode,
                    "items.$.addressType": addressType
                }
            }
        );

        res.redirect('/user/accountdetails');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while editing the address');
    }
}


// Controller function to delete an address
exports.deleteAddress = async (req, res) => {
    const { addressId } = req.params;
    try {
        console.log('Deleting address:', addressId);
        const userId = req.session.user._id;
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ message: "User's address not found" });
        }

        const addressIndex = userAddress.items.findIndex(item => item._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ message: "Address not found" });
        }

        userAddress.items.splice(addressIndex, 1);

        await userAddress.save();

        console.log('Deleted address:', addressId);
        res.json({ message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




exports.changedetails = async (req, res) => {
    const userId = req.session.user._id;
    const { changename, changephone, changeemail } = req.body;
    try {
        const user = await User.findByIdAndUpdate(userId, { name: changename, email: changeemail, phone: changephone }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User details updated successfully" });
    } catch (error) {
        console.log("Error occurred", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}




exports.changepassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;
    console.log(userId)
    try {
        const user = await User.findById(userId);
        console.log(user)
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New password and confirm password do not match' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        res.redirect('/user/accountdetails');
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send('Internal Server Error');
    }
};



