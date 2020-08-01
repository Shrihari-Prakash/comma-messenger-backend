const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.put("/", async function (req, res) {
  renameTab(req, res);
});

async function renameTab(req, res) {
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

  let tabInfo = req.body;

  if (!tabInfo.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!tabInfo.name) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_name` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  try {
    db.collection("threads").findOne(
      { tabs: { $in: [ObjectId(tabInfo.tab_id)] } },
      function (err, threadObject) {
        if (err) {
          let error = new errorModel.errorResponse(
            errors.invalid_input.withDetails(
              "No valid `tab_id` was sent along with the request."
            )
          );
          return res.status(400).json(error);
        }

        db.collection("tabs").updateOne(
          { _id: ObjectId(tabInfo.tab_id) },
          { $set: { tab_name: tabInfo.name } },
          function (err, result) {
            if (err) throw err;
            return res.status(200).json({
              status: 200,
              message: "Tab renamed.",
            });
          }
        );
      }
    );
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

module.exports = router;
