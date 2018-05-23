// Client-side firebase authentication code. 
// This script should only be included in a html file
// after firebase.js and jquery have been included

// Initialize firebase and the authentication variables
function initAuth() {
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyA3qOBZRh0AD_zQzr5vcXS2O9-TjoKrPPc",
    authDomain: "bookme-e82d7.firebaseapp.com",
    databaseURL: "https://bookme-e82d7.firebaseio.com",
    projectId: "bookme-e82d7",
    storageBucket: "bookme-e82d7.appspot.com",
    messagingSenderId: "597432818735"
  };
  firebase.initializeApp(config);

  // As httpOnly cookies are to be used, do not persist any state client side.
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
}



// Make a post request to the backend to generate the session cookie using the 
// provided id token.
function postIdTokenToSessionLogin(idToken) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/sessionLogin', true);
	//xhr.withCredentials = true;
	xhr.onload = function () {
	  // Request finished. Do processing here.
	  console.log(xhr.response);

	};
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.send(JSON.stringify({idToken: idToken}));
}

// Signs the user into firebase locally and creates a session cookie 
// on the server
function signIn(email, password) {
// When the user signs in with email and password.
	console.log(email,password);
	firebase.auth().signInWithEmailAndPassword(email, password).then(user => {
	  // Get the user's ID token as it is needed to exchange for a session cookie.
	  return user.user.getIdToken().then(idToken => {
	    // TODO: Need to implement CSRF Token

	    return postIdTokenToSessionLogin(idToken);
	  });
	}).then(() => {
	  // Redirect to next page
	 window.location.assign('/profile');
	}).catch(err=>{
		console.log(err);
	});

}