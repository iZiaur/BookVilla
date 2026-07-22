const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, validateBooking } = require("../middleware.js");
const bookingController = require("../controllers/booking.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// GET /listings/:id/book/checkout
router.get("/checkout", isLoggedIn, wrapAsync(bookingController.renderCheckout));

// POST /listings/:id/book
router.post("/", isLoggedIn, upload.single("governmentId"), validateBooking, wrapAsync(bookingController.initiateBooking));

// GET /listings/:id/book/:bookingId/verify
router.get("/:bookingId/verify", isLoggedIn, wrapAsync(bookingController.renderVerify));

// POST /listings/:id/book/:bookingId/verify
router.post("/:bookingId/verify", isLoggedIn, wrapAsync(bookingController.verifyOTP));

module.exports = router;
