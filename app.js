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
    const alllistings=await Listing.find({})
    res.render("listings/index.ejs",{alllistings})
}))

app.get("/listings/search",async(req,res)=>{
    let searchvar=req.query.search;
    let searchedlisting=await Listing.findOne({title:searchvar});
    
    if (searchedlisting){
        let foundid=searchedlisting._id;
        console.log(foundid);
        res.redirect(`/listings/${foundid}`);

    }else{
        req.flash("error","Listing not found")
        res.redirect('/listings')
    }
    
})
// Rendering the Basic Routes

app.use("/listings",listingRouter);

//Rendering  Routes for review Create and delete operations

app.use("/listings/:id/reviews",reviewRouter)

app.use('/',userRouter)

/

// Encountering error in page not found 

// app.all("*",(req,res,next)=>{
//     next (new ExpressError(404,"Page not found"));
   
   
// })


app.use((err,req,res,next)=>{
   let {statusCode=500,message="Default Error shown"}=err;
   res.status(statusCode).render("listings/error.ejs",{message})
})
