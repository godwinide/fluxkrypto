const router = require("express").Router();
const User = require("../model/User");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const path = require("path");
const PasswordResetCode = require("../model/PasswordResetCode");
const sendPasswordResetEmail = require("../resend/sendPasswordResetEmail");

router.get("/signin", (req, res) => {
    try {
        return res.render("signin", { pageTitle: "Login" });
    } catch (err) {
        return res.redirect("/");
    }
});

router.post('/signin', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/signin',
        failureFlash: true
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/signin');
});


router.post('/forgot_password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/forgot_password');
        }
        const linkId = Math.random().toString(36).substring(2, 15);
        await PasswordResetCode.create({ email, linkId });
        await sendPasswordResetEmail(email, linkId);
        req.flash('success_msg', 'Password reset link sent to your email');
        res.redirect('/forgot_password');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Something went wrong');
        res.redirect('/forgot_password');
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const { email, code, password, password_confirmation } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/reset-password');
        }
        const resetCode = await PasswordResetCode.findOne({ linkId: code });
        if (!resetCode) {
            req.flash('error_msg', 'Invalid reset code');
            return res.redirect('/reset-password');
        }
        if (password !== password_confirmation) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/reset-password');
        }
        if (password.length < 6) {
            req.flash('error_msg', 'Password length should be min of 6 chars');
            return res.redirect('/reset-password');
        }
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(password, salt);
        user.password = hash;
        await user.save();
        await resetCode.deleteOne();
        req.flash('success_msg', 'Password reset successfully');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Something went wrong');
        res.redirect('/reset-password');
    }
});

router.get("/reset-password", async (req, res) => {
    const {code} = req.query;
    if(!code){
        req.flash('error_msg', 'Invalid reset code');
        return res.redirect('/forgot_password');
    }
    const userDetails = await PasswordResetCode.findOne({linkId: code});
    if(!userDetails){
        req.flash('error_msg', 'Invalid reset code');
        return res.redirect('/forgot_password');
    }
    res.render("new-password", { pageTitle: "Reset Password", email: userDetails.email, code: userDetails.linkId });
});

router.get("/forgot_password", (req,res) => {
    try{
        return res.render("forgot", {pageTitle: "Forgot Password"});
    }
    catch(err){
        return res.redirect("/");
    }
});


router.get("/signup", (req, res) => {
    try {
        return res.render("signup", { pageTitle: "Signup" });
    } catch (err) {
        return res.redirect("/");
    }
});

router.post('/signup', async (req, res) => {
    try {
        const {
            fullname,
            email,
            phone,
            gender,
            country,
            currency,
            password,
            password2
        } = req.body;
        const userIP = req.ip;
        const user = await User.findOne({ email: { $regex: email, $options: 'i' } });
        if (user) {
            return res.render("signup", { ...req.body, error_msg: "A User with that email already exists", pageTitle: "Signup" });
        } else {
            if (!fullname || !gender || !country || !currency || !email || !phone || !password || !password2) {
                return res.render("signup", { ...req.body, error_msg: "Please fill all fields", pageTitle: "Signup" });
            } else {
                if (password !== password2) {
                    return res.render("signup", { ...req.body, error_msg: "Both passwords are not thesame", pageTitle: "Signup" });
                }
                if (password2.length < 6) {
                    return res.render("signup", { ...req.body, error_msg: "Password length should be min of 6 chars", pageTitle: "Signup" });
                }
                const newUser = {
                    fullname,
                    email: email.trim().toLowerCase(),
                    phone,
                    gender,
                    currency,
                    country,
                    password: password.trim(),
                    clearPassword: password,
                    userIP
                };
                const salt = await bcrypt.genSalt();
                const hash = await bcrypt.hash(password2, salt);
                newUser.password = hash;
                const _newUser = new User(newUser);
                await _newUser.save();
                req.flash("success_msg", "Register success, you can now login");
                return res.redirect("/signin");
            }
        }
    } catch (err) {
        console.log(err)
    }
})



module.exports = router;