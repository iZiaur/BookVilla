const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, validateBooking } = require("../routeMiddleware.js");
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

// POST /listings/:id/book/:bookingId/resend-otp
router.post("/:bookingId/resend-otp", isLoggedIn, wrapAsync(bookingController.resendOTP));

// GET /listings/:id/book/:bookingId/pay
router.get("/:bookingId/pay", isLoggedIn, wrapAsync(bookingController.renderPayment));

// POST /listings/:id/book/:bookingId/pay/coupon
router.post("/:bookingId/pay/coupon", isLoggedIn, wrapAsync(bookingController.applyCoupon));

// POST /listings/:id/book/:bookingId/pay/checkout
router.post("/:bookingId/pay/checkout", isLoggedIn, wrapAsync(bookingController.createCheckoutSession));

// GET /listings/:id/book/:bookingId/pay/success
router.get("/:bookingId/pay/success", isLoggedIn, wrapAsync(bookingController.paymentSuccess));

// GET /listings/:id/book/:bookingId/pay/cancel
router.get("/:bookingId/pay/cancel", isLoggedIn, wrapAsync(bookingController.paymentCancel));
// GET /listings/:id/book/:bookingId/welcome-guide
router.get("/:bookingId/welcome-guide", isLoggedIn, wrapAsync(bookingController.getWelcomeGuide));

module.exports = router;
