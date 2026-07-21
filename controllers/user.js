let User=require("../models/user.js");
module.exports.renderSignUpForm=(req,res)=>{
    res.redirect('/login?mode=signup');
}
module.exports.signup=(async(req,res,next)=>{
    try{
        let{username,email,password}=req.body;
        if (!email.endsWith('.com')) {
            req.flash('error', 'Email must end with .com');
            return res.redirect('/login?mode=signup');
        }
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
        res.redirect('/login?mode=signup');
    }
   
})
module.exports.renderLoginForm=(req,res)=>{
    const mode = req.query.mode || 'login';
    res.render('users/login.ejs', { mode });
}
module.exports.login=async(req,res)=>{
    req.flash('success','You are logged in!');
    
    if (req.user && req.user.email && process.env.ADMIN_EMAIL && req.user.email.toLowerCase().trim() === process.env.ADMIN_EMAIL.toLowerCase().trim()) {
        return res.redirect('/admin');
    }
    
    let redirectUrl=res.locals.redirectUrl||'/listings'
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