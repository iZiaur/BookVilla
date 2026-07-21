const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware.js");
const adminController = require("../controllers/admin.js");
const wrapAsync = require("../utils/wrapAsync");

// Admin Dashboard
router.get("/", isAdmin, wrapAsync(adminController.renderDashboard));

// Admin Delete Actions
router.delete("/listings/:id", isAdmin, wrapAsync(adminController.deleteListing));
router.delete("/users/:id", isAdmin, wrapAsync(adminController.deleteUser));
router.delete("/reviews/:id", isAdmin, wrapAsync(adminController.deleteReview));

const Listing = require("../models/listing.js");

// Seed Route
router.post("/seed", isAdmin, wrapAsync(adminController.seedListings));

// Temporary Migration Route
router.get("/migrate-categories", isAdmin, wrapAsync(async (req, res) => {
    const categories = ["Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing pools", "Camping", "Farms", "Artic", "Domes", "Boats"];
    const listings = await Listing.find({ category: { $exists: false } });
    for (let listing of listings) {
        listing.category = categories[Math.floor(Math.random() * categories.length)];
        await listing.save();
    }
    req.flash("success", `Migrated ${listings.length} listings to have categories.`);
    res.redirect("/admin");
}));

module.exports = router;
