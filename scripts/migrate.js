const mongoose = require('mongoose');
const Listing = require('../models/listing');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.ATLASDB_URL).then(async () => {
    const result = await Listing.updateMany(
        { maxGuests: { $exists: false } }, 
        { $set: { maxGuests: 6 } }
    );
    console.log('Migrated maxGuests:', result);
    process.exit(0);
}).catch(console.error);
