let express = require("express");
let router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { listingSchema, reviewSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validatelisting } = require('../middleware.js');
const listingController = require("../controllers/listing.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

console.log("Listing routes loaded"); // Add this to confirm the file is loaded

// Index and Create Route
router.route("/").get(wrapAsync(listingController.index)).post(isLoggedIn,upload.single("listing[image]") ,validatelisting, wrapAsync(listingController.createListing))




// Rest of your routes...
router.get("/new", isLoggedIn, listingController.renderNewForm);
router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.editListing));
router.route("/:id")
    .put(isLoggedIn, isOwner,upload.single("listing[image]"), validatelisting, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListing))
    .get(wrapAsync(listingController.showListing));

module.exports = router;