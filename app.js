let express=require("express");
let app=express();
const mongoose=require("mongoose");
const path=require("path");
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const methodOverride = require('method-override');
app.use(methodOverride('_method'))
const Listing=require("./models/listing.js")
const ejsMate = require('ejs-mate');
app.engine('ejs', ejsMate);
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {listingSchema,reviewSchema}=require("./schema.js");
const Review=require("./models/review.js");
const passport=require('passport');
const LocalStrategy=require('passport-local');
const User=require('./models/user.js');





const listingRouter=require("./routes/listing.js")
const reviewRouter=require("./routes/review.js")
const userRouter=require('./routes/user.js');
const adminRouter=require('./routes/admin.js');
const bookingRouter=require('./routes/booking.js');
var session = require('express-session');
var flash = require('connect-flash');
const MongoStore = require('connect-mongo');
require('dotenv').config()
//url

const mongo='mongodb://127.0.0.1:27017/wanderlust'

const dbUrl=process.env.ATLASDB_URL;

// console.log(process.env.CLOUD_NAME)
// console.log(process.env.CLOUD_API)
// console.log(process.env.CLOUD_API_SECRET)

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
})
store.on("error",()=>{
    console.log("error in mongo session store",err)
})
const sessionoption = {
    store,
    secret: process.env.SECRET,           
    resave: false,                   
    saveUninitialized: true,        
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 3,  
        maxAge: 1000 * 60 * 60 * 24 * 3,                 
        httpOnly: true               
    }
};

app.use(session(sessionoption));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
    res.locals.success=req.flash('success');
    res.locals.error=req.flash('error');
    res.locals.currUser=req.user;
    res.locals.searchQuery = req.query || {};
    next()
})




async function main() {
  await mongoose.connect(dbUrl);

}
main().then((res)=>{
    console.log("Database connected")
}).catch(err => console.log(err));

app.listen(8080,(req,res)=>{
    console.log("server is listening to port 8080")
})
// app.get('/')
app.get("/",(async(req,res)=>{
    let filter = {};
    if (req.query.category) {
        filter.category = req.query.category;
    }
    const alllistings=await Listing.find(filter).sort({ _id: -1 }).lean()
    res.render("listings/index.ejs",{alllistings})
}))


// Rendering the Basic Routes

app.use("/listings",listingRouter);

//Rendering  Routes for review Create and delete operations

app.use("/listings/:id/reviews",reviewRouter)
app.use("/listings/:id/book", bookingRouter);
app.use("/", userRouter);

app.get("/test-ai", async (req, res) => {
    try {
        const { GoogleGenAI } = require('@google/genai');
        const Groq = require("groq-sdk");
        const OpenAI = require("openai");
        
        let geminiResult = "Not tested";
        let groqResult = "Not tested";
        let openaiResult = "Not tested";
        let geminiStatus = "pending";
        let groqStatus = "pending";
        let openaiStatus = "pending";
        
        // Test Gemini
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: "Say 'Hello from Gemini!'",
            });
            geminiResult = response.text;
            geminiStatus = "SUCCESS";
        } catch (e) {
            geminiResult = e.message;
            geminiStatus = "FAILED";
        }
        
        // Test Groq
        try {
            if (!process.env.GROQ_API_KEY) {
                throw new Error("GROQ_API_KEY is not set in environment variables");
            }
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const groqResponse = await groq.chat.completions.create({
                messages: [{ role: "user", content: "Say 'Hello from Groq!'" }],
                model: "llama-3.3-70b-versatile",
            });
            groqResult = groqResponse.choices[0]?.message?.content;
            groqStatus = "SUCCESS";
        } catch (e) {
            groqResult = e.message;
            groqStatus = "FAILED";
        }

        // Test OpenRouter (Free)
        try {
            if (!process.env.OPENROUTER_API_KEY) {
                throw new Error("OPENROUTER_API_KEY is not set in environment variables");
            }
            const openrouter = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" });
            const orResponse = await openrouter.chat.completions.create({
                messages: [{ role: "user", content: "Say 'Hello from OpenRouter!'" }],
                model: "meta-llama/llama-3-8b-instruct:free",
            });
            openaiResult = orResponse.choices[0]?.message?.content;
            openaiStatus = "SUCCESS";
        } catch (e) {
            openaiResult = e.message;
            openaiStatus = "FAILED";
        }
        
        res.send(`
            <h1>AI API Diagnostic Test</h1>
            <div style="padding: 20px; border: 2px solid ${geminiStatus === 'SUCCESS' ? 'green' : 'red'}; margin-bottom: 20px;">
                <h2>1. Gemini Status: ${geminiStatus}</h2>
                <p><strong>Response:</strong> ${geminiResult}</p>
            </div>
            <div style="padding: 20px; border: 2px solid ${groqStatus === 'SUCCESS' ? 'green' : 'red'}; margin-bottom: 20px;">
                <h2>2. Groq Status (Fallback): ${groqStatus}</h2>
                <p><strong>Response:</strong> ${groqResult}</p>
            </div>
            <div style="padding: 20px; border: 2px solid ${openaiStatus === 'SUCCESS' ? 'green' : 'red'};">
                <h2>3. OpenRouter Status (Free Tertiary Fallback): ${openaiStatus}</h2>
                <p><strong>Response:</strong> ${openaiResult}</p>
            </div>
        `);
    } catch (e) {
        res.send("Critical test failure: " + e.message);
    }
});

