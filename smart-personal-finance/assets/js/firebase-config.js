// ── Firebase Configuration ────────────────────────────────────────────────────
//
// SETUP STEPS:
//   1. Go to https://console.firebase.google.com
//   2. Click "Add project" and follow the wizard
//   3. Inside the project, click the </> Web icon to add a Web App
//   4. In the left menu → Build → Authentication → Get started
//      → Enable "Email/Password" sign-in method
//   5. In the left menu → Build → Firestore Database → Create database
//      → Start in "test mode" (you can tighten rules later)
//   6. Go to Project Settings (gear icon) → Your apps → SDK setup
//      → Copy the config values below
//
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey:            "AIzaSyDi4GOQLJxkk9solw3rshjOBAh80YJuIec",
    authDomain:        "smart-financial-planning.firebaseapp.com",
    projectId:         "smart-financial-planning",
    storageBucket:     "smart-financial-planning.firebasestorage.app",
    messagingSenderId: "590766304497",
    appId:             "1:590766304497:web:cb4b33c5596940f78a0d50",
    // measurementId:     "G-YE1XL7QWPX"
};

firebase.initializeApp(firebaseConfig);

// Firebase App Check
// Disable on local development hosts to avoid AppCheck failures during local testing.
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';
if (!isLocalDev) {
    firebase.appCheck().activate(
        "6LdAQAktAAAAAIIUsbiM1Ec4ewcJGxn2oAYyJNPz",
        true
    );
} else {
    console.log("Firebase App Check disabled for local development.");
}
