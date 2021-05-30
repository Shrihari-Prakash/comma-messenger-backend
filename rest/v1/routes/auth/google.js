const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

//Google auth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.SERVER_URL + "/api/rest/v1/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      /* console.log(profile); */
      return cb(null, profile);
    }
  )
);

router.get(
  "/google",
  (req, res, next) => {
    req.session.returnTo = req.headers.referer;
    //Do not allow anonymous login when, like in cases where user requests a login by simply trying the url on a browser address bar.
    console.log("Return to URL: ", req.session.returnTo);
    /* if (!req.session.returnTo) {
      let error = new errorModel.errorResponse(
        errors.invalid_input.withDetails(
          "The login request did not arrive from a trusted domain."
        )
      );
      return res.status(400).json(error);
    } */

    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }) //The `profile-email` scope is the most minimal amount of data you can get without sending your app for verification.
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/google" }),
  async function (req, res) {
    postAuthenticate(req, res);
  }
);

async function postAuthenticate(req, res) {
  let fullName = req.user.name;
  let email = req.user.emails[0].value;
  let displayPictureURL = req.user.photos[0].value;

  let user = {
    name: fullName, //{object} - contains keys :givenName and :familyName.
    email: email,
    display_picture: displayPictureURL,
    threads: [],
    master_password: null,
    tab_password: null,
  };

  let db = req.app.get("mongoInstance");

  userManager
    .checkExistingUser(db, email)
    .then((existingUser) => {
      if (typeof existingUser === "boolean" && existingUser === false) {
        db.collection("users").insertOne(
          user,
          { w: 1 },
          function (err, result) {
            if (err) throw err;
            let insertedUserId = user._id;

            tokenManager
              .generate(db, insertedUserId, req.app.get("cacheManager"))
              .then((insertToken) => {
                const responseUserObject = {
                  _id: user._id,
                  name: user.name,
                  email: user.email,
                  display_picture: user.display_picture,
                };
                //Redirect to the page from which the login request came from with the login details attached.
                console.log("Returning control to: ", req.session);
                res.redirect(
                  req.session.returnTo +
                    encodeURI(
                      `?status=SUCCESS&type=register&user_data=${JSON.stringify(
                        responseUserObject
                      )}&token=${insertToken}`
                    )
                );
              });
          }
        );
      } else {
        tokenManager
          .generate(db, existingUser._id, req.app.get("cacheManager"))
          .then(async (insertToken) => {
            const responseUserObject = {
              _id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
              display_picture: existingUser.display_picture,
            };
            console.log("Returning control to: ", req.session.returnTo);
            res.redirect(
              req.session.returnTo +
                encodeURI(
                  `?status=SUCCESS&type=login&user_data=${JSON.stringify(
                    responseUserObject
                  )}&token=${insertToken}`
                )
            );

            try {
              //Update user's profile picture on database on login.
              await db.collection("users").updateOne(
                {
                  _id: existingUser._id,
                },
                {
                  $set: {
                    display_picture: displayPictureURL,
                  },
                }
              );
            } catch (e) {
              console.error(
                "An error occurred while attempting to update display picture",
                e
              );
            }
          });
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({
        status: "ERR",
        reason: "INTERNAL_SERVER_ERROR",
        insight: err,
      });
    });
}

module.exports = router;
