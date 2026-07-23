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

        // Fetch recent bookings for the Activity Log
        const Booking = require("../models/booking.js");
        const recentActivity = await Booking.find({})
            .populate('user')
            .populate({
                path: 'listing',
                populate: { path: 'owner' }
            })
            .sort({ _id: -1 })
            .limit(50)
            .lean();

        res.render("admin/dashboard.ejs", { totalListings, totalUsers, totalReviews, recentListings, recentUsers, recentActivity });
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
        
        // Delete bookings and activities associated with this user
        const Booking = require("../models/booking.js");
        const Activity = require("../models/activity.js");
        await Booking.deleteMany({ user: id });
        await Activity.deleteMany({ user: id });
        
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
        const categoryImages = {
            "Trending": [
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"
            ],
            "Rooms": [
                "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80"
            ],
            "Iconic cities": [
                "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80"
            ],
            "Mountains": [
                "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1518730518541-d0843268c287?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
            ],
            "Castles": [
                "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=1200&q=80"
            ],
            "Amazing pools": [
                "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1200&q=80"
            ],
            "Camping": [
                "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?auto=format&fit=crop&w=1200&q=80"
            ],
            "Farms": [
                "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=1200&q=80"
            ],
            "Artic": [
                "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1647895252554-3e981df5a043?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1542605995-1823eb9133bd?auto=format&fit=crop&w=1200&q=80"
            ],
            "Domes": [
                "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1518481852504-037667d4ee7f?auto=format&fit=crop&w=1200&q=80"
            ],
            "Boats": [
                "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1200&q=80"
            ]
        };

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
        const categories = Object.keys(categoryImages);
        
        const houseRulesOptions = [
            "No smoking\nNo pets\nQuiet hours 10 PM - 8 AM\nCheck-out at 11 AM",
            "Pets allowed (max 2)\nNo parties or events\nSelf check-in with keypad\nCheck-out at 10 AM",
            "No smoking inside\nSuitable for children\nNo loud music after 11 PM\nCheck-out at 12 PM",
            "Adults only\nNo shoes inside\nEvents allowed upon request\nCheck-out at 11 AM",
            "Pet friendly\nSmoking allowed in designated areas\nNo unregistered guests\nCheck-out at 10 AM"
        ];

        const cancellationPolicyOptions = [
            "Flexible - Full refund up to 24 hours before check-in.",
            "Moderate - Full refund up to 5 days before check-in.",
            "Strict - Full refund up to 14 days before check-in, 50% refund afterward.",
            "Non-refundable - Cancel anytime, but no refund will be provided.",
            "Super Strict - Full refund up to 30 days before check-in."
        ];

        let generatedListings = [];
        const ownerId = req.user._id;

        for (let i = 0; i < 100; i++) {
            const randomLoc = locations[Math.floor(Math.random() * locations.length)];
            const randomTitle = titles[Math.floor(Math.random() * titles.length)];
            const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const randomCat = categories[Math.floor(Math.random() * categories.length)];
            const randomHouseRule = houseRulesOptions[Math.floor(Math.random() * houseRulesOptions.length)];
            const randomPolicy = cancellationPolicyOptions[Math.floor(Math.random() * cancellationPolicyOptions.length)];
            const imgArray = categoryImages[randomCat];
            const matchedImg = imgArray[Math.floor(Math.random() * imgArray.length)];
            const price = Math.floor(Math.random() * 15000) + 1500;

            generatedListings.push(new Listing({
                title: `${randomAdj} ${randomTitle}`,
                description: `Experience luxury and comfort in this amazing property. Perfect for your next getaway with family or friends. Includes modern amenities and breathtaking views.`,
                image: {
                    url: matchedImg,
                    filename: `unsplash_${randomCat}_${i}`
                },
                category: randomCat,
                price: price,
                location: randomLoc.loc,
                country: randomLoc.country,
                houseRules: randomHouseRule,
                cancellationPolicy: randomPolicy,
                owner: ownerId,
                geometry: {
                    type: "Point",
                    coordinates: randomLoc.coords
                }
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

module.exports.renderUserActivityReport = async (req, res) => {
    try {
        const { id } = req.params;
        const User = require("../models/user.js");
        const Booking = require("../models/booking.js");
        const Activity = require("../models/activity.js");
        const Review = require("../models/review.js");

        const targetUser = await User.findById(id);
        if (!targetUser) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin');
        }

        const userBookings = await Booking.find({ user: id }).populate('listing').sort({ createdAt: -1 });
        const userActivities = await Activity.find({ user: id }).sort({ createdAt: -1 });
        const userReviews = await Review.find({ author: id }).populate('listing').sort({ createdAt: -1 });

        res.render("admin/user_activity.ejs", { 
            targetUser, 
            userBookings, 
            userActivities, 
            userReviews 
        });
    } catch (err) {
        console.error("User Activity Report Error:", err);
        req.flash('error', 'Error loading user activity report.');
        res.redirect('/admin');
    }
};
