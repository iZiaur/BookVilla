const mongoose = require("mongoose");
const { Schema } = mongoose;

const activitySchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    action: { 
        type: String, 
        required: true 
    },
    details: { 
        type: Schema.Types.Mixed 
    }
}, { timestamps: true });

module.exports = mongoose.model("Activity", activitySchema);
