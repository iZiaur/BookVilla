const Listing=require("../models/listing.js");
require('dotenv').config()
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken=process.env.MAP_TOKEN;
console.log(mapToken);
const geocodingClient = mbxGeocoding({ accessToken: mapToken});

module.exports.index=(async(req,res)=>{
    const alllistings=await Listing.find({})
    res.render("listings/index.ejs",{alllistings})
})

module.exports.renderNewForm=(req,res)=>{
    
      
    res.render("listings/new.ejs")
}

module.exports.showListing=(async(req,res)=>{
    let {id}=req.params;
    let listing= await Listing.findById(id).populate({path:"reviews",
    populate:{path:"author"},
    }).populate("owner");
    console.log(listing);
    
    if(!listing){
        req.flash("error","Listing you request does not exist!");
        return res.redirect("/listings")
    }
    console.log(listing);
    res.render("listings/show.ejs",{listing});
})

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

