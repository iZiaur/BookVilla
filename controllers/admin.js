const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Review = require("../models/review.js");

module.exports.renderDashboard = async (req, res) => {
    try {
        const totalListings = await Listing.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalReviews = await Review.countDocuments();

        const recentListings = await Listing.find({}).populate('owner').sort({ _id: -1 }).limit(10);
        const recentUsers = await User.find({}).sort({ _id: -1 }).limit(10);

        res.render("admin/dashboard.ejs", { totalListings, totalUsers, totalReviews, recentListings, recentUsers });
    } catch (err) {
        req.flash("error", "Error loading dashboard.");
        res.redirect("/listings");
    }
};

module.exports.deleteListing = async (req, res) => {
    try {
        let { id } = req.params;
        await Listing.findByIdAndDelete(id);
        req.flash("success", "Listing deleted by Admin!");
        res.redirect("/admin");
    } catch (err) {
        req.flash("error", "Error deleting listing.");
        res.redirect("/admin");
    }
};

module.exports.deleteUser = async (req, res) => {
    try {
        let { id } = req.params;
        
        // Find all listings owned by this user
        const userListings = await Listing.find({ owner: id });
        
        // Delete each listing one by one to trigger the findOneAndDelete middleware 
        // which automatically cleans up the reviews on those listings.
        for (let listing of userListings) {
            await Listing.findByIdAndDelete(listing._id);
        }
        
        // Delete any reviews this user left on other listings
        await Review.deleteMany({ author: id });
        
        // Finally, delete the user
        await User.findByIdAndDelete(id);
        
        req.flash("success", "User and all their data deleted successfully!");
        res.redirect("/admin");
    } catch (err) {
        req.flash("error", "Error deleting user.");
        res.redirect("/admin");
    }
};

module.exports.deleteReview = async (req, res) => {
    try {
        let { id } = req.params;
        await Review.findByIdAndDelete(id);
        req.flash("success", "Review deleted by Admin!");
        res.redirect("/admin");
    } catch (err) {
        req.flash("error", "Error deleting review.");
        res.redirect("/admin");
    }
};
