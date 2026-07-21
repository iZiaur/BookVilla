const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Review = require("../models/review.js");

module.exports.renderDashboard = async (req, res) => {
    try {
        const totalListings = await Listing.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalReviews = await Review.countDocuments();

        const recentListings = await Listing.find({}).populate('owner').sort({ _id: -1 }).limit(10).lean();
        const recentUsers = await User.find({}).sort({ _id: -1 }).limit(10).lean();

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

module.exports.seedListings = async (req, res) => {
    try {
        const images = [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1de24220e8?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
        ];

        const locations = [
            { loc: "Mumbai", country: "India", coords: [72.8777, 19.0760] },
            { loc: "Delhi", country: "India", coords: [77.2090, 28.6139] },
            { loc: "Bengaluru", country: "India", coords: [77.5946, 12.9716] },
            { loc: "Hyderabad", country: "India", coords: [78.4867, 17.3850] },
            { loc: "Ahmedabad", country: "India", coords: [72.5714, 23.0225] },
            { loc: "Chennai", country: "India", coords: [80.2707, 13.0827] },
            { loc: "Kolkata", country: "India", coords: [88.3639, 22.5726] },
            { loc: "Pune", country: "India", coords: [73.8567, 18.5204] },
            { loc: "Jaipur", country: "India", coords: [75.7873, 26.9124] },
            { loc: "Goa", country: "India", coords: [74.1240, 15.2993] },
            { loc: "Agra", country: "India", coords: [78.0081, 27.1767] },
            { loc: "Varanasi", country: "India", coords: [82.9739, 25.3176] },
            { loc: "Udaipur", country: "India", coords: [73.6828, 24.5854] },
            { loc: "Kochi", country: "India", coords: [76.2673, 9.9312] },
            { loc: "Shimla", country: "India", coords: [77.1734, 31.1048] }
        ];

        const titles = [
            "Luxury Villa with Private Pool", "Cozy Mountain Cabin", "Modern City Apartment", 
            "Beachfront Paradise", "Rustic Farmhouse Retreat", "Historic Castle Estate",
            "Stunning Penthouse Suite", "Secluded Forest Lodge", "Eco-Friendly Tiny Home"
        ];

        const adjectives = ["Beautiful", "Stunning", "Peaceful", "Luxurious", "Breathtaking", "Charming", "Spectacular"];

        let generatedListings = [];
        const ownerId = req.user._id;

        for (let i = 0; i < 100; i++) {
            const randomLoc = locations[Math.floor(Math.random() * locations.length)];
            const randomImg = images[Math.floor(Math.random() * images.length)];
            const randomTitle = titles[Math.floor(Math.random() * titles.length)];
            const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const price = Math.floor(Math.random() * 15000) + 1500;

            generatedListings.push(new Listing({
                title: `${randomAdj} ${randomTitle}`,
                description: `Experience the best of ${randomLoc.loc} in this amazing property. Perfect for vacations, getaways, and making memories.`,
                image: { url: randomImg, filename: `seed_img_${i}` },
                price: price.toString(),
                location: randomLoc.loc,
                country: randomLoc.country,
                owner: ownerId,
                geometry: { type: 'Point', coordinates: randomLoc.coords }
            }));
        }

        await Listing.insertMany(generatedListings);
        req.flash("success", "Successfully seeded 100 new listings!");
        res.redirect("/admin");
    } catch (err) {
        req.flash("error", "Error seeding data.");
        res.redirect("/admin");
    }
};
