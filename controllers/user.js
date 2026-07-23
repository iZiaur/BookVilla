let User = require("../models/user.js");
let Listing = require("../models/listing.js");
let Booking = require("../models/booking.js");
const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock_key' });

module.exports.renderSignUpForm=(req,res)=>{
    res.redirect('/login?mode=signup');
}
module.exports.signup=(async(req,res,next)=>{
    try{
        let{username,email,password,phone}=req.body;
        
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(username)) {
            req.flash('error', 'Username must contain only letters and numbers, with no spaces.');
            return res.redirect('/login?mode=signup');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash('error', 'Please provide a valid email address.');
            return res.redirect('/login?mode=signup');
        }

        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordRegex.test(password)) {
            req.flash('error', 'Password must be at least 8 characters long, including an uppercase letter, a lowercase letter, and a number.');
            return res.redirect('/login?mode=signup');
        }

        let newUser=new User({email,username,phone: phone || 'Not provided'});
        let registeredUser=await User.register(newUser,password);
        req.login(registeredUser,(err)=>{
            if(err){
                return next(err);
            }
            req.flash('success','Welcome to BookVilla!')
            res.redirect("/listings");
        })
        console.log(registeredUser);
        
    }
    catch(err){
        req.flash('error',err.message);
        res.redirect('/login?mode=signup');
    }
   
})
module.exports.renderLoginForm=(req,res)=>{
    const mode = req.query.mode || 'login';
    res.render('users/login.ejs', { mode });
}
module.exports.login=async(req,res)=>{
    req.flash('success','You are logged in!');
    
    if (req.user && req.user.email && process.env.ADMIN_EMAIL && req.user.email.toLowerCase().trim() === process.env.ADMIN_EMAIL.toLowerCase().trim()) {
        return res.redirect('/admin');
    }
    
    let redirectUrl=res.locals.redirectUrl||'/listings'
    res.redirect(redirectUrl)
}
module.exports.logout=(req,res,next)=>{
     req.logOut((err)=>{
        if(err){
            return next(err);
        }
        req.flash('success','you are logged out!')
        res.redirect('/listings');
     })
};

module.exports.editEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            req.flash('error', 'Please provide a valid email address.');
            return res.redirect('/profile');
        }
        
        await User.findByIdAndUpdate(req.user._id, { email: email });
        req.flash('success', 'Email updated successfully!');
        res.redirect('/profile');
    } catch (e) {
        req.flash('error', 'Failed to update email.');
        res.redirect('/profile');
    }
};

module.exports.renderProfile = async (req, res) => {
    // Fetch user's listings and populate reviews
    const listings = await Listing.find({ owner: req.user._id }).populate({
        path: 'reviews',
        populate: { path: 'author' }
    });

    // Fetch user's bookings and populate listing with its owner
    const bookings = await Booking.find({ user: req.user._id })
        .populate({
            path: 'listing',
            populate: { path: 'owner' }
        })
        .sort({ createdAt: -1 });
    
    res.render('users/profile.ejs', { listings, bookings });
};

module.exports.getHostAnalytics = async (req, res) => {
    try {
        const listings = await Listing.find({ owner: req.user._id }).populate('reviews');
        
        if (!listings || listings.length === 0) {
            return res.json({ success: false, error: "You don't have any properties yet." });
        }

        let allReviews = [];
        listings.forEach(listing => {
            listing.reviews.forEach(review => {
                allReviews.push(`Property: ${listing.title} | Rating: ${review.rating}/5 | Comment: ${review.comment}`);
            });
        });

        if (allReviews.length === 0) {
            return res.json({ success: false, error: "No reviews to analyze yet." });
        }

        const prompt = `
        You are an expert hospitality business consultant. Analyze the following guest reviews for a host's properties.
        Provide actionable insights in a concise Markdown format. Use emojis.
        
        Structure your response exactly like this:
        ### ✨ Overall Strengths
        - ...
        ### 📉 Areas for Improvement
        - ...
        ### 💰 Pricing & Business Opportunities
        - ...

        Reviews:
        ${allReviews.join('\n')}
        `;

        const { generateText } = require('../utils/aiHelper');
        const textResponse = await generateText(prompt);

        // Convert simple markdown to HTML
        let htmlResponse = textResponse.replace(/```html|```/g, '').trim();
        htmlResponse = htmlResponse
            .replace(/### (.*)/g, '<h5 class="fw-bold mt-3 text-primary">$1</h5>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/- (.*)/g, '<li>$1</li>');
            
        htmlResponse = htmlResponse.replace(/(<li>.*<\/li>\n*)+/g, '<ul class="text-body-secondary mb-3">$&</ul>');

        res.json({ success: true, analytics: htmlResponse });
    } catch (err) {
        console.error("AI Host Analytics Error:", err);
        res.status(500).json({ success: false, error: "Failed to generate analytics." });
    }
};

module.exports.renderForgotPassword = (req, res) => {
    res.render('users/forgot_password.ejs');
};

module.exports.forgotPassword = async (req, res) => {
    try {
        const token = crypto.randomBytes(20).toString('hex');
        
        const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
        if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot-password');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                to: user.email,
                from: `"BookVilla Support" <${process.env.EMAIL_USER}>`,
                subject: 'BookVilla Password Reset',
                text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                      `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                      `http://${req.headers.host}/reset-password/${token}\n\n` +
                      `If you did not request this, please ignore this email and your password will remain unchanged.\n`
            };

            await transporter.sendMail(mailOptions);
            req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        } else {
            console.log(`Reset Token: ${token}`);
            req.flash('success', 'Email service not configured. Token logged in console.');
        }
        
        res.redirect('/forgot-password');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect('/forgot-password');
    }
};

module.exports.renderResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        res.render('users/reset_password.ejs', { token: req.params.token });
    } catch (err) {
        req.flash('error', 'Something went wrong.');
        res.redirect('/forgot-password');
    }
};

module.exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
        }

        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordRegex.test(req.body.password)) {
            req.flash('error', 'Password must be at least 8 characters long, including an uppercase letter, a lowercase letter, and a number.');
            return res.redirect('back');
        }

        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect('back');
        }

        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.login(user, (err) => {
            if (err) return next(err);
            req.flash('success', 'Success! Your password has been changed.');
            res.redirect('/listings');
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect('back');
    }
};