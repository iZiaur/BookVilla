const mongoose=require("mongoose");
const {Schema}=mongoose;
const passportLocalMongooose=require("passport-local-mongoose");

const userSchema=new Schema({
    email:{
        type:String,
        required:true

    }
})
userSchema.plugin(passportLocalMongooose);

module.exports=new mongoose.model('User',userSchema);