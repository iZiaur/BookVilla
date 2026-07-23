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

app.use('/',userRouter)

app.use('/admin', adminRouter)

app.get("/seed-india", async (req, res) => {
    try {
        const indianCities = [
            { city: "Mumbai", state: "Maharashtra" }, { city: "Delhi", state: "Delhi" },
            { city: "Bangalore", state: "Karnataka" }, { city: "Hyderabad", state: "Telangana" },
            { city: "Ahmedabad", state: "Gujarat" }, { city: "Chennai", state: "Tamil Nadu" },
            { city: "Kolkata", state: "West Bengal" }, { city: "Pune", state: "Maharashtra" },
            { city: "Jaipur", state: "Rajasthan" }, { city: "Lucknow", state: "Uttar Pradesh" },
            { city: "Kanpur", state: "Uttar Pradesh" }, { city: "Nagpur", state: "Maharashtra" },
            { city: "Indore", state: "Madhya Pradesh" }, { city: "Thane", state: "Maharashtra" },
            { city: "Bhopal", state: "Madhya Pradesh" }, { city: "Visakhapatnam", state: "Andhra Pradesh" },
            { city: "Pimpri-Chinchwad", state: "Maharashtra" }, { city: "Patna", state: "Bihar" },
            { city: "Vadodara", state: "Gujarat" }, { city: "Ghaziabad", state: "Uttar Pradesh" }
        ];
        
        const adjectives = ["Luxury", "Cozy", "Modern", "Classic", "Vintage", "Serene", "Spacious", "Minimalist", "Rustic", "Elegant"];
        const propertyTypes = ["Villa", "Apartment", "Penthouse", "Studio", "Bungalow", "Cottage", "Mansion", "Retreat", "Lodge", "Suite"];
        const categories = ["Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing pools"];
        const imageKeywords = ["hotel", "villa", "interior", "bedroom", "resort", "mansion", "pool", "apartment", "living room", "luxury house"];
        
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

        for (let i = 0; i < indianCities.length; i++) {
            const cityData = indianCities[i];
            
            for (let j = 0; j < 10; j++) {
                const guests = Math.floor(Math.random() * 12) + 1;
                const price = Math.floor(Math.random() * 9000) + 1000;
                
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
                const keyword = imageKeywords[Math.floor(Math.random() * imageKeywords.length)];
                const randomImageIndex = Math.floor(Math.random() * 1000); // To ensure different unsplash images
                
                const _id = new mongoose.Types.ObjectId();
                
                listingsToInsert.push({
                    _id: _id,
                    title: `${adj} ${propType} in ${cityData.city}`,
                    description: `Experience the best of ${cityData.city}, ${cityData.state} with our wonderful ${adj.toLowerCase()} ${propType.toLowerCase()}.`,
                    image: { 
                        url: `https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhvdGVsfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60`, // Using generic since unsplash random source is deprecated/unreliable for bulk
                        // We will update this in a moment to actually be different
                        filename: "listingimage" 
                    },
                    price: price.toString(), 
                    location: cityData.city, 
                    country: "India", 
                    address: `123 Main St, ${cityData.city}, ${cityData.state}, India`,
                    category: categories[Math.floor(Math.random() * categories.length)], 
                    maxGuests: guests, 
                    owner: user._id,
                    geometry: { type: "Point", coordinates: [77.2090, 28.6139] }
                });
                
                // Add unique images using Unsplash Source (reliable alternative for unique random images)
                listingsToInsert[listingsToInsert.length - 1].image.url = `https://source.unsplash.com/800x600/?${keyword},house,sig=${randomImageIndex}`;

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
        
        // Let's also give a unique image to any old properties that have the exact same unsplash URL
        const oldProperties = await Listing.find({ "image.url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhvdGVsfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" });
        for (let op of oldProperties) {
            const randomImageIndex = Math.floor(Math.random() * 1000);
            op.image.url = `https://source.unsplash.com/800x600/?mansion,resort,sig=${randomImageIndex}`;
            await op.save();
        }

        res.send(`Seeding complete! Successfully added 200 new properties (10 per city) with ${bookingsToInsert.length} random bookings. Please test on the homepage!`);
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
