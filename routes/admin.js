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
    const categoryImages = {
        "Trending": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        "Rooms": "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
        "Iconic cities": "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
        "Mountains": "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
        "Castles": "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80",
        "Amazing pools": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80",
        "Camping": "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80",
        "Farms": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
        "Artic": "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80",
        "Domes": "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80",
        "Boats": "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1200&q=80"
    };

    const categories = Object.keys(categoryImages);
    const listings = await Listing.find({}); // Fetch ALL listings to update their images properly

    for (let listing of listings) {
        // Assign a random category if missing
        if (!listing.category || !categories.includes(listing.category)) {
            listing.category = categories[Math.floor(Math.random() * categories.length)];
        }
        
        // Ensure the image matches the assigned category if it is an unsplash image 
        // (to avoid overwriting user uploads unnecessarily, we can just forcefully map all seeded properties)
        if (listing.image.url && listing.image.url.includes("unsplash.com")) {
             listing.image.url = categoryImages[listing.category];
        } else if (!listing.image.url) {
             listing.image.url = categoryImages[listing.category];
        }

        await listing.save();
    }
    req.flash("success", `Successfully aligned images for ${listings.length} listings!`);
    res.redirect("/admin");
}));

module.exports = router;
