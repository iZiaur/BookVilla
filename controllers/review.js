const Listing=require("../models/listing");
const Review=require("../models/review")

module.exports.createReview=(async(req,res)=>{
    let listing=await Listing.findById(req.params.id);
    const newReview=new Review(req.body.review);
    newReview.author=req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success","Review Created!");
    res.redirect(`/listings/${listing._id}`);
})

module.exports.deleteReview=(async (req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","Review Deleted!");
    res.redirect(`/listings/${id}`);
})

module.exports.renderEditForm = (async (req, res) => {
    let { id, reviewId } = req.params;
    let listing = await Listing.findById(id);
    let review = await Review.findById(reviewId);
    if (!review) {
        req.flash("error", "Review you requested does not exist!");
        return res.redirect(`/listings/${id}`);
    }
    res.render("reviews/edit.ejs", { listing, review });
});

module.exports.updateReview = (async (req, res) => {
    let { id, reviewId } = req.params;
    await Review.findByIdAndUpdate(reviewId, req.body.review);
    req.flash("success", "Review Updated!");
    res.redirect(`/listings/${id}`);
});