const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    expressSanitizer = require("express-sanitizer"),
    methodOverride = require("method-override"),
    admin = require("firebase-admin");

// Firebase Initialization
let serviceAccount = require("./bookme-e82d7-firebase-adminsdk-ma0t3-11a806d0f4.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bookme-e82d7.firebaseio.com"
});

// Firebase Variables
let db = admin.firestore();


// TODO: Add necessary headers for things such as caching and other necessary features.

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(expressSanitizer());

app.get("/", function(req, res) {
    res.render("home.ejs");
});

app.get("/register", (req, res) => {
	res.render("register.ejs");
});

// Just to test register
app.post("/register", (req, res) => {
	let userInfo = req.body.userInfo;
	console.log(userInfo);
	res.send("Yep");
	console.log(userInfo);
});

// For testing canvas
app.get("/canvas", function(req, res) {
	res.render("canvas.ejs");
});


/*
 * Edit space with the given id
*/
app.get("/spaces/edit/:id", (req,res) => {
  console.log('test');
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

// TODO: Do everything related to groups

/*
 * Create a new space
 * Takes json object with format:
 * TODO: fill in json format here later
*/
app.post("/spaces", (req, res, next) => {
	// TODO: check is user is authorized to create/edit spaces (possibly just use firebase rules here)
	// TODO: optimize the updating so that it does not rewrite the whole space everytime
  // TODO: Possibly make the space's name its uid
	let spaceObj = req.body;
  // TODO: send info on the space in an object called "info"
  let info = spaceObj.info;
  // TODO: Change this to info object once I start supporting sending data
  let spaceRef = db.collection('spaces').doc();
  let spaceId = spaceRef.id;
  let addSpace = spaceRef.set(info).then(() => {
    let batch = db.batch();
    if (spaceObj.spots) {
      spaceObj.spots.forEach((spot, i) => {
        // TODO: Validate the data in spots array (most importantly, check if they have an id)
        let spotRef = db.collection('spaces').doc(ref.id).collection('spots').doc(spot.id);
        batch.set(spotRef, spot);
      });
    }
    return batch.commit();
  }).then(()=> {
    // TODO: read up on promises to see if this is best syntax
    return res.send("Successfully created new space with id " + spaceRef.id);
  }).catch((err) => {
    // TODO: Check if 500 is correct error code
    res.status(500).send("Internal Error");
    console.log(err);
  });
	


});

/*
 * Gets general info on all spaces
 * does not return spots or groups
 * Returns data as json with format:
 * TODO: fill in json format here
 */
app.get("/spaces", (req, res, next) => {
  let spacesRef = db.collection('spaces');
  let getDoc = spacesRef.get().then(snapshot => {
    let spaces = [];
    snapshot.forEach(space => {
      let spaceObj = space.data();
      // NOTE: This is only here because I wasn't adding id to the space docs before. This is fixed now and thus uncessary moving forward
      if (!spaceObj.id) spaceObj.id = space.id;
      spaces.push(spaceObj);
    })
    return res.send(spaces);
  }).catch(err => {
    res.status(500).send("Internal Error");
    console.log(err);
  });
});

/*
 * Retrieves data on space with given id
 * Returns data as json with format:
 * TODO: fill in json format here
*/
app.get("/spaces/:id", (req,res,next)=> {
  // TODO: check is user is authorized to do this. Should probably be done as middleware for all requests that require a user is signed in
  let spaceRef = db.collection('spaces').doc(req.params.id);
  let spaceObj = {};
  spaceObj.spots = [];
  let getDoc = spaceRef.get().then(doc => {
    if (doc.exists) {
      spaceObj.info = doc.data();;
      return spaceRef.collection('spots').get()
    } else throw 'invalid-ID';
  }).then(snapshot => {
    snapshot.forEach(spot => {
      spaceObj.spots.push(spot.data());
    });
    return res.send(spaceObj);
  }).catch(err => {
    if (err === "invalid-ID") {
      res.status(500).send("Invalid ID. Document does not exist");
    } else res.status(500).send("Internal Error");
    console.log(err);
  });
});

/*
 * Update a space by completely replacing
 * Takes json object with format:
 * TODO: fill in json format here later
*/
app.put("/spaces/:id", (req, res, next) => {
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
	


});

app.post("/newuser", (req, res, next) => {
	let userInfo = req.body;
	console.log(userInfo);
	admin.auth().createUser({
  "email": userInfo.email,
  "password": userInfo.password,
  "displayName": userInfo.name,
  "phoneNumber": userInfo.number
})
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log("Successfully created new user:", userRecord.uid);

    //Eventually will return idToken here to client
    res.send("Success");
  })
  .catch(function(error) {
    console.log("Error creating new user:", error);
    res.status(500).send("ERROR: " + error);
  });
});

app.post("user", (req, res, next) => {
	let userInfo = req.body;

});

app.listen(8000, function() {
   console.log("BookMe Server Running..."); 
});