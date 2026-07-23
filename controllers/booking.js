const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock_key' });

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

// Helper to send confirmation email
const sendConfirmationEmail = async (booking, userEmail) => {
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const finalPrice = booking.totalPrice - (booking.discountAmount || 0);
            
            // Generate Welcome Guide via AI
            let aiWelcomeGuideHTML = '';
            try {
                const prompt = `
                You are a warm, welcoming Airbnb superhost for the property "${booking.listing.title}" located in ${booking.listing.location}.
                Write a highly personalized, enthusiastic welcome letter for a guest named ${booking.guestName}.
                Include some quick packing tips and 2-3 local recommendations for things to do or eat in ${booking.listing.location}.
                IMPORTANT: 
                - Use very few emojis (max 2 total). 
                - Format the output strictly as valid HTML using <p>, <ul>, <li>, <strong>, and <h4 style="color: #0d6efd; margin-top: 15px; margin-bottom: 5px;"> tags.
                - Do NOT use Markdown. Do NOT wrap in \`\`\`html blocks.
                - Keep it under 200 words and well-structured.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
                    contents: prompt,
                });

                let htmlResponse = response.text.replace(/```html|```/g, '').trim();
                
                aiWelcomeGuideHTML = `
                <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ced4da;">
                    <h3 style="margin-top: 0; color: #212529;">✨ Your Personalized Welcome Guide</h3>
                    <div style="font-size: 15px; line-height: 1.5; color: #333;">
                        ${htmlResponse}
                    </div>
                </div>
                `;
            } catch (aiErr) {
                console.error("Failed to generate AI Welcome Guide for email:", aiErr);
            }

            const mailPromise = transporter.sendMail({
                from: `"BookVilla Reservations" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: "Your Booking Itinerary & Confirmation - BookVilla",
                text: `Hi ${booking.guestName}, your payment was successful and your reservation at ${booking.listing.title} is confirmed. Check-in: ${new Date(booking.checkIn).toLocaleDateString()}. Total Paid: ₹${finalPrice}. Log in to view your full itinerary and welcome guide.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background-color: #212529; color: white; padding: 20px; text-align: center;">
                            <h2 style="margin: 0;">Booking Confirmed! 🎉</h2>
                        </div>
                        <div style="padding: 20px; background-color: #f8f9fa;">
                            <p style="font-size: 16px;">Hi <b>${booking.guestName}</b>,</p>
                            <p style="font-size: 16px;">Your payment was successful and your reservation at <b>${booking.listing.title}</b> is confirmed.</p>
                            
                            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
                                <h3 style="margin-top: 0; color: #cc222e;">Booking Details</h3>
                                <p><b>Check-in:</b> ${new Date(booking.checkIn).toLocaleDateString()}</p>
                                <p><b>Check-out:</b> ${new Date(booking.checkOut).toLocaleDateString()}</p>
                                <p><b>Guests:</b> ${booking.numberOfGuests}</p>
                                <p><b>Location:</b> ${booking.listing.location}, ${booking.listing.country}</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                                <p style="font-size: 18px; margin: 0;"><b>Total Paid:</b> ₹${finalPrice.toLocaleString("en-IN")}</p>
                            </div>
                            
                            ${aiWelcomeGuideHTML}
                            
                            <p style="font-size: 14px; color: #666;">You can view more details and contact your host from your <a href="https://book-villa.vercel.app/profile" style="color: #0d6efd;">BookVilla Profile</a>.</p>
                        </div>
                    </div>
                `,
                headers: {
                    'X-Entity-Ref-ID': booking._id.toString()
                }
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8500));
            await Promise.race([mailPromise, timeoutPromise]);
            console.log("Confirmation email sent to:", userEmail);
        }
    } catch (err) {
        console.error("Failed to send confirmation email:", err);
    }
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
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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
            const mailPromise = transporter.sendMail({
                from: `"BookVilla Security" <${process.env.EMAIL_USER}>`,
                to: req.user.email,
                subject: "Action Required: Verify Your Booking",
                text: `Your Booking Verification Code for ${listing.title} is: ${otp}. This code expires in 5 minutes.`,
                html: `<h3>Your Booking Verification Code</h3><p>Use the following OTP to confirm your booking at <b>${listing.title}</b>:</p><h2>${otp}</h2><p>This code expires in 5 minutes.</p>`,
                headers: {
                    'X-Entity-Ref-ID': booking._id.toString()
                }
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8500));
            await Promise.race([mailPromise, timeoutPromise]);
        }
    } catch (err) {
        console.error("Failed to send OTP email or timed out:", err);
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

    // Success! Update booking status to Awaiting Payment
    booking.status = "Awaiting Payment";
    booking.otp = undefined; // clear OTP
    booking.otpExpires = undefined;
    await booking.save();

    req.flash('success', 'OTP Verified! Please complete your payment to confirm the booking.');
    res.redirect(`/listings/${id}/book/${bookingId}/pay`);
};

