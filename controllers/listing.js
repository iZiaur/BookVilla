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

module.exports.autocomplete = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) return res.json({ suggestions: [] });
        
        // Search by location, country, or title
        const regex = new RegExp(query, 'i');
        const listings = await Listing.find({
            $or: [
                { location: regex },
                { country: regex },
                { title: regex }
            ]
        }).select('location country title').limit(5).lean();

        // Extract unique locations to suggest
        const suggestions = new Set();
        listings.forEach(listing => {
            if (listing.location.toLowerCase().includes(query.toLowerCase()) || 
                listing.country.toLowerCase().includes(query.toLowerCase())) {
                suggestions.add(`${listing.location}, ${listing.country}`);
            } else {
                suggestions.add(listing.title);
            }
        });

        res.json({ suggestions: Array.from(suggestions) });
    } catch (err) {
        console.error("Autocomplete error:", err);
        res.status(500).json({ suggestions: [] });
    }
};

module.exports.advancedSearch = async (req, res) => {
    try {
        const { search, checkIn, checkOut, guests } = req.query;
        let filter = {};

        // 1. Location matching
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { location: regex },
                { country: regex },
                { title: regex }
            ];
        }

        // 2. Guests matching
        if (guests) {
            filter.maxGuests = { $gte: parseInt(guests) };
        }

        // 3. Date availability checking
        if (checkIn && checkOut) {
            const inDate = new Date(checkIn);
            const outDate = new Date(checkOut);
            
            // Find all bookings that overlap with requested dates
            const overlappingBookings = await Booking.find({
                status: "Confirmed",
                $or: [
                    { checkIn: { $lt: outDate }, checkOut: { $gt: inDate } }
                ]
            }).select('listing');

            const bookedListingIds = overlappingBookings.map(b => b.listing);
            
            // Exclude booked listings
            filter._id = { $nin: bookedListingIds };
        }

        const alllistings = await Listing.find(filter).sort({ _id: -1 }).lean();
        
        if (alllistings.length === 0) {
            req.flash('error', 'No properties found matching your criteria.');
        } else {
            req.flash('success', `Found ${alllistings.length} propert${alllistings.length === 1 ? 'y' : 'ies'}!`);
        }
        
        res.render("listings/index.ejs", { alllistings });
    } catch (err) {
        console.error("Advanced Search Error:", err);
        req.flash('error', 'Something went wrong while searching.');
        res.redirect('/listings');
    }
};

module.exports.aiVibeChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.json({ response: "Please tell me what you're looking for!" });
        
        if (!process.env.GEMINI_API_KEY) {
            return res.json({ response: "AI features are currently unavailable (missing API key)." });
        }

        const allListings = await Listing.find().select('_id title description category location price').lean();
        
        const prompt = `
        You are VibeAI, a helpful and friendly travel assistant for BookVilla. 
        A user just said: "${message}"
        
        Here is the JSON list of available properties:
        ${JSON.stringify(allListings)}
        
        Your task is to respond naturally to the user, acting as a chatbot. If they ask for recommendations, analyze their vibe and suggest 1 to 3 properties from the list above. 
        When you suggest a property, you MUST include a clickable HTML link to the property using the format: <a href="/listings/PROPERTY_ID"><strong>Property Title</strong></a>
        Format your response in simple HTML (using <p>, <br>, <ul>, <li>, <strong>) so it renders nicely in a chat window. Do NOT use markdown. Keep your response concise, friendly, and under 150 words.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });

        let textResponse = response.text.replace(/```html|```/g, '').trim();
        res.json({ response: textResponse });

    } catch (err) {
        console.error("AI Vibe Chat Error:", err);
        res.json({ response: "Oops, I'm having trouble thinking right now. Please try searching manually!" });
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
        Given the following property details, suggest a competitive, realistic nightly price in Indian Rupees (INR).
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
