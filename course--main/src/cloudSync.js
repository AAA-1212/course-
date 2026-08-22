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
  draft: ['shared', 'draft'],
}

/** مسار مستند المكتبة في Firestore: collection/document = shared/library */
export const FIRESTORE_LIBRARY_DOC_PATH = CLOUD_PATHS.library.join('/')

// Firestore لا يدعم nested arrays — نحفظ coursePlan كقائمة كائنات
export const encodeCoursePlanForCloud = (coursePlan) =>
  (Array.isArray(coursePlan) ? coursePlan : []).map((day, dayIndex) => ({
    dayIndex,
    slots: Array.isArray(day) ? day : [],
  }))

export const decodeCoursePlanFromCloud = (encoded) => {
  if (!Array.isArray(encoded) || !encoded.length) {
    return []
  }
  // توافق قديم إن وُجدت مصفوفات متداخلة محلياً فقط
  if (Array.isArray(encoded[0])) {
    return encoded.map((day) => (Array.isArray(day) ? day : []))
  }
  const maxDay = encoded.reduce(
    (max, item) =>
      Math.max(max, typeof item?.dayIndex === 'number' ? item.dayIndex : -1),
    -1,
  )
  if (maxDay < 0) {
    return []
  }
  const days = Array.from({ length: maxDay + 1 }, () => [])
  encoded.forEach((item) => {
    if (typeof item?.dayIndex === 'number') {
      days[item.dayIndex] = Array.isArray(item.slots) ? item.slots : []
    }
  })
  return days
}

const encodeHistoryItemsForCloud = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    coursePlan: encodeCoursePlanForCloud(item?.coursePlan),
  }))

const decodeHistoryItemsFromCloud = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    coursePlan: decodeCoursePlanFromCloud(item?.coursePlan),
  }))

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
    throw new Error('Firestore غير مهيأ')
  }
  const docPath = FIRESTORE_LIBRARY_DOC_PATH
  const payload = {
    exerciseLibrary,
    customSections,
    catalogVersion,
    updatedAt: serverTimestamp(),
    savedAt: new Date().toISOString(),
  }
  console.debug('[Firestore DEBUG] setDoc start →', docPath, {
    exerciseCount: Array.isArray(exerciseLibrary) ? exerciseLibrary.length : 0,
    sectionCount: Array.isArray(customSections) ? customSections.length : 0,
  })
  await setDoc(doc(db, ...CLOUD_PATHS.library), payload, { merge: true })
  console.debug('[Firestore DEBUG] setDoc OK →', docPath)
  return { docPath, exerciseCount: payload.exerciseLibrary?.length ?? 0 }
}

export const writeHistoryCloud = async (items) => {
  const db = getFirebaseDb()
  if (!db) {
    return
  }
  await setDoc(
    doc(db, ...CLOUD_PATHS.history),
    {
      items: encodeHistoryItemsForCloud(items),
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export const normalizeHistoryCloudData = (data) => {
  if (!data) {
    return null
  }
  return {
    ...data,
    items: decodeHistoryItemsFromCloud(data.items),
  }
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

export const writeDraftCloud = async (draft) => {
  const db = getFirebaseDb()
  if (!db) {
    return
  }
  const { coursePlan, ...rest } = draft || {}
  await setDoc(
    doc(db, ...CLOUD_PATHS.draft),
    {
      ...rest,
      coursePlan: encodeCoursePlanForCloud(coursePlan),
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export const normalizeDraftCloudData = (data) => {
  if (!data) {
    return null
  }
  return {
    ...data,
    coursePlan: decodeCoursePlanFromCloud(data.coursePlan),
  }
}

export const isRemoteNewer = (remoteUpdatedAt, localSavedAt) =>
  toMillis(remoteUpdatedAt) > toMillis(localSavedAt)
