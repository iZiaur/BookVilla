require('dotenv').config();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const User = require("./models/user.js");

const dbUrl = process.env.ATLASDB_URL;

mongoose.connect(dbUrl)
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(err => console.log("DB Connection Error:", err));

const images = [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1de24220e8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542314831-c6a4d14272de?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80"
];

const locations = [
    { loc: "New York", country: "USA", coords: [-74.006, 40.7128] },
    { loc: "London", country: "UK", coords: [-0.1276, 51.5074] },
    { loc: "Paris", country: "France", coords: [2.3522, 48.8566] },
    { loc: "Tokyo", country: "Japan", coords: [139.6917, 35.6895] },
    { loc: "Sydney", country: "Australia", coords: [151.2093, -33.8688] },
    { loc: "Rome", country: "Italy", coords: [12.4964, 41.9028] },
    { loc: "Los Angeles", country: "USA", coords: [-118.2437, 34.0522] },
    { loc: "Cape Town", country: "South Africa", coords: [18.4232, -33.9249] },
    { loc: "Rio de Janeiro", country: "Brazil", coords: [-43.1729, -22.9068] },
    { loc: "Bali", country: "Indonesia", coords: [115.1889, -8.4095] },
    { loc: "Barcelona", country: "Spain", coords: [2.1686, 41.3874] },
    { loc: "Dubai", country: "UAE", coords: [55.2708, 25.2048] },
    { loc: "Toronto", country: "Canada", coords: [-79.3832, 43.6532] }
];

const titles = [
    "Luxury Villa with Private Pool", "Cozy Mountain Cabin", "Modern City Apartment", 
    "Beachfront Paradise", "Rustic Farmhouse Retreat", "Historic Castle Estate",
    "Stunning Penthouse Suite", "Secluded Forest Lodge", "Eco-Friendly Tiny Home",
    "Spacious Family Townhouse", "Romantic Lakeside Cottage", "Architectural Masterpiece"
];

const adjectives = ["Beautiful", "Stunning", "Peaceful", "Luxurious", "Breathtaking", "Charming", "Spectacular", "Quiet"];

const seedDB = async () => {
    console.log("Starting DB Seed...");
    
    // Find an owner (first user in DB)
    const user = await User.findOne({});
    if (!user) {
        console.log("No users found. Please create a user first!");
        process.exit(1);
    }
    
    console.log(`Using owner: ${user.username}`);

    let generatedListings = [];

    for (let i = 0; i < 100; i++) {
        const randomLoc = locations[Math.floor(Math.random() * locations.length)];
        const randomImg = images[Math.floor(Math.random() * images.length)];
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        
        const price = Math.floor(Math.random() * 15000) + 1500; // Between 1500 and 16500 INR

        const newListing = new Listing({
            title: `${randomAdj} ${randomTitle}`,
            description: `Experience the best of ${randomLoc.loc} in this amazing property. Perfect for vacations, getaways, and making memories. Fully equipped with modern amenities and designed for your ultimate comfort.`,
            image: {
                url: randomImg,
                filename: `seed_img_${i}`
            },
            price: price.toString(),
            location: randomLoc.loc,
            country: randomLoc.country,
            owner: user._id,
            geometry: {
                type: 'Point',
                coordinates: randomLoc.coords
            }
        });
        generatedListings.push(newListing);
    }

    try {
        await Listing.insertMany(generatedListings);
        console.log("Successfully seeded 100 new listings!");
    } catch (e) {
        console.log("Error seeding:", e);
    }
    
    mongoose.connection.close();
};

seedDB();
