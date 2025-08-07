let User=require("../models/user.js");
module.exports.renderSignUpForm=(req,res)=>{
    res.render("users/signup.ejs");
}
module.exports.signup=(async(req,res,next)=>{
    try{
        let{username,email,password}=req.body;
         let newUser=new User({email,username});
        let registeredUser=await User.register(newUser,password);
        req.login(registeredUser,(err)=>{
            if(err){
                return next(err);
            }
            req.flash('success','Welcome to BookVilla!')
            res.redirect("/listings");
        })
        console.log(registeredUser);
        
    }
    catch(err){
        req.flash('error',err.message);
        res.redirect('/listings');
    }
   
})
module.exports.renderLoginForm=(req,res)=>{
    res.render('users/login.ejs')
}
module.exports.login=async(req,res)=>{
    req.flash('success','You are logged in!');
    redirectUrl=res.locals.redirectUrl||'/listings'
    res.redirect(redirectUrl)
}
module.exports.logout=(req,res,next)=>{
     req.logOut((err)=>{
        if(err){
            return next(err);
        }
        req.flash('success','you are logged out!')
        res.redirect('/listings');
     })
}