const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    expressSanitizer = require("express-sanitizer"),
    methodOverride = require("method-override"),
    admin = require("firebase-admin"),
    cookieParser = require('cookie-parser');

// Firebase Initialization
let serviceAccount = require("./bookme-e82d7-firebase-adminsdk-ma0t3-11a806d0f4.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bookme-e82d7.firebaseio.com"
});

// Firebase Variables
let db = admin.firestore();
app.set('port', process.env.PORT || 8000);

  
app.use(cookieParser());;
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(expressSanitizer());

// Helper function definitions
// A authenticate function that is called as a callback in all routes 
// that require authentication
function authenticate(req, res, next)  {
  const sessionCookie = req.cookies.session || '';
  console.log(req.cookies);
  // Verify the session cookie. In this case an additional check is added to detect
  // if the user's Firebase session was revoked, user deleted/disabled, etc.
  admin.auth().verifySessionCookie(
    sessionCookie, true /** checkRevoked */).then((decodedClaims) => {
    res.locals.user = decodedClaims;
    next();
  }).catch(error => {
    // Session cookie is unavailable or invalid. Force user to login.
    //console.log(error);
    res.redirect('/login');
  });

}

//Routes

app.get("/", authenticate, function(req, res) {
    res.redirect('/profile')
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

app.post('/sessionLogin', (req, res) => {
  // Get the ID token passed and the CSRF token.
  const idToken = req.body.idToken.toString();
  console.log(idToken);
  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  // Create the session cookie. This will also verify the ID token in the process.
  // The session cookie will have the same claims as the ID token.
  // To only allow session cookie setting on recent sign-in, auth_time in ID token
  // can be checked to ensure user was recently signed in before creating a session cookie.
  admin.auth().createSessionCookie(idToken, {expiresIn}).then((sessionCookie) => {
    // Set cookie policy for session cookie.
    const options = {maxAge: expiresIn, httpOnly: true};
    res.cookie('session', sessionCookie, options);
    res.send(JSON.stringify({status: 'success'}));
  }, error => {
    res.status(401).send('UNAUTHORIZED REQUEST!');
  });
});


// For testing canvas
app.get("/canvas", function(req, res) {
	res.render("canvas.ejs");
});


/*
 * Edit space with the given id
*/
app.get("/spaces/edit/:id", authenticate, (req,res) => {
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
app.post("/spaces", authenticate, (req, res, next) => {
	// TODO: check is user is authorized to create/edit spaces (possibly just use firebase rules here)
	// TODO: optimize the updating so that it does not rewrite the whole space everytime
	let spaceObj = req.body;

  let info = spaceObj.info;
  // Add the owner Id to the info object
  info.owner = res.locals.user.uid;

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


app.get("/profile",authenticate, (req,res,next)=> {
  // Getting the full list of spaces just for testing
  let user = res.locals.user;
  if (user.provider != true) {
    // TODO: Handle case where user is not authorized
  } 

  let spaceRef = db.collection("spaces");
  var spaces = [];
  let getDoc = spaceRef.where('owner', '==', user.uid).get().then(snapshot => {
    snapshot.forEach(space => {
      let spaceObj = space.data();
      spaceObj.id = space.id;
      spaces.push(spaceObj);
    });  
    console.log(user)  
    res.render("profile.ejs",{
      spaces : spaces,
      user: user
    });  
  });

  console.log(spaces);

  
});

app.get('/signout',authenticate, (req, res) => {
  const sessionCookie = req.cookies.session || '';
  res.clearCookie('session');
  res.redirect('/login');

})

app.get("/login", (req,res) => {
  res.render("home.ejs");
});

app.get("/spaces/view/:id", authenticate, (req,res,next)=> {
  let resRef = db.collection('reservations')
  let query = resRef.where("spaceId","==",req.params.id);
  let reservations = [];
  let spaceObj = {};
  spaceObj.spots = [];
  let spaceRef = db.collection('spaces').doc(req.params.id);
  query.get().then(function(querySnapshot) {
    querySnapshot.forEach(result=> {
      reservations.push(result.data());
    });
    return spaceRef.get();
  }).then(doc => {
    spaceObj.info = doc.data();
    return spaceRef.collection('spots').get()
  }).then(snapshot => {
    snapshot.forEach(spot => {
      spaceObj.spots.push(spot.data());
    });
    return res.render("viewSpace.ejs", {reservations: reservations, space: spaceObj});
  }).catch(err => {
    console.log(err);
    res.status(500).send(err);
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
      spaceObj.info = doc.data();
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
app.put("/spaces/:id", authenticate, (req, res, next) => {
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
  }).then((userRecord) => {
    console.log("Successfully created new user:", userRecord.uid);
    return admin.auth().setCustomUserClaims(userRecord.uid, {provider: true});
  }).then(() => {
      res.send("Success");
  }).catch(function(error) {
      console.log("Error creating new user:", error);
      res.status(500).send("ERROR: " + error);
  });
});

// Make new reservations
app.post("/reservations", (req, res) => {
  let resInfo = req.body;
  let startTime = resInfo.start;
  let endTime = resInfo.end;
  resInfo.start = parseInt(resInfo.start);
  resInfo.end = parseInt(resInfo.end);
  resInfo.spotId = parseInt(resInfo.spotId);
  // First verify that the reservation is legal (There isn't one at the same time already)
  let reservations = db.collection("reservations").where("spaceId", "==", resInfo.spaceId).where("spotId", "==", resInfo.spotId);
  let startCheck = reservations.where("start", ">=", startTime).where("start", "<=", endTime);
  let endCheck = reservations.where("end", "<=", endTime).where("end", ">=", startTime);
  let containCheck = reservations.where("end", ">=", endTime);

  startCheck.get().then(snapshot => {
    console.log(snapshot.size);
    if (snapshot.size != 0) throw "invalid-time";
    return endCheck.get();
  }).then(snapshot => {
    if (snapshot.size != 0) throw "invalid-time";
    return containCheck.get();
  }).then(snapshot => {
    snapshot.forEach(reservation => {
      if (reservation.data().start <= resInfo.end) throw "invalid-time";
    });
    let resRef = db.collection('reservations').doc();
    return resRef.set(resInfo);
  }).then(()=> {
    res.send(JSON.stringify({status: "success"}));
  }).catch(err => {
    console.log(err);
    res.status(500).send(JSON.stringify({status: err}));
  });
});

app.listen(app.get('port'), app.get('host'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

