import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

console.log("VITE_FIREBASE_API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "savemyfuse.firebaseapp.com",
  projectId: "savemyfuse",
  storageBucket: "savemyfuse.firebasestorage.app",
  messagingSenderId: "962172707019",
  appId: "1:962172707019:web:cd2af9620fb8a2d837fb4e",
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
// const analytics = getAnalytics(app);
const db = getFirestore(app);

// const storage = getStorage(app);
const auth = getAuth(app);

if (import.meta.env.VITE_FIREBASE_LOCAL === "1") {
  console.log("using local emulator");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 9080);
} else {
  console.log("using remote server");
}
auth.useDeviceLanguage();

auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("authenticated", user);
  } else {
    console.log("signed out");
  }
});

export { db, auth };
