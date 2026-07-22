const Listing=require("../models/listing.js");
const Booking = require("../models/booking.js");
require('dotenv').config()
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN || 'placeholder_token_to_prevent_crash_on_boot';
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock_key' });

module.exports.index=(async(req,res)=>{
    let filter = {};
    if (req.query.category) {
        filter.category = req.query.category;
    }
    const alllistings=await Listing.find(filter).sort({ _id: -1 }).lean();
    res.render("listings/index.ejs",{alllistings})
})

module.exports.aiVibeSearch = async (req, res) => {
    const { vibeQuery } = req.body;
    if (!vibeQuery) return res.redirect('/listings');
    if (!process.env.GEMINI_API_KEY) {
        req.flash('error', 'Gemini API Key is missing. AI Search is currently disabled.');
        return res.redirect('/listings');
    }

    try {
        const allListings = await Listing.find().select('_id title description category location').lean();
        
        const prompt = `
        You are an expert travel agent. The user is asking for: "${vibeQuery}"
        Here is a list of all available properties in JSON format:
        ${JSON.stringify(allListings)}
        
        Analyze the vibe and semantic meaning of the user's request. Find the top 3 properties that best match the vibe.
        Respond ONLY with a valid JSON array containing the exact _id strings of the best matching properties, like this: ["id1", "id2", "id3"]. Do not include markdown formatting or any other text.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        let textResponse = response.text;
        textResponse = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const matchedIds = JSON.parse(textResponse);

        const matchedListings = await Listing.find({ _id: { $in: matchedIds } }).lean();
        req.flash('success', `Found ${matchedListings.length} matching properties for your vibe!`);
        res.render("listings/index.ejs", { alllistings: matchedListings });

    } catch (err) {
        console.error("AI Vibe Search Error:", err);
        req.flash('error', `AI Error: ${err.message || 'Please try standard search.'}`);
        res.redirect('/listings');
    }
};

module.exports.renderNewForm=(req,res)=>{
    
      
    res.render("listings/new.ejs")
}

module.exports.showListing=(async(req,res)=>{
    let {id}=req.params;
    let listing= await Listing.findById(id).populate({path:"reviews",
    populate:{path:"author"},
    }).populate("owner").lean();
    
    if(!listing){
        req.flash("error","Listing you request does not exist!");
        return res.redirect("/listings")
    }

    // Fetch all active bookings for this listing to disable dates on the calendar
    let activeBookings = await Booking.find({ 
        listing: id, 
        status: { $in: ["Pending", "Confirmed"] } 
    }).select("checkIn checkOut");

    // Format dates for Flatpickr
    let bookedDates = activeBookings.map(b => {
        return {
            from: b.checkIn.toISOString().split('T')[0],
            to: b.checkOut.toISOString().split('T')[0]
        };
    });

    // Calculate host average rating
    const ownerListings = await Listing.find({ owner: listing.owner._id }).populate('reviews');
    let totalRating = 0;
    let totalReviews = 0;
    for (let l of ownerListings) {
        if (l.reviews) {
            for (let r of l.reviews) {
                totalRating += r.rating;
                totalReviews++;
            }
        }
    }
    const hostAverageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 'New';

    res.render("listings/show.ejs",{listing, bookedDates, hostAverageRating, totalHostReviews: totalReviews});
})

module.exports.generateAISummary = async (req, res) => {
    const { id } = req.params;
    
    if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Gemini API Key is missing.' });
    }

    try {
        let listing = await Listing.findById(id).populate("reviews");
        if (!listing || !listing.reviews || listing.reviews.length === 0) {
            return res.status(400).json({ error: 'Not enough reviews to summarize.' });
        }

        const reviewsText = listing.reviews.map(r => r.comment).join(" | ");

        const prompt = `
        You are a brutally honest AI travel assistant. Read the following reviews for a rental property:
        "${reviewsText}"
        
        Analyze the reviews to find the most common patterns.
        Extract a maximum of 3 of the most repeated positive points into an array called "theGood".
        Extract a maximum of 3 of the most repeated negative points, complaints, or red flags into an array called "redFlags".
        Keep each point extremely concise (max 5-7 words).
        
        Respond ONLY with a valid JSON object in this exact format, with no markdown code blocks:
        {
          "theGood": ["Great location", "Clean", "Friendly host"],
          "redFlags": ["Noisy at night", "Slow wifi"]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        let textResponse = response.text;
        textResponse = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const summary = JSON.parse(textResponse);

        res.json({ success: true, summary });
    } catch (err) {
        console.error("AI Summary Error:", err);
        res.status(500).json({ error: `AI Error: ${err.message || 'Failed to generate AI summary.'}` });
    }
};

module.exports.createListing=(async(req,res,next)=>{
          let coordinates= await geocodingClient.forwardGeocode({
            query:req.body.listing.location,
            limit: 1
            })
            .send()
        let url=req.file.path;
        let fileName=req.file.filename
        const newListing=new Listing(req.body.listing);
            newListing.owner=req.user._id;
            newListing.geometry=coordinates.body.features[0].geometry
            newListing.image={url,fileName}
            let savedListing=await newListing.save();
            console.log(savedListing);
            req.flash("success","New Listing Created!");
            res.redirect("/listings" );
})

module.exports.editListing=(async (req,res)=>{
    
    let {id}=req.params;
    let listing= await Listing.findById(id);
     if(!listing){
        req.flash("error","Listing you request does not exist!");
        return res.redirect("/listings")
    }
    let OrignalImageUrl=listing.image.url;
    OrignalImageUrl=OrignalImageUrl.replace("/upload","/upload/w_250")
     req.flash("success","Listing Edited!");
    res.render("listings/edit.ejs",{listing,OrignalImageUrl})
})

module.exports.updateListing=(async (req,res)=>{
    if(!req.body.listing){
        throw new ExpressError(400,"Send Valid Listing request")
    }
    let {id}=req.params;
    let checkListing= await Listing.findById(id);
    if(!checkListing.owner._id.equals(res.locals.currUser._id)){
        req.flash('error','You dont have permission to edit');
        return  res.redirect(`/listings/${id}`);

    }
   
    let updatelistingn=await Listing.findByIdAndUpdate(id,{...req.body.listing})
    if(typeof req.file!=="undefined"){
         let url=req.file.path;
        let fileName=req.file.filename
        updatelistingn.image={url,fileName}
        await updatelistingn.save();
    }
     req.flash("success","Listing Updated!");
    res.redirect(`/listings/${id}`);

})

module.exports.deleteListing=(async (req,res)=>{
    let {id}=req.params;
    let deletedlisting=await Listing.findByIdAndDelete(id);
    console.log(deletedlisting);
     req.flash("success","Listing Deleted!");
    res.redirect("/listings")

 })

module.exports.aiEstimatePrice = async (req, res) => {
    try {
        const { location, category, description } = req.body;
        if (!location) return res.status(400).json({ error: "Location is required" });

        const prompt = `
        You are an expert real estate valuer and Airbnb pricing algorithm. 
        Given the following property details, suggest a competitive, realistic nightly price in USD.
        Location: ${location}
        Category: ${category || 'General'}
        Description: ${description || 'N/A'}
        
        Respond ONLY with a single integer number representing the price. Do not include currency symbols or any other text.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        const suggestedPrice = parseInt(response.text.replace(/[^0-9]/g, ''));
        res.json({ success: true, price: suggestedPrice || 150 });
    } catch (err) {
        console.error("AI Price Error:", err);
        res.status(500).json({ error: "Failed to estimate price" });
    }
};

module.exports.aiAnalyzeImage = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: "Image data is required" });

        const prompt = `
        You are a professional real estate copywriter. Look at this image of a property.
        Write a short, engaging description (max 3 sentences) highlighting its best visual features and amenities.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: "image/jpeg"
                    }
                }
            ]
        });

        res.json({ success: true, description: response.text.trim() });
    } catch (err) {
        console.error("AI Image Error:", err);
        res.status(500).json({ error: "Failed to analyze image" });
    }
};

module.exports.generateAIItinerary = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) return res.status(404).json({ error: "Listing not found" });

        const prompt = `
        You are an expert local tour guide. Create a fun, adventurous 2-day travel itinerary for a guest staying in: ${listing.location}, ${listing.country}.
        
        Format it nicely with Markdown. Keep it relatively concise but engaging. Use emojis.
        Structure:
        ### Day 1
        - Morning: ...
        - Afternoon: ...
        - Evening: ...
        
        ### Day 2
        - Morning: ...
        - Afternoon: ...
        - Evening: ...
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        let htmlResponse = response.text
            .replace(/### (.*)/g, '<h5 class="fw-bold mt-4 text-primary"><i class="fa-solid fa-map-location-dot me-2"></i>$1</h5>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/- (.*)/g, '<li>$1</li>');
            
        htmlResponse = htmlResponse.replace(/(<li>.*<\/li>\n*)+/g, '<ul class="text-body-secondary mb-3">$&</ul>');

        res.json({ success: true, itinerary: htmlResponse });
    } catch (err) {
        console.error("AI Itinerary Error:", err);
        res.status(500).json({ error: "Failed to generate itinerary" });
    }
};
