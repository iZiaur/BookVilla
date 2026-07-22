let express=require("express");
let router=express.Router({mergeParams:true});
let User=require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
let passport=require('passport');
const { saveRedirectUrl, isLoggedIn } = require("../routeMiddleware.js");
const userController=require("../controllers/user.js")

router.get("/profile", isLoggedIn, wrapAsync(userController.renderProfile));
router.post("/profile/edit-email", isLoggedIn, wrapAsync(userController.editEmail));
router.get("/profile/host-analytics", isLoggedIn, wrapAsync(userController.getHostAnalytics));

router.route("/signup").get(userController.renderSignUpForm).post(wrapAsync(userController.signup))


const checkEmailOrUsername = async (req, res, next) => {
    const { username } = req.body;
    if (username && username.includes('@')) {
        const user = await User.findOne({ email: username.toLowerCase().trim() });
        if (user) {
            req.body.username = user.username;
        }
    }
    next();
};

router.route("/login").get(userController.renderLoginForm).post(saveRedirectUrl, checkEmailOrUsername, passport.authenticate("local",{
    failureRedirect:'/login',
    failureFlash:true
}),userController.login)


router.get('/logout',userController.logout)


























module.exports=router