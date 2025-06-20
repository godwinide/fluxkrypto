const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../model/User');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      // Match user
      User.findOne({ email: { $regex: email, $options: 'i' } })
        .then(user => {
          if (!user) {
            return done(null, false, { message: 'invalid email or password' });
          }
          // Match password
          bcrypt.compare(password.trim(), user.password.trim(), (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              // check if user has been blocked
              if (user.accountBlocked) {
                return done(null, false, { message: 'Your account has been blocked, please contact support' });
              }
              return done(null, user);
            } else {
              return done(null, false, { message: 'invalid email or password' });
            }
          });
        });
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};