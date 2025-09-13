const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AmazonStrategy = require('passport-amazon').Strategy;
const IDmeStrategy = require('passport-idme').Strategy;
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

// Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
          logger.error('Database error during authentication:', err);
          return done(err);
        }
        
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        if (!user.isVerified) {
          return done(null, false, { message: 'Please verify your email before logging in' });
        }
        
        return done(null, user);
      });
    } catch (error) {
      logger.error('Error in local strategy:', error);
      return done(error);
    }
  }
));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user in the database
      db.get('SELECT * FROM users WHERE googleId = ? OR email = ?', 
        [profile.id, profile.emails[0].value], 
        async (err, user) => {
          if (err) {
            logger.error('Database error during Google auth:', err);
            return done(err);
          }
          
          if (user) {
            // Update user with Google ID if not already set
            if (!user.googleId) {
              db.run('UPDATE users SET googleId = ? WHERE id = ?', 
                [profile.id, user.id]);
              user.googleId = profile.id;
            }
            return done(null, user);
          } else {
            // Create new user
            const newUser = {
              id: uuidv4(),
              email: profile.emails[0].value,
              googleId: profile.id,
              isVerified: true, // Google verifies the email
              displayName: profile.displayName,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              avatar: profile.photos ? profile.photos[0].value : null
            };
            
            db.run(
              'INSERT INTO users (id, email, googleId, isVerified, displayName, firstName, lastName, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                newUser.id,
                newUser.email,
                newUser.googleId,
                1, // isVerified
                newUser.displayName,
                newUser.firstName,
                newUser.lastName,
                newUser.avatar
              ],
              (err) => {
                if (err) {
                  logger.error('Error creating Google user:', err);
                  return done(err);
                }
                return done(null, newUser);
              }
            );
          }
        }
      );
    } catch (error) {
      logger.error('Error in Google strategy:', error);
      return done(error);
    }
  }));
}

// Microsoft OAuth Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: '/auth/microsoft/callback',
    scope: ['user.read'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Similar implementation to Google strategy
      // Find or create user in the database
      db.get('SELECT * FROM users WHERE microsoftId = ? OR email = ?', 
        [profile.id, profile.emails[0].value], 
        async (err, user) => {
          if (err) {
            logger.error('Database error during Microsoft auth:', err);
            return done(err);
          }
          
          if (user) {
            if (!user.microsoftId) {
              db.run('UPDATE users SET microsoftId = ? WHERE id = ?', 
                [profile.id, user.id]);
              user.microsoftId = profile.id;
            }
            return done(null, user);
          } else {
            const newUser = {
              id: uuidv4(),
              email: profile.emails[0].value,
              microsoftId: profile.id,
              isVerified: true,
              displayName: profile.displayName,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName
            };
            
            db.run(
              'INSERT INTO users (id, email, microsoftId, isVerified, displayName, firstName, lastName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                newUser.id,
                newUser.email,
                newUser.microsoftId,
                1,
                newUser.displayName,
                newUser.firstName,
                newUser.lastName
              ],
              (err) => {
                if (err) {
                  logger.error('Error creating Microsoft user:', err);
                  return done(err);
                }
                return done(null, newUser);
              }
            );
          }
        }
      );
    } catch (error) {
      logger.error('Error in Microsoft strategy:', error);
      return done(error);
    }
  }));
}

// Amazon OAuth Strategy
if (process.env.AMAZON_CLIENT_ID && process.env.AMAZON_CLIENT_SECRET) {
  passport.use(new AmazonStrategy({
    clientID: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    callbackURL: '/auth/amazon/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Similar implementation to other strategies
      // Find or create user in the database
      db.get('SELECT * FROM users WHERE amazonId = ? OR email = ?', 
        [profile.id, profile.emails[0].value], 
        async (err, user) => {
          if (err) {
            logger.error('Database error during Amazon auth:', err);
            return done(err);
          }
          
          if (user) {
            if (!user.amazonId) {
              db.run('UPDATE users SET amazonId = ? WHERE id = ?', 
                [profile.id, user.id]);
              user.amazonId = profile.id;
            }
            return done(null, user);
          } else {
            const newUser = {
              id: uuidv4(),
              email: profile.emails[0].value,
              amazonId: profile.id,
              isVerified: true,
              displayName: profile.displayName,
              name: profile.name,
              postalCode: profile._json.postal_code
            };
            
            db.run(
              'INSERT INTO users (id, email, amazonId, isVerified, displayName, firstName, lastName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                newUser.id,
                newUser.email,
                newUser.amazonId,
                1,
                newUser.displayName,
                newUser.name?.givenName || '',
                newUser.name?.familyName || ''
              ],
              (err) => {
                if (err) {
                  logger.error('Error creating Amazon user:', err);
                  return done(err);
                }
                return done(null, newUser);
              }
            );
          }
        }
      );
    } catch (error) {
      logger.error('Error in Amazon strategy:', error);
      return done(error);
    }
  }));
}

// ID.me OAuth Strategy
if (process.env.IDME_CLIENT_ID && process.env.IDME_CLIENT_SECRET) {
  passport.use(new IDmeStrategy({
    clientID: process.env.IDME_CLIENT_ID,
    clientSecret: process.env.IDME_CLIENT_SECRET,
    callbackURL: process.env.IDME_REDIRECT_URI,
    scope: ['military', 'disability', 'student', 'responder', 'veteran'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user in the database
      db.get('SELECT * FROM users WHERE idmeId = ? OR email = ?', 
        [profile.id, profile.email], 
        async (err, user) => {
          if (err) {
            logger.error('Database error during ID.me auth:', err);
            return done(err);
          }
          
          if (user) {
            if (!user.idmeId) {
              db.run('UPDATE users SET idmeId = ? WHERE id = ?', 
                [profile.id, user.id]);
              user.idmeId = profile.id;
            }
            return done(null, user);
          } else {
            const newUser = {
              id: uuidv4(),
              email: profile.email,
              idmeId: profile.id,
              isVerified: true,
              displayName: `${profile.name.firstName} ${profile.name.lastName}`,
              firstName: profile.name.firstName,
              lastName: profile.name.lastName,
              idmeAffiliation: profile.affiliation
            };
            
            db.run(
              'INSERT INTO users (id, email, idmeId, isVerified, displayName, firstName, lastName, idmeAffiliation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                newUser.id,
                newUser.email,
                newUser.idmeId,
                1,
                newUser.displayName,
                newUser.firstName,
                newUser.lastName,
                newUser.idmeAffiliation
              ],
              (err) => {
                if (err) {
                  logger.error('Error creating ID.me user:', err);
                  return done(err);
                }
                return done(null, newUser);
              }
            );
          }
        }
      );
    } catch (error) {
      logger.error('Error in ID.me strategy:', error);
      return done(error);
    }
  }));
}

// Serialize user into the sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the sessions
passport.deserializeUser((id, done) => {
  db.get('SELECT id, email, displayName, isVerified FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      logger.error('Error deserializing user:', err);
      return done(err);
    }
    done(null, user);
  });
});

module.exports = passport;
