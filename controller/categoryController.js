const Category = require('../modal/categoryModel')


exports.categoryGet = async (req, res) => {
    try {
        const category = await Category.find({ deleted: false })
        res.render('category', { category })
    } catch (error) {
        console.error("Error rendering Cateory: ", error);
        res.status(500).send('Internet Server Error');
    }
}

exports.addcategoryPost = async (req, res) => {
    try {
        const { name, status } = req.body;
        const newCategory = new Category({
            name,
            status
        });
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