module.exports.resendOTP = async (req, res) => {
    const { id, bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('listing');
    
    if (!booking) {
        req.flash('error', 'Booking not found.');
        return res.redirect(`/listings/${id}`);
    }

    if (booking.status === "Confirmed" || booking.status === "Awaiting Payment") {
        req.flash('error', 'Booking is already verified or confirmed.');
        return res.redirect('/profile');
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    booking.otp = otp;
    booking.otpExpires = otpExpires;
    await booking.save();

    console.log(`[DEV OTP] Your NEW OTP for booking ${booking._id} is: ${otp}`);

    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailPromise = transporter.sendMail({
                from: `"BookVilla Security" <${process.env.EMAIL_USER}>`,
                to: req.user.email,
                subject: "Action Required: Verify Your Booking (New OTP)",
                text: `Your new Booking Verification Code for ${booking.listing.title} is: ${otp}. This code expires in 5 minutes.`,
                html: `<h3>Your Booking Verification Code</h3><p>Use the following new OTP to confirm your booking at <b>${booking.listing.title}</b>:</p><h2>${otp}</h2><p>This code expires in 5 minutes.</p>`,
                headers: {
                    'X-Entity-Ref-ID': booking._id.toString()
                }
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8500));
            await Promise.race([mailPromise, timeoutPromise]);
        }
    } catch (err) {
        console.error("Failed to send NEW OTP email or timed out:", err);
    }

    req.flash('success', 'A new OTP has been sent to your email.');
    res.redirect(`/listings/${id}/book/${bookingId}/verify`);
};

module.exports.renderPayment = async (req, res) => {
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

    if (booking.status !== "Awaiting Payment") {
        req.flash('error', 'Invalid booking status for payment.');
        return res.redirect(`/listings/${id}`);
    }

    res.render('bookings/pay.ejs', { booking, stripeConfigured: !!process.env.STRIPE_SECRET_KEY });
};

module.exports.applyCoupon = async (req, res) => {
    const { bookingId } = req.params;
    const { couponCode } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // Example logic: if coupon is "SAVE25", give 25% off.
    if (couponCode === 'SAVE25') {
        const discount = booking.totalPrice * 0.25;
        booking.discountAmount = discount;
        await booking.save();
        return res.json({ success: true, discountAmount: discount, newTotal: booking.totalPrice - discount });
    }

    return res.status(400).json({ error: 'Invalid coupon code' });
};

