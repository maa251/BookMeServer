// The router for all protected paths.
// Every path defined here is only accesible by logged-in users
var express = require('express')
var router = express.Router()

// Authentication middleware
router.use((req, res, next) => {
	const sessionCookie = req.cookies.session || '';
  // Verify the session cookie. In this case an additional check is added to detect
  // if the user's Firebase session was revoked, user deleted/disabled, etc.
  admin.auth().verifySessionCookie(
    sessionCookie, true /** checkRevoked */).then((decodedClaims) => {
    next();
  }).catch(error => {
    // Session cookie is unavailable or invalid. Force user to login.
    res.redirect('/');
  });

});

/*
 * Edit space with the given id
*/
router.get("/spaces/edit/:id", (req,res) => {
  // TODO: do authentication stuff
  let spaceRef = db.collection('spaces').doc(req.params.id);
  let spaceObj = {};
  spaceObj.spots = [];
  spaceObj.presets = [];
  let getDoc = spaceRef.get().then(doc => {
    if (doc.exists) {
      spaceObj.info = doc.data();
      return spaceRef.collection('spots').get();
    } else throw 'invalid-ID';
  }).then(snapshot => {
    snapshot.forEach(spot => {
      spaceObj.spots.push(spot.data());
    });
    return spaceRef.collection('presets').get();
  }).then(snapshot => {
    snapshot.forEach(preset => {
      spaceObj.presets.push(preset.data());
    });
    console.log(spaceObj)
    return res.render("canvas.ejs", {data: spaceObj});
  }).catch(err => {
    if (err === "invalid-ID") {
      res.status(500).send("Invalid ID. Document does not exist");
    } else res.status(500).send("Internal Error");
    console.log(err);
  });
});

router.put("/spaces/:id", (req, res, next) => {
	// TODO: check is user is authorized to create/edit spaces (possibly just use firebase rules here)
	// TODO: check if space exists
	// TODO: if space exists check if user is authorized to edit it
	// TODO: Add a PATCH request for "/spaces/:id" and optimize the update code so that it does not rewrite the whole space everytime
  let spaceObj = req.body;
  console.log(spaceObj);
  console.log(req.params.id);
  // TODO: send info on the space in an object called "info"
  let info = spaceObj.info;
  // TODO: Change this to info object once I start supporting sending data
  let batch = db.batch();
  let spaceRef = db.collection('spaces').doc(req.params.id);
  if (info) batch.set(spaceRef, info);
    if (spaceObj.spots) {
      spaceObj.spots.forEach((spot, i) => {
      // TODO: Validate the data in spots array (most importantly, check if they have an id)
      console.log(spot.id);
      let spotRef = db.collection('spaces').doc(spaceRef.id).collection('spots').doc(spot.id.toString());
      batch.set(spotRef, spot);
    });
    }
    if (spaceObj.presets) {
      spaceObj.presets.forEach((preset, i) => {
      // TODO: Validate the data in presets array (most importantly, check if they have an id)
      console.log(preset.name);
      let presetRef = db.collection('spaces').doc(spaceRef.id).collection('presets').doc(preset.name);
      batch.set(presetRef, preset);
    });
  }

  batch.commit().then(()=> {
    // TODO: read up on promises to see if this is best syntax
    return res.send("Successfully updated space with id " + spaceRef.id);
  }).catch((err) => {
    // TODO: Check if 500 is correct error code
    res.status(500).send("Internal Error");
    console.log(err);
  });