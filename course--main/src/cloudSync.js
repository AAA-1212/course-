import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { ensureFirebaseSignedIn, getFirebaseDb, isFirebaseConfigured } from './firebase'

export const CLOUD_PATHS = {
  library: ['shared', 'library'],
  history: ['shared', 'history'],
  access: ['shared', 'access'],
}

const toMillis = (value) => {
  if (!value) {
    return 0
  }
  if (typeof value.toMillis === 'function') {
    return value.toMillis()
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const connectCloudSync = async () => {
  if (!isFirebaseConfigured()) {
    return { ok: false, reason: 'missing-config' }
  }

  const db = getFirebaseDb()
  if (!db) {
    return { ok: false, reason: 'missing-config' }
  }

  try {
    await ensureFirebaseSignedIn()
  } catch (error) {
    return {
      ok: false,
      reason: 'auth-failed',
      error,
      message: error?.message || 'Anonymous Auth failed',
    }
  }

  try {
    // تحقق مبكر من صلاحيات القراءة/الكتابة قبل اعتبار السحابة جاهزة
    await setDoc(
      doc(db, ...CLOUD_PATHS.access),
      { __pingAt: new Date().toISOString() },
      { merge: true },
    )
    await getDoc(doc(db, ...CLOUD_PATHS.access))
  } catch (error) {
    const code = error?.code || ''
    if (code === 'permission-denied') {
      return {
        ok: false,
        reason: 'permission-denied',
        error,
        message:
          'Firestore Rules تمنع الكتابة. انشر قواعد firestore.rules من Firebase Console.',
      }
    }
    return {
      ok: false,
      reason: 'firestore-failed',
      error,
      message: error?.message || 'Firestore connection failed',
    }
  }

  return { ok: true, db }
}

export const subscribeSharedDoc = (pathParts, onData, onError) => {
  const db = getFirebaseDb()
  if (!db) {
    return () => {}
  }

  const ref = doc(db, ...pathParts)
  return onSnapshot(
    ref,
    (snapshot) => {
      onData(snapshot.exists() ? snapshot.data() : null, snapshot)
    },
    (error) => {
      if (onError) {
        onError(error)
      }
    },
  )
}

export const readSharedDoc = async (pathParts) => {
  const db = getFirebaseDb()
  if (!db) {
    return null
  }
  const snapshot = await getDoc(doc(db, ...pathParts))
  return snapshot.exists() ? snapshot.data() : null
}

export const writeLibraryCloud = async ({
  exerciseLibrary,
  customSections,
  catalogVersion,
}) => {
  const db = getFirebaseDb()
  if (!db) {
    return
  }
  await setDoc(
    doc(db, ...CLOUD_PATHS.library),
    {
      exerciseLibrary,
      customSections,
      catalogVersion,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export const writeHistoryCloud = async (items) => {
  const db = getFirebaseDb()
  if (!db) {
    return
  }
  await setDoc(
    doc(db, ...CLOUD_PATHS.history),
    {
      items: Array.isArray(items) ? items : [],
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export const writeAccessCloud = async (config) => {
  const db = getFirebaseDb()
  if (!db) {
    return
  }
  await setDoc(
    doc(db, ...CLOUD_PATHS.access),
    {
      enabled: Boolean(config?.enabled && config?.pinHash),
      pinHash: typeof config?.pinHash === 'string' ? config.pinHash : '',
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export const isRemoteNewer = (remoteUpdatedAt, localSavedAt) =>
  toMillis(remoteUpdatedAt) > toMillis(localSavedAt)
