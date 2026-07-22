const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You might want to use SendGrid/Mailgun in production
    auth: {
        user: process.env.EMAIL_USER || 'test@example.com', // Need to set these in .env later
        pass: process.env.EMAIL_PASS || 'password'
    }
});

// Helper to generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports.renderCheckout = async (req, res) => {
    const { id } = req.params;
    const { "booking[checkIn]": checkIn, "booking[checkOut]": checkOut } = req.query;

    if (!checkIn || !checkOut) {
        req.flash('error', 'Please select check-in and check-out dates.');
        return res.redirect(`/listings/${id}`);
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate <= today) {
        req.flash('error', 'Bookings must start from tomorrow onwards.');
        return res.redirect(`/listings/${id}`);
    }

    if (checkOutDate <= checkInDate) {
        req.flash('error', 'Check-out date must be after check-in date.');
        return res.redirect(`/listings/${id}`);
    }

    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const pricePerNight = parseFloat(listing.price) || 0;
    const totalPrice = nights * pricePerNight;

    res.render('bookings/checkout.ejs', { listing, checkIn, checkOut, totalPrice });
};

module.exports.initiateBooking = async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut, guestName, guestEmail, numberOfGuests } = req.body.booking;

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate <= today) {
        req.flash('error', 'Bookings must start from tomorrow onwards.');
        return res.redirect(`/listings/${id}`);
    }

    if (checkOutDate <= checkInDate) {
        req.flash('error', 'Check-out date must be after check-in date.');
        return res.redirect(`/listings/${id}`);
    }

    // Calculate nights and total price
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const pricePerNight = parseFloat(listing.price) || 0;
    const totalPrice = nights * pricePerNight;

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Verify consent
    if (req.body.booking.consentGiven !== 'on') {
        req.flash('error', 'You must provide consent to book.');
        return res.redirect(`/listings/${id}`);
    }

    // Verify guest count
    const guests = parseInt(numberOfGuests, 10);
    if (guests > listing.maxGuests) {
        req.flash('error', `This property allows a maximum of ${listing.maxGuests} guests.`);
        return res.redirect(`/listings/${id}`);
    }

    // Verify file upload
    if (!req.file) {
        req.flash('error', 'Government ID is required.');
        return res.redirect(`/listings/${id}`);
    }

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
        listing: id,
        status: { $in: ["Pending", "Confirmed"] },
        $or: [
            { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
        ]
    });

    if (overlappingBooking) {
        req.flash('error', 'These dates are already booked. Please choose different dates.');
        return res.redirect(`/listings/${id}`);
    }

    const url = req.file.path;
    const filename = req.file.filename;

    // Create pending booking
    const booking = new Booking({
        user: req.user._id,
        listing: id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestName: guestName,
        guestEmail: guestEmail,
        numberOfGuests: guests,
        totalPrice: totalPrice,
        status: "Pending",
        otp: otp,
        otpExpires: otpExpires,
        governmentId: { url, filename },
        consentGiven: true
    });

    await booking.save();

    // In a real app, send email here. Since it's a test/portfolio app without real SMTP credentials by default, 
    // we will mock it or just log it so the user can test easily.
    console.log(`[DEV OTP] Your OTP for booking ${booking._id} is: ${otp}`);
    
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `"BookVilla" <${process.env.EMAIL_USER}>`,
                to: req.user.email,
                subject: "BookVilla - Your Booking OTP",
                html: `<h3>Your Booking Verification Code</h3><p>Use the following OTP to confirm your booking at <b>${listing.title}</b>:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`
            });
        }
    } catch (err) {
        console.error("Failed to send OTP email:", err);
        // Continue anyway so testing isn't blocked by missing email creds
    }

    req.flash('success', 'OTP sent to your email. Please verify to confirm booking.');
    res.redirect(`/listings/${id}/book/${booking._id}/verify`);
};

module.exports.renderVerify = async (req, res) => {
    const { id, bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('listing');
    
    if (!booking) {
        req.flash('error', 'Booking not found.');
        return res.redirect(`/listings/${id}`);
    }
    
    if (booking.status === "Confirmed") {
        req.flash('error', 'Booking is already confirmed.');
        return res.redirect('/profile');
    }

    res.render('bookings/verify.ejs', { booking });
};

module.exports.verifyOTP = async (req, res) => {
    const { id, bookingId } = req.params;
    const { otp } = req.body;
    
    const booking = await Booking.findById(bookingId).populate('listing');
    
    if (!booking) {
        req.flash('error', 'Booking not found.');
        return res.redirect(`/listings/${id}`);
    }

    if (booking.status === "Confirmed") {
        req.flash('error', 'Booking is already confirmed.');
        return res.redirect('/profile');
    }

    if (new Date() > booking.otpExpires) {
        req.flash('error', 'OTP has expired. Please try booking again.');
        return res.redirect(`/listings/${id}`);
    }

    if (booking.otp !== otp) {
        req.flash('error', 'Invalid OTP. Please try again.');
        return res.redirect(`/listings/${id}/book/${bookingId}/verify`);
    }

    // Success! Update booking status
    booking.status = "Confirmed";
    booking.otp = undefined; // clear OTP
    booking.otpExpires = undefined;
    await booking.save();

    req.flash('success', `Booking Confirmed! Enjoy your stay at ${booking.listing.title}!`);
    res.redirect('/profile');
};
