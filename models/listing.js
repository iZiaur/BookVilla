const mongoose=require("mongoose");
const {Schema}=mongoose;
const Review = require("./review.js"); 
const listingSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    description:String,
    image:{
        url:String,
        filename:String,

    },
    price:String,
    location:String,
    country:String,
    reviews: [
        { type: Schema.Types.ObjectId, ref: 'Review' }
    ],

    owner:{
        type:Schema.Types.ObjectId,
        ref:'User',

    },
    geometry: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }

})
listingSchema.post("findOneAndDelete",async(deletedlisting)=>{
    if (deletedlisting){
        await Review.deleteMany({_id:{$in:deletedlisting.reviews}})
    }
    
    
})

const Listing=mongoose.model("Listing",listingSchema)

module.exports=Listing;