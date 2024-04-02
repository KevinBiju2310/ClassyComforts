const Address = require('../modal/addressModel');

exports.profileGet = async (req, res) => {
    try {
        if (!req.session.user) {
            // If the user is not logged in, redirect them to the login page or show an appropriate message
            return res.redirect('/login'); // Redirect to the login page
        }

        // Fetch the user's address data from the database
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });

        // Render the 'accountdetails' view and pass the address data to it
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

        // Create a new address object
        const newAddress = new Address({
            userId,
            addresses: [{
                name,
                phone,
                address,
                district,
                state,
                city,
                pincode,
                addressType
            }]
        });

        // Save the new address to the database
        await newAddress.save();

        // Redirect the user to the profile page after adding the address
        res.redirect('/user/accountdetails');
    } catch (error) {
        console.log("Error Occurred: ", error);
        res.status(500).send('Error occurred while adding the address');
    }
}
