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

    const categories = Object.keys(categoryImages);
    const listings = await Listing.find({}); 

    for (let listing of listings) {
        if (!listing.category || !categories.includes(listing.category)) {
            listing.category = categories[Math.floor(Math.random() * categories.length)];
        }
        
        if (listing.image.url && listing.image.url.includes("unsplash.com")) {
             let imgArray = categoryImages[listing.category];
             listing.image.url = imgArray[Math.floor(Math.random() * imgArray.length)];
        } else if (!listing.image.url) {
             let imgArray = categoryImages[listing.category];
             listing.image.url = imgArray[Math.floor(Math.random() * imgArray.length)];
        }

        await listing.save();
    }
    req.flash("success", `Successfully aligned diverse images for ${listings.length} listings!`);
    res.redirect("/admin");
}));

module.exports = router;
