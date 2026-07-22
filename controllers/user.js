let User = require("../models/user.js");
let Listing = require("../models/listing.js");
let Booking = require("../models/booking.js");
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock_key' });

module.exports.renderSignUpForm=(req,res)=>{
    res.redirect('/login?mode=signup');
}
module.exports.signup=(async(req,res,next)=>{
    try{
        let{username,email,password,phone}=req.body;
        if (!email.endsWith('.com')) {
            req.flash('error', 'Email must end with .com');
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
}

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

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        // Convert simple markdown to HTML
        let htmlResponse = response.text
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