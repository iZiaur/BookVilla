const Joi = require('joi');
let Review=require("./models/review.js")

module.exports.listingSchema=Joi.object({
    listing:Joi.object({
        title:Joi.string().required(),
        description:Joi.string().required(),
        location:Joi.string().required(),
        country:Joi.string().required(),
        price:Joi.number().required().min(0),
        image:Joi.string().allow("",null),
        category:Joi.string().valid("Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing pools", "Camping", "Farms", "Artic", "Domes", "Boats").required(),
        houseRules: Joi.string().allow("", null),
        cancellationPolicy: Joi.string().allow("", null),
        maxGuests: Joi.number().min(1)
    }).required(),
})


module.exports.reviewSchema=Joi.object({
    review:Joi.object({
        rating:Joi.number().required().min(1).max(5),
        comment:Joi.string().required()
    }).required()
})

module.exports.bookingSchema = Joi.object({
    booking: Joi.object({
        checkIn: Joi.date().iso().required(),
        checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
        guestName: Joi.string().required(),
        guestEmail: Joi.string().email().required(),
        numberOfGuests: Joi.number().min(1).required(),
        consentGiven: Joi.string().valid('on').required()
    }).required()
});