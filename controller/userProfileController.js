const Address = require('../modal/addressModel');
const User = require('../modal/userModal');
const bcrypt = require('bcrypt')

exports.profileGet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });

        res.render('accountdetails', { addresses });
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



exports.changepassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;
    console.log(userId)
    try {
        const user = await User.findById(userId);
        console.log(user)
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.render('accountdetails', { error: 'Current password is incorrect' });
        }

        if (newPassword !== confirmPassword) {
            return res.render('accountdetails', { error: 'New password and confirm password do not match' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        res.redirect('/user/accountdetails'); // Redirect to user profile page
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send('Internal Server Error');
    }
};