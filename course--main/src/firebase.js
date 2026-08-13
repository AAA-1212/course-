import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const isFirebaseConfigured = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )

let app = null
let auth = null
let db = null

export const getFirebaseApp = () => {
  if (!isFirebaseConfigured()) {
    return null
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export const getFirebaseAuth = () => {
  if (!getFirebaseApp()) {
    return null
  }
  if (!auth) {
    auth = getAuth(app)
  }
  return auth
}

export const getFirebaseDb = () => {
  if (!getFirebaseApp()) {
    return null
  }
  if (!db) {
    db = getFirestore(app)
  }
  return db
}

export const ensureFirebaseSignedIn = () =>
  new Promise((resolve, reject) => {
    const firebaseAuth = getFirebaseAuth()
    if (!firebaseAuth) {
      resolve(null)
      return
    }

    if (firebaseAuth.currentUser) {
      resolve(firebaseAuth.currentUser)
      return
    }

    let settled = false
    const finish = (value) => {
      if (settled) {
        return
      }
      settled = true
      stop()
      resolve(value)
    }
    const fail = (error) => {
      if (settled) {
        return
      }
      settled = true
      stop()
      reject(error)
    }

    const stop = onAuthStateChanged(
      firebaseAuth,
      async (user) => {
        try {
          if (user) {
            finish(user)
            return
          }
          const result = await signInAnonymously(firebaseAuth)
          finish(result.user)
        } catch (error) {
          fail(error)
        }
      },
      fail,
    )
  })
