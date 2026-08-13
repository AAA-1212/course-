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
}

const marker = `share-${Date.now()}`
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

try {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log('1) Anonymous Auth')
  const cred = await signInAnonymously(auth)
  assert(Boolean(cred.user?.uid), 'missing uid')
  console.log('   OK', cred.user.uid)

  const libraryPayload = {
    exerciseLibrary: [
      {
        id: `ex-${marker}`,
        name: `تمرين تحقق ${marker}`,
        sectionId: 'chest',
        notes: 'verify-share',
        isCustom: true,
      },
    ],
    customSections: [
      {
        id: `sec-${marker}`,
        labelAr: `قسم ${marker}`,
        labelEn: `Sec ${marker}`,
        isCustom: true,
      },
    ],
    catalogVersion: 3,
    __shareMarker: marker,
    updatedAt: serverTimestamp(),
    savedAt: new Date().toISOString(),
  }

  const historyPayload = {
    items: [
      {
        id: `course-${marker}`,
        source: 'verify',
        updatedAt: new Date().toISOString(),
        formData: { playerName: `لاعب ${marker}` },
        coursePlan: [
          {
            dayIndex: 0,
            slots: [
              {
                slotId: `slot-h-${marker}`,
                exerciseIds: [`ex-${marker}`],
                prescription: '4 x 8',
              },
            ],
          },
        ],
      },
    ],
    __shareMarker: marker,
    updatedAt: serverTimestamp(),
    savedAt: new Date().toISOString(),
  }

  const accessPayload = {
    enabled: false,
    pinHash: '',
    __shareMarker: marker,
    updatedAt: serverTimestamp(),
    savedAt: new Date().toISOString(),
  }

  const draftPayload = {
    formData: {
      playerName: `لاعب ${marker}`,
      weight: '80',
      height: '180',
      goal: 'verify',
      daysCount: '4',
    },
    // Firestore لا يدعم nested arrays
    coursePlan: [
      {
        dayIndex: 0,
        slots: [
          {
            slotId: `slot-${marker}`,
            exerciseIds: [`ex-${marker}`],
            prescription: '3 x 10',
          },
        ],
      },
    ],
    scheduleMode: 'pattern',
    workoutPatternId: 'upper-lower',
    selectedWeekDayIds: ['sat', 'mon'],
    customDayLabels: [`يوم-${marker}`],
    activeHistoryId: `course-${marker}`,
    catalogVersion: 3,
    __shareMarker: marker,
    updatedAt: serverTimestamp(),
    savedAt: new Date().toISOString(),
  }

  console.log('2) Write all shared docs')
  await Promise.all([
    setDoc(doc(db, 'shared', 'library'), libraryPayload, { merge: true }),
    setDoc(doc(db, 'shared', 'history'), historyPayload, { merge: true }),
    setDoc(doc(db, 'shared', 'access'), accessPayload, { merge: true }),
    setDoc(doc(db, 'shared', 'draft'), draftPayload, { merge: true }),
  ])
  console.log('   OK write')

  console.log('3) Read and verify all shared docs')
  const [librarySnap, historySnap, accessSnap, draftSnap] = await Promise.all([
    getDoc(doc(db, 'shared', 'library')),
    getDoc(doc(db, 'shared', 'history')),
    getDoc(doc(db, 'shared', 'access')),
    getDoc(doc(db, 'shared', 'draft')),
  ])

  assert(librarySnap.exists(), 'library missing')
  assert(historySnap.exists(), 'history missing')
  assert(accessSnap.exists(), 'access missing')
  assert(draftSnap.exists(), 'draft missing')

  const library = librarySnap.data()
  const history = historySnap.data()
  const access = accessSnap.data()
  const draft = draftSnap.data()

  assert(library.__shareMarker === marker, 'library marker mismatch')
  assert(
    Array.isArray(library.exerciseLibrary) &&
      library.exerciseLibrary.some((item) => item.id === `ex-${marker}`),
    'library exercise missing',
  )
  assert(
    Array.isArray(library.customSections) &&
      library.customSections.some((item) => item.id === `sec-${marker}`),
    'library section missing',
  )

  assert(history.__shareMarker === marker, 'history marker mismatch')
  assert(
    Array.isArray(history.items) &&
      history.items.some((item) => item.id === `course-${marker}`),
    'history item missing',
  )

  assert(access.__shareMarker === marker, 'access marker mismatch')

  assert(draft.__shareMarker === marker, 'draft marker mismatch')
  assert(draft.formData?.playerName === `لاعب ${marker}`, 'draft player missing')
  assert(Array.isArray(draft.coursePlan), 'draft coursePlan missing')
  assert(
    Array.isArray(draft.customDayLabels) &&
      draft.customDayLabels.includes(`يوم-${marker}`),
    'draft custom day missing',
  )

  console.log('   OK library / history / access / draft')
  console.log('\nFIREBASE_SHARE_OK')
  console.log(
    JSON.stringify(
      {
        projectId: firebaseConfig.projectId,
        docs: ['shared/library', 'shared/history', 'shared/access', 'shared/draft'],
        marker,
      },
      null,
      2,
    ),
  )
  process.exit(0)
} catch (error) {
  console.error('\nFIREBASE_SHARE_FAIL')
  console.error(error?.code || '', error?.message || error)
  process.exit(1)
}
