// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJ8CVC2s_cb8nBdbrhPCbVbqqh6Cb9Vco",
    authDomain: "luna-bot-70962.firebaseapp.com",
    projectId: "luna-bot-70962",
    storageBucket: "luna-bot-70962.appspot.com",
    messagingSenderId: "247837414432",
    appId: "1:247837414432:web:f7f9df049b8cfdbd909845",
    measurementId: "G-8Q1L3CS37J"
};

// Configure auth domain for Replit development
if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('repl.co')) {
    firebaseConfig.authDomain = window.location.hostname;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth functions
export const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    return signInWithRedirect(auth, provider);
};

export const loginWithEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const signupWithEmail = (email, password, displayName) => {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            return updateProfile(userCredential.user, { displayName });
        });
};

export const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
};

export const logoutUser = () => {
    return signOut(auth);
};

export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            const user = result.user;
            console.log('User signed in:', user);
            await createUserProfile(user);
            return user;
        }
    } catch (error) {
        console.error('Error handling redirect:', error);
        throw error;
    }
};

// User profile functions
export const createUserProfile = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email)}`,
            username: user.email ? user.email.split('@')[0] : `user_${user.uid.substring(0, 5)}`,
            bio: '',
            skills: [],
            location: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, userData);
        return userData;
    }

    return userDoc.data();
};

export const updateUserProfile = async (userId, profileData) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
    });
};

export const getUserProfile = async (userId) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
};

export const getAllUsers = async () => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Testimonials functions
export const getTestimonials = async () => {
    const testimonialsRef = collection(db, 'testimonials');
    const q = query(testimonialsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTestimonial = async (testimonialData) => {
    const testimonialsRef = collection(db, 'testimonials');
    return await addDoc(testimonialsRef, {
        ...testimonialData,
        createdAt: serverTimestamp()
    });
};

// Opportunities functions
export const getOpportunities = async () => {
    const opportunitiesRef = collection(db, 'opportunities');
    const q = query(opportunitiesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addOpportunity = async (opportunityData) => {
    const opportunitiesRef = collection(db, 'opportunities');
    return await addDoc(opportunitiesRef, {
        ...opportunityData,
        createdAt: serverTimestamp()
    });
};

export const deleteOpportunity = async (opportunityId) => {
    const opportunityRef = doc(db, 'opportunities', opportunityId);
    await deleteDoc(opportunityRef);
};

// Gratitude messages functions
export const getGratitudeMessages = async () => {
    const gratitudeRef = collection(db, 'gratitude');
    const q = query(gratitudeRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addGratitudeMessage = async (messageData) => {
    const gratitudeRef = collection(db, 'gratitude');
    return await addDoc(gratitudeRef, {
        ...messageData,
        createdAt: serverTimestamp()
    });
};

// Gallery functions
export const getGalleryItems = async () => {
    const galleryRef = collection(db, 'gallery');
    const q = query(galleryRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addGalleryItem = async (itemData) => {
    const galleryRef = collection(db, 'gallery');
    return await addDoc(galleryRef, {
        ...itemData,
        createdAt: serverTimestamp()
    });
};

export const deleteGalleryItem = async (itemId) => {
    const itemRef = doc(db, 'gallery', itemId);
    await deleteDoc(itemRef);
};

// Storage functions
export const uploadFile = async (file, path) => {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const deleteFile = async (filePath) => {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
};

// Real-time listeners
export const listenToCollection = (collectionName, callback) => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};

// Auth state observer
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Initialize auth state handling on page load
window.addEventListener('load', () => {
    handleRedirectResult().catch(console.error);
});

// Admin functions
export const isAdmin = async (userId) => {
    // Define admin user IDs here or check from Firestore
    const adminUsers = ['admin@dafejy.com']; // Add actual admin emails
    const userProfile = await getUserProfile(userId);
    return adminUsers.includes(userProfile?.email);
};

export const getStats = async () => {
    const collections = ['users', 'testimonials', 'opportunities', 'gallery'];
    const stats = {};

    for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        stats[collectionName] = snapshot.size;
    }

    return stats;
};

// Export default object for easier imports
export default {
    auth,
    db,
    storage,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    resetPassword,
    logoutUser,
    handleRedirectResult,
    createUserProfile,
    updateUserProfile,
    getUserProfile,
    getAllUsers,
    getTestimonials,
    addTestimonial,
    getOpportunities,
    addOpportunity,
    deleteOpportunity,
    getGratitudeMessages,
    addGratitudeMessage,
    getGalleryItems,
    addGalleryItem,
    deleteGalleryItem,
    uploadFile,
    deleteFile,
    listenToCollection,
    onAuthStateChange,
    isAdmin,
    getStats
};