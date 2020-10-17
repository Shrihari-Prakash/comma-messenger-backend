const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const cryptUtil = require("./crypt");
const crypt = new cryptUtil.crypt();

function tokenManager() {
  this.generate = (db, userId, cacheManager) => {
    if (typeof userId === "object") {
      userId = userId.toString();
    }
    console.log("Generating authentication token for user id: ", userId);
    return new Promise((resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
      let insertToken = "CM_" + token(125);

      let tokenObject = {
        user_id: ObjectId(userId),
        token: "CM_" + crypt.encrypt(insertToken),
        date_added: now,
        date_expiry: tomorrow,
      };

      db.collection("tokens").insertOne(tokenObject, { w: 1 }, function (
        err,
        result
      ) {
        if (err) reject(err);

        cacheManager.putUserToken(
          userId,
          insertToken + ":" + tokenObject._id.toString() //Cache token format - token:token_id
        );
        resolve(insertToken);
      });
    });
  };

  this.verify = async (db, userId, token, cacheManager) => {
    return new Promise(async (resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));

      //If the user id is stored in cache directly retreive it.
      let cacheToken = cacheManager.getTokenFromUserId(userId);

      if (cacheToken && cacheToken.split(":")[0] === token) {
        console.log(
          "User " + userId + "'s token has been verified from cache."
        );
        //If the token validation is success, we bump up the token expiry time to one more day so that the user stays logged in.
        db.collection("tokens").updateOne(
          { _id: ObjectId(cacheToken.split(":")[1]) }, //Cache token format - token:token_id
          { $set: { date_expiry: tomorrow } }
        );

        return resolve(userId);
      } else {
        if (ObjectId.isValid(userId) === false) return resolve(false);

        let tokenObjects = await db
          .collection("tokens")
          .find({ user_id: ObjectId(userId) })
          .toArray();

        if (!tokenObjects) {
          console.log("No valid token was matched for the given request.");
          return resolve(false);
        }

        //Because an user might have multiple sessions active in multiple devices.
        let tokenObject;

        tokenObject = tokenObjects.find((tokenObj) => {
          try {
            return token === crypt.decrypt(tokenObj.token.slice(3)); //Remove 'CM_' before decrypting.
          } catch (e) {
            console.log(e);
            return false;
          }
        });

        if (!tokenObject) return resolve(false);

        if (tokenObject.date_expiry < new Date()) return resolve(false);

        await db
          .collection("tokens")
          .updateOne(
            { token: tokenObject._id },
            { $set: { date_expiry: tomorrow } }
          );

        console.log(
          "User " +
            tokenObject.user_id +
            "'s token has been verified from database."
        );
        cacheManager.putUserToken(
          tokenObject.user_id.toString(),
          token + ":" + tokenObject._id.toString()
        );
        resolve(tokenObject.user_id.toString());
      }
    });
  };
}

//function code taken from https://stackoverflow.com/a/34387027/12466812
function token(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex") // convert to hexadecimal format
    .slice(0, len)
    .toUpperCase(); // return required number of characters
}

module.exports = new tokenManager();
module.exports.tokenManager = tokenManager;