module.exports.createCheckoutSession = async (req, res) => {
    const { id, bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('listing');
    
    if (!booking || booking.status !== "Awaiting Payment") {
        req.flash('error', 'Invalid booking for payment.');
        return res.redirect(`/listings/${id}`);
    }

    const domain = `${req.protocol}://${req.get('host')}`;
    const finalPrice = booking.totalPrice - (booking.discountAmount || 0);

    // Mock payment fallback if Stripe is not configured
    if (!process.env.STRIPE_SECRET_KEY) {
        booking.status = "Confirmed";
        await booking.save();
        
        // Send confirmation email
        await sendConfirmationEmail(booking, req.user.email);
        
        req.flash('success', `Mock Payment Successful! Enjoy your stay at ${booking.listing.title}!`);
        return res.redirect('/profile');
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Booking at ${booking.listing.title}`,
                            description: `${booking.numberOfGuests} guests`,
                        },
                        unit_amount: finalPrice * 100, // Stripe expects amount in paise/cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${domain}/listings/${id}/book/${bookingId}/pay/success`,
            cancel_url: `${domain}/listings/${id}/book/${bookingId}/pay/cancel`,
        });

        res.redirect(303, session.url);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error initializing payment gateway.');
        res.redirect(`/listings/${id}/book/${bookingId}/pay`);
    }
};

module.exports.paymentSuccess = async (req, res) => {
    const { id, bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('listing');
    
    if (!booking) return res.redirect('/profile');

    booking.status = "Confirmed";
    await booking.save();

    // Send confirmation email
    await sendConfirmationEmail(booking, req.user.email);

    req.flash('success', `Payment Successful! Enjoy your stay at ${booking.listing.title}!`);
    res.redirect('/profile');
};

module.exports.paymentCancel = async (req, res) => {
    const { id, bookingId } = req.params;
    req.flash('error', 'Payment was cancelled. You can complete it later from your profile.');
    res.redirect(`/listings/${id}/book/${bookingId}/pay`);
};

module.exports.getWelcomeGuide = async (req, res) => {
    try {
        const { id, bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate('listing');
        
        if (!booking) {
            return res.json({ success: false, error: 'Booking not found.' });
        }

        if (booking.status !== "Confirmed") {
            return res.json({ success: false, error: 'Welcome guide is only available for confirmed bookings.' });
        }
        
        if (booking.aiWelcomeGuide) {
            return res.json({ success: true, guide: booking.aiWelcomeGuide });
        }

        const prompt = `
        You are a warm, welcoming Airbnb superhost for the property "${booking.listing.title}" located in ${booking.listing.location}.
        Write a highly personalized, enthusiastic welcome letter for a guest named ${booking.guestName}.
        Include some quick packing tips and 2-3 local recommendations for things to do or eat in ${booking.listing.location}.
        IMPORTANT: 
        - Use very few emojis (max 2 total). 
        - Format the output strictly as valid HTML using <p>, <ul>, <li>, <strong>, and <h5 class="fw-bold mt-3 text-primary"> tags.
        - Do NOT use Markdown. Do NOT wrap in \`\`\`html blocks.
        - Keep it well-structured and under 250 words.
        `;

        const { generateText } = require('../utils/aiHelper');
        const textResponse = await generateText(prompt);

        let htmlResponse = textResponse.replace(/```html|```/g, '').trim();
        
        booking.aiWelcomeGuide = htmlResponse;
        await booking.save();

        res.json({ success: true, guide: htmlResponse });
    } catch (err) {
        console.error("AI Welcome Guide Error:", err);
        
        const fallbackGuide = `
        <h5 class="fw-bold mt-3 text-primary">Welcome to ${booking.listing.location}!</h5>
        <p>Dear ${booking.guestName},</p>
        <p>We are absolutely thrilled to host you! Our AI assistant is currently taking a little nap, but we wanted to make sure you still receive a warm welcome.</p>
        <p><strong>Quick Tips:</strong></p>
        <ul>
            <li>Check the local weather before packing to ensure you're comfortable during your stay.</li>
            <li>Don't hesitate to reach out if you need anything at all!</li>
        </ul>
        <p>We hope you have an amazing stay!</p>
        `;
        
        res.json({ success: true, guide: fallbackGuide });
    }
};
