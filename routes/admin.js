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

// Seed Route
router.post("/seed", isAdmin, wrapAsync(adminController.seedListings));

module.exports = router;
