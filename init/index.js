const mongoose=require("mongoose");
const initData=require('./data.js');
const Listing=require("../models/listing.js");

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');

}
main().then((res)=>{
    console.log("Database connected")
}).catch(err => console.log(err));


const initDB= async ()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj)=>({...obj,owner:'688cef039b43ffa1efd5e87b'}))
    await Listing.insertMany(initData.data);
    console.log("data was initialised")
}
initDB();