app.use('/admin', adminRouter)

app.get("/seed-india", async (req, res) => {
    try {
        const indianCities = [
            { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
            { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
            { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
            { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
            { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
            { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
            { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
            { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
            { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
            { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
            { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
            { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
            { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
            { city: "Thane", state: "Maharashtra", lat: 19.1974, lng: 72.9781 },
            { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
            { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
            { city: "Pimpri-Chinchwad", state: "Maharashtra", lat: 18.6298, lng: 73.7997 },
            { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
            { city: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812 },
            { city: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538 }
        ];
        
        const adjectives = ["Luxury", "Cozy", "Modern", "Classic", "Vintage", "Serene", "Spacious", "Minimalist", "Rustic", "Elegant"];
        const propertyTypes = ["Villa", "Apartment", "Penthouse", "Studio", "Bungalow", "Cottage", "Mansion", "Retreat", "Lodge", "Suite"];
        const categories = ["Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing pools"];
        
        // Array of 25 distinct, high-quality Unsplash images for properties
        const curatedImages = [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1510798831971-661eb04b3739?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1502672260266-1c1c24226133?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1598928506311-c55dd189a647?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600585152220-90363fe7e115?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1542853647-49adabe2262a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60"
        ];
        
        const Booking = require("./models/booking.js");
        const user = await User.findOne({});
        if (!user) return res.send("No user found to assign as owner.");

        // Clean up previously seeded dummy data (where address includes '123 Main St')
        const previousListings = await Listing.find({ address: /123 Main St/ });
        const previousListingIds = previousListings.map(l => l._id);
        await Booking.deleteMany({ listing: { $in: previousListingIds } });
        await Listing.deleteMany({ _id: { $in: previousListingIds } });

        const listingsToInsert = [];
        const bookingsToInsert = [];
        let imageCounter = 0;

        for (let i = 0; i < indianCities.length; i++) {
            const cityData = indianCities[i];
            
            for (let j = 0; j < 10; j++) {
                const guests = Math.floor(Math.random() * 12) + 1;
                const price = Math.floor(Math.random() * 9000) + 1000;
                
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
                
                const _id = new mongoose.Types.ObjectId();
                
                // Cycle through the curated images so we don't get the same image over and over
                const imgUrl = curatedImages[imageCounter % curatedImages.length];
                imageCounter++;
                
                listingsToInsert.push({
                    _id: _id,
                    title: `${adj} ${propType} in ${cityData.city}`,
                    description: `Experience the best of ${cityData.city}, ${cityData.state} with our wonderful ${adj.toLowerCase()} ${propType.toLowerCase()}.`,
                    image: { 
                        url: imgUrl,
                        filename: "listingimage" 
                    },
                    price: price.toString(), 
                    location: cityData.city, 
                    country: "India", 
                    address: `123 Main St, ${cityData.city}, ${cityData.state}, India`,
                    category: categories[Math.floor(Math.random() * categories.length)], 
                    maxGuests: guests, 
                    owner: user._id,
                    // Mapbox uses [longitude, latitude]. Add a tiny random offset (-0.02 to +0.02) so markers don't stack exactly on top of each other.
                    geometry: { 
                        type: "Point", 
                        coordinates: [
                            cityData.lng + (Math.random() * 0.04 - 0.02),
                            cityData.lat + (Math.random() * 0.04 - 0.02)
                        ] 
                    }
                });

                // 50% chance to have an upcoming booking (to test date availability)
                if (Math.random() > 0.5) {
                    const daysFromNow = Math.floor(Math.random() * 10);
                    const duration = Math.floor(Math.random() * 5) + 1;
                    
                    const checkIn = new Date(); 
                    checkIn.setDate(checkIn.getDate() + daysFromNow);
                    
                    const checkOut = new Date(); 
                    checkOut.setDate(checkOut.getDate() + daysFromNow + duration);
                    
                    bookingsToInsert.push({
                        user: user._id, 
                        listing: _id, 
                        checkIn: checkIn, 
                        checkOut: checkOut,
                        guestName: "Test Guest", 
                        guestEmail: "test@example.com", 
                        numberOfGuests: Math.min(2, guests),
                        totalPrice: price * duration, 
                        consentGiven: true, 
                        status: "Confirmed"
                    });
                }
            }
        }
        
        await Listing.insertMany(listingsToInsert);
        if (bookingsToInsert.length > 0) {
            await Booking.insertMany(bookingsToInsert);
        }

        res.send(`Seeding complete! Successfully added 200 new properties (10 per city) with ${bookingsToInsert.length} random bookings. All properties now have distinct curated images.`);
    } catch (err) {
        console.error(err);
        res.send("Error seeding data: " + err.message);
    }
});

// Encountering error in page not found 

// app.all("*",(req,res,next)=>{
//     next (new ExpressError(404,"Page not found"));
   
   
// })


app.use((err,req,res,next)=>{
   let {statusCode=500,message="Default Error shown"}=err;
   res.status(statusCode).render("listings/error.ejs",{message})
})
