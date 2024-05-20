const Category = require('../modal/categoryModel')


exports.categoryGet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 7;
        const skip = (page - 1) * limit;

        const category = await Category.find({ deleted: false })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments({ deleted: false });
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('category', {
            category,
            currentPage: page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error("Error rendering Category: ", error);
        res.status(500).send('Internal Server Error');
    }
}


exports.addcategoryPost = async (req, res) => {
    try {
        const { name, status } = req.body;
        const newCategory = new Category({
            name,
            status
        });
        const existingCategory = await Category.findOne({ name, deleted: false });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        await newCategory.save();
        res.redirect('/admin/category')
    } catch (error) {
        console.log("Error occured: ", error);
    }
}

exports.updatecategoryPost = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, status } = req.body;

        const updateCategory = await Category.findByIdAndUpdate(categoryId, { name, status }, { new: true });

        if (!updateCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        console.log("start")
        res.status(200).json({ success: true });
        console.log("finish")
    } catch (error) {
        console.log('Error Occurred: ', error);
        res.status(500).send('Internal Server Error'); // Send appropriate error response
    }
};

exports.deletecategoryPost = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        category.deleted = true;
        await category.save();
        res.redirect('/admin/category');
    } catch (error) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}
