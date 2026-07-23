const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Booking = require("../models/booking.js");
require("dotenv").config({ path: "../.env" });

const dbUrl = process.env.ATLASDB_URL || 'mongodb+srv://ziaurrahmang004:ziaur@cluster0.p783y.mongodb.net/wanderlust?retryWrites=true&w=majority&appName=Cluster0';

const indianCities = [
    { city: "Mumbai", state: "Maharashtra" },
    { city: "Delhi", state: "Delhi" },
    { city: "Bangalore", state: "Karnataka" },
    { city: "Hyderabad", state: "Telangana" },
    { city: "Ahmedabad", state: "Gujarat" },
    { city: "Chennai", state: "Tamil Nadu" },
    { city: "Kolkata", state: "West Bengal" },
    { city: "Pune", state: "Maharashtra" },
    { city: "Jaipur", state: "Rajasthan" },
    { city: "Lucknow", state: "Uttar Pradesh" },
    { city: "Kanpur", state: "Uttar Pradesh" },
    { city: "Nagpur", state: "Maharashtra" },
    { city: "Indore", state: "Madhya Pradesh" },
    { city: "Thane", state: "Maharashtra" },
    { city: "Bhopal", state: "Madhya Pradesh" },
    { city: "Visakhapatnam", state: "Andhra Pradesh" },
    { city: "Pimpri-Chinchwad", state: "Maharashtra" },
    { city: "Patna", state: "Bihar" },
    { city: "Vadodara", state: "Gujarat" },
    { city: "Ghaziabad", state: "Uttar Pradesh" }
];

const categories = ["Trending", "Rooms", "Iconic cities", "Mountains", "Castles", "Amazing pools"];

async function main() {
    await mongoose.connect(dbUrl);
    console.log("Connected to DB");

    // Get a default owner (just grab the first user)
    const user = await User.findOne({});
    if (!user) {
        console.log("No user found, please register a user first to be the owner.");
        process.exit(1);
    }

    console.log("Seeding listings...");

    for (let i = 0; i < indianCities.length; i++) {
        const cityData = indianCities[i];
        
        // Random max guests between 1 and 12
        const guests = Math.floor(Math.random() * 12) + 1;
        const price = Math.floor(Math.random() * 5000) + 1000;
        
        const listing = new Listing({
            title: `Beautiful Stay in ${cityData.city}`,
            description: `Experience the best of ${cityData.city}, ${cityData.state} with our wonderful accommodation.`,
            image: {
                url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGhvdGVsfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
                filename: "listingimage"
            },
            price: price.toString(),
            location: cityData.city,
            country: "India",
            address: `123 Main St, ${cityData.city}, ${cityData.state}, India`,
            category: categories[Math.floor(Math.random() * categories.length)],
            maxGuests: guests,
            owner: user._id,
            geometry: {
                type: "Point",
                // Just dummy coordinates for now
                coordinates: [77.2090, 28.6139] 
            }
        });
        
        await listing.save();
        console.log(`Added ${cityData.city} (Max Guests: ${guests})`);
        
        // Let's create a dummy booking for the first 5 cities so date filtering can be tested
        if (i < 5) {
            // Booked from tomorrow to 5 days from now
            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + 1);
            
            const checkOut = new Date();
            checkOut.setDate(checkOut.getDate() + 5);
            
            const booking = new Booking({
                user: user._id,
                listing: listing._id,
                checkIn: checkIn,
                checkOut: checkOut,
                guestName: "Test Guest",
                guestEmail: "test@example.com",
                numberOfGuests: 2,
                totalPrice: price * 4,
                consentGiven: true,
                status: "Confirmed"
            });
            await booking.save();
            console.log(`-> Added mock Confirmed booking for ${cityData.city} from ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]}`);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
