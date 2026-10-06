// Reemplaza estos valores por los de Firebase Console -> Configuración del proyecto -> Tu app web.
const firebaseConfig = {
  apiKey: "AIzaSyAZQ7l4pYrBvsiHf6gSBeee8AOd05C_Zq0",
  authDomain: "aulafix-uleam-1c1f5.firebaseapp.com",
  projectId: "aulafix-uleam-1c1f5",
  storageBucket: "aulafix-uleam-1c1f5.firebasestorage.app",
  messagingSenderId: "48417144681",
  appId: "1:48417144681:web:ccf3f55b88177bda6dc7f8",
  measurementId: "G-T7ETENGMF2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
