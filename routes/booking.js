const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, validateBooking } = require("../middleware.js");
const bookingController = require("../controllers/booking.js");

// POST /listings/:id/book
router.post("/", isLoggedIn, validateBooking, wrapAsync(bookingController.initiateBooking));

// GET /listings/:id/book/:bookingId/verify
router.get("/:bookingId/verify", isLoggedIn, wrapAsync(bookingController.renderVerify));

// POST /listings/:id/book/:bookingId/verify
router.post("/:bookingId/verify", isLoggedIn, wrapAsync(bookingController.verifyOTP));

module.exports = router;
