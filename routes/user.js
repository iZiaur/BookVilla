let express=require("express");
let router=express.Router({mergeParams:true});
let User=require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
let passport=require('passport');
const { saveRedirectUrl } = require("../middleware.js");
const userController=require("../controllers/user.js")



router.route("/signup").get(userController.renderSignUpForm).post(wrapAsync(userController.signup))


router.route("/login").get(userController.renderLoginForm).post(saveRedirectUrl,passport.authenticate("local",{
    failureRedirect:'/login',
    failureFlash:true
}),userController.login)


router.get('/logout',userController.logout)


























module.exports=router