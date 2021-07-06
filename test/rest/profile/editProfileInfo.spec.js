const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/profile/editProfileInfo";

var profileObject = {
  name: {
    familyName: "Doe",
    givenName: "John",
  },
  change_tab_password: {
    existing: "null",
    changed: "1234",
  },
};

common.user1.password = profileObject.change_tab_password.changed;

it("Edit profile info with valid profile object.", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send(profileObject)
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .set("x-cm-user-id", common.user1._id)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      done();
    });
});

it("Change tab_password with invalid password", function (done) {
  profileObject.change_tab_password.existing = "1212";
  chai
    .request(server)
    .put(endPoint)
    .send(profileObject)
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .set("x-cm-user-id", common.user1._id)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});

it("Change tab_password with valid password", function (done) {
  profileObject.change_tab_password.existing = "1234";
  chai
    .request(server)
    .put(endPoint)
    .send(profileObject)
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .set("x-cm-user-id", common.user1._id)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      done();
    });
});

it("Edit profile info with invalid API key", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send(profileObject)
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});
