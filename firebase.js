import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  // TODO: Replace with your actual Firebase project configuration from the Firebase Console
  apiKey: "AIzaSyDummyKeyReplaceThisWithRealKey123",
  authDomain: "eventsphere-demo.firebaseapp.com",
  projectId: "eventsphere-demo",
  storageBucket: "eventsphere-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Expose simple API for the rest of the application to use
window.FirebaseStore = {
  getUser: async (mobile) => {
    try {
      const docRef = doc(db, "users", mobile);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.error("Firebase Error (getUser):", e);
      // Fallback for demo mode if config is invalid
      return null; 
    }
  },
  
  createUser: async (mobile, role, name) => {
    try {
      const docRef = doc(db, "users", mobile);
      const userData = {
        mobile,
        role,
        name,
        createdAt: serverTimestamp()
      };
      await setDoc(docRef, userData, { merge: true });
      return userData;
    } catch (e) {
      console.error("Firebase Error (createUser):", e);
      // Fallback for demo mode
      return { mobile, role, name, createdAt: new Date() };
    }
  },

  updateName: async (mobile, newName) => {
    try {
      const docRef = doc(db, "users", mobile);
      await updateDoc(docRef, { name: newName });
      return true;
    } catch (e) {
      console.error("Firebase Error (updateName):", e);
      return false;
    }
  }
};

// Dispatch an event so the app knows Firebase is ready
window.dispatchEvent(new Event('firebase-ready'));
