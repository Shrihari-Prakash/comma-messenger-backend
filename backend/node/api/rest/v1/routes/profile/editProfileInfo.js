const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

//An array of properties that an user is allowed to edit.
const editableProperties = [
  "name",
  "familyName",
  "givenName",
  "display_picture",
  "tab_password"
];

router.put("/", async function (req, res) {
  editProfileInfo(req, res);
});

async function editProfileInfo(req, res) {
  if (!req.header("authorization")) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }
  let authToken = req
    .header("authorization")
    .slice(7, req.header("authorization").length)
    .trimLeft();

  if (!authToken) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let cacheManager = req.app.get("cacheManager");

  let db = req.app.get("mongoInstance");

  let loggedInUserId = await tokenManager.verify(db, authToken, cacheManager);

  if (!loggedInUserId) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let userDetails = req.body;

  //We need to make sure the user does not edit things he is not supposed to edit. Say, his email,
  if (
    validateJSONProperties(userDetails) == false ||
    validateJSONSchema(userDetails) == false
  ) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `profile object` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  try {
    db.collection("users").updateOne(
      { _id: ObjectId(loggedInUserId) },
      { $set: userDetails },
      function (err, result) {
        if (err) throw err;
        return res.status(200).json({
          status: 200,
          message: "Profile info changed.",
        });
      }
    );
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

function validateJSONProperties(o) {
  let returnValue = true;
  Object.keys(o).forEach(function (k) {
    if (o[k] !== null && typeof o[k] === "object") {
      validateJSONProperties(o[k]);
    }
    if (typeof o[k] === "string") {
      if (!editableProperties.includes(k)) {
        returnValue = false;
        return false;
      }
    }
  });
  return returnValue;
}

/*Put any checks you need to do for validating the input JSON schema, in this case, the name given by Google when a user signs up is
an {object}. This object contains :givenName and :familyName keys.*/
function validateJSONSchema(userDetails) {
  if (userDetails.name) {
    if (!userDetails.name.familyName || !userDetails.name.givenName)
      return false;
  }
  if (isEmptyOrSpaces(password) || password.length < 4) {
    return false;
  }
  return true;
}

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

module.exports = router;
