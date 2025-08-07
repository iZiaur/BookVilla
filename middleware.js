const Listing=require("./models/listing.js");
const Review=require("./models/review.js")
const ExpressError=require("./utils/ExpressError.js")
const{listingSchema,reviewSchema}=require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;  
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');
    }
    next();
};

// Passport refreshes the session once user is logged in, that's why we store it in locals
module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;  // 
    }
    next();  
};

module.exports.isOwner=async(req,res,next)=>{
    let {id}=req.params;
    let checkListing= await Listing.findById(id);
    if(!checkListing.owner._id.equals(res.locals.currUser._id)){
        req.flash('error','You are not the owner of the property');
        return  res.redirect(`/listings/${id}`);

    }
    next()

}


    module.exports.isAuthor=async(req,res,next)=>{
        let {id,reviewId}=req.params;

        let review= await Review.findById(reviewId);
         
        
        if(!review.author.equals(res.locals.currUser._id)){
            req.flash('error','You are not the author of the review');
            return  res.redirect(`/listings/${id}`);

        }
        next()

    }
module.exports.validatelisting=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    
    if(error){
        let errMsg=error.details.map(el=>(el).message).join(",")
        throw new ExpressError(404,errMsg);
    }else{
        next();
    }
}

module.exports.validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    
    if(error){
        let errMsg=error.details.map(el=>(el).message).join(",")
        throw new ExpressError(404,errMsg);
    }else{
        next();
    }
   
}