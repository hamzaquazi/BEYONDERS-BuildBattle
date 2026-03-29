import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Firebase project configuration ─────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyABC7yqjV0jbWR-5akb-BrnQWpF_Nx5zzw",
  authDomain:        "nexevent-f7e58.firebaseapp.com",
  projectId:         "nexevent-f7e58",
  storageBucket:     "nexevent-f7e58.firebasestorage.app",
  messagingSenderId: "872625074855",
  appId:             "1:872625074855:web:96106b181f46216126e182",
  measurementId:     "G-KJJQPB7BYM"
};

// ─── Initialise app & Firestore ───────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

console.log("[Firebase] Initialised — project:", firebaseConfig.projectId);

// ─── Simple deterministic hash for demo password storage ─────────────────────
// NOTE: This is NOT cryptographic. Use Firebase Auth for production.
function _simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

// ─── Public API ──────────────────────────────────────────────────────────────
window.FirebaseStore = {

  // ── getUser ──────────────────────────────────────────────────────────────
  /** Fetch a user document by mobile number (doc ID = mobile). */
  getUser: async (mobile) => {
    console.log("[FirebaseStore.getUser] Looking up mobile:", mobile);
    try {
      const docRef  = doc(db, "users", mobile);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("[FirebaseStore.getUser] Found:", docSnap.data());
        return docSnap.data();
      }
      console.log("[FirebaseStore.getUser] No user found for mobile:", mobile);
      return null;
    } catch (err) {
      console.error("[FirebaseStore.getUser] Error:", err.code, err.message);
      return null;
    }
  },

  // ── loginUser ─────────────────────────────────────────────────────────────
  /**
   * Verify login credentials against Firestore.
   * Returns { ok: true, user } or { ok: false, error: string }
   */
  loginUser: async (mobile, password, role) => {
    console.log("[FirebaseStore.loginUser] Attempting login for:", mobile, "role:", role);
    try {
      const docRef  = doc(db, "users", mobile);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn("[FirebaseStore.loginUser] User not found:", mobile);
        return { ok: false, error: "User not found. Please create an account." };
      }

      const user = docSnap.data();
      console.log("[FirebaseStore.loginUser] User data fetched:", { ...user, passwordHash: "[hidden]" });

      const hash = _simpleHash(password);
      if (user.passwordHash !== hash) {
        console.warn("[FirebaseStore.loginUser] Password mismatch for:", mobile);
        return { ok: false, error: "Incorrect password. Please try again." };
      }

      if (user.role !== role) {
        console.warn("[FirebaseStore.loginUser] Role mismatch — stored:", user.role, "provided:", role);
        return {
          ok: false,
          error: `This account is registered as a${user.role === 'organizer' ? 'n Organizer' : ' Student'}. Please select the correct role.`
        };
      }

      console.log("[FirebaseStore.loginUser] Login successful for:", mobile);
      return { ok: true, user };
    } catch (err) {
      console.error("[FirebaseStore.loginUser] Error:", err.code, err.message, err);
      return { ok: false, error: `Login failed: ${err.message}` };
    }
  },

  // ── signupUser ────────────────────────────────────────────────────────────
  /**
   * Create a new user document in Firestore.
   * Returns { ok: true } or { ok: false, error: string }
   */
  signupUser: async ({ name, email, mobile, password, role }) => {
    console.log("[FirebaseStore.signupUser] Starting signup for mobile:", mobile);
    console.log("[FirebaseStore.signupUser] Payload:", { name, email, mobile, role, password: "[hidden]" });

    try {
      // 1. Check for existing account
      const docRef  = doc(db, "users", mobile);
      console.log("[FirebaseStore.signupUser] Checking if mobile already exists...");
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        console.warn("[FirebaseStore.signupUser] Mobile already registered:", mobile);
        return { ok: false, error: "An account with this mobile number already exists." };
      }

      // 2. Build user payload
      const userData = {
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        mobile:       mobile.trim(),
        passwordHash: _simpleHash(password),
        role:         role,
        createdAt:    serverTimestamp(),
      };

      console.log("[FirebaseStore.signupUser] Writing user doc to Firestore...");
      console.log("[FirebaseStore.signupUser] Doc path: users/" + mobile);

      // 3. Write to Firestore
      await setDoc(docRef, userData);

      console.log("[FirebaseStore.signupUser] ✅ User created successfully:", mobile);
      return { ok: true };

    } catch (err) {
      // Surface the real Firebase error — code + message both shown
      console.error("[FirebaseStore.signupUser] ❌ Firestore write failed:");
      console.error("  code   :", err.code);
      console.error("  message:", err.message);
      console.error("  full   :", err);

      // Show the actual Firebase error to the user so it's debuggable
      const userFriendlyError = err.code
        ? `Signup failed (${err.code}): ${err.message}`
        : `Signup failed: ${err.message}`;

      return { ok: false, error: userFriendlyError };
    }
  },

  // ── createUser (legacy) ───────────────────────────────────────────────────
  /** Backwards-compatible user creation without password. */
  createUser: async (mobile, role, name) => {
    console.log("[FirebaseStore.createUser] Legacy create for:", mobile);
    try {
      const docRef   = doc(db, "users", mobile);
      const userData = { mobile, role, name, createdAt: serverTimestamp() };
      await setDoc(docRef, userData, { merge: true });
      console.log("[FirebaseStore.createUser] Done:", mobile);
      return userData;
    } catch (err) {
      console.error("[FirebaseStore.createUser] Error:", err.code, err.message);
      return { mobile, role, name, createdAt: new Date() };
    }
  },

  // ── updateName ────────────────────────────────────────────────────────────
  updateName: async (mobile, newName) => {
    console.log("[FirebaseStore.updateName] Updating name for:", mobile, "→", newName);
    try {
      const docRef = doc(db, "users", mobile);
      await updateDoc(docRef, { name: newName });
      console.log("[FirebaseStore.updateName] Done.");
      return true;
    } catch (err) {
      console.error("[FirebaseStore.updateName] Error:", err.code, err.message);
      return false;
    }
  }
};

// ─── Signal readiness to the app ─────────────────────────────────────────────
console.log("[Firebase] FirebaseStore ready — dispatching 'firebase-ready'");
window.dispatchEvent(new Event('firebase-ready'));
