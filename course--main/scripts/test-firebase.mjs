import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const loadEnv = (filePath) => {
  const text = readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

const env = loadEnv(resolve(process.cwd(), '.env'))
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

const required = ['apiKey', 'authDomain', 'projectId', 'appId']
for (const key of required) {
  if (!firebaseConfig[key]) {
    console.error(`Missing config: ${key}`)
    process.exit(1)
  }
}

const marker = `probe-${Date.now()}`

try {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log('1) Anonymous sign-in...')
  const cred = await signInAnonymously(auth)
  console.log('   OK uid=', cred.user.uid)

  console.log('2) Write shared/library probe...')
  const libraryRef = doc(db, 'shared', 'library')
  await setDoc(
    libraryRef,
    {
      __connectionProbe: marker,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
  console.log('   OK write')

  console.log('3) Read shared/library...')
  const snap = await getDoc(libraryRef)
  if (!snap.exists()) {
    throw new Error('Document missing after write')
  }
  const data = snap.data()
  if (data.__connectionProbe !== marker) {
    throw new Error('Probe marker mismatch on read')
  }
  console.log('   OK read marker=', data.__connectionProbe)

  console.log('4) Write shared/history + shared/access smoke...')
  await setDoc(
    doc(db, 'shared', 'history'),
    {
      items: Array.isArray(data.items) ? data.items : [],
      __connectionProbe: marker,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
  await setDoc(
    doc(db, 'shared', 'access'),
    {
      enabled: Boolean(data.enabled && data.pinHash),
      pinHash: typeof data.pinHash === 'string' ? data.pinHash : '',
      __connectionProbe: marker,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
  console.log('   OK')

  console.log('\nFIREBASE_OK')
  process.exit(0)
} catch (error) {
  console.error('\nFIREBASE_FAIL')
  console.error(error?.code || '', error?.message || error)
  process.exit(1)
}
