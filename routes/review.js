let express=require("express");
let router=express.Router({mergeParams:true});
const {listingSchema,reviewSchema}=require("../schema.js");
const ExpressError=require("../utils/ExpressError.js");
const Listing=require("../models/listing.js")
const wrapAsync=require("../utils/wrapAsync.js");
const Review=require("../models/review.js");
const {validateReview, isLoggedIn,isAuthor}=require("../middleware.js");
const reviewController=require("../controllers/review.js")

// Review Post Route to Add reviews

router.post("/",isLoggedIn,validateReview,wrapAsync(reviewController.createReview))

// Review Delete Route to Delete Reviews

router.delete("/:reviewId",isAuthor,wrapAsync(reviewController.deleteReview))

module.exports=router
