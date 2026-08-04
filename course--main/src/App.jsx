import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import './App.css'

const CENTER_NAME = 'مركز القمة كلاسك'
const COACH_TITLE = 'المدرب والحكم الدولي حيدر ياسر الدخيل'
const DEVELOPER_NAME = 'عبدالرزاق محمد ذنون'
const DEVELOPER_PHONE = '07835900092'
const DEVELOPER_TITLE = 'مطور الموقع'
const DRAFT_STORAGE_KEY = 'coach-course-draft-v3'
const HISTORY_STORAGE_KEY = 'coach-course-history-v1'
// مفاتيح ثابتة — لا تغيّرها حتى تبقى بيانات الجهاز بعد تحديث GitHub/Netlify
const LIBRARY_STORAGE_KEY = 'coach-exercise-library-v1'
const LEGACY_DRAFT_KEYS = ['coach-course-draft-v2', 'coach-course-draft-v1']
const CATALOG_VERSION = 3
// مقاس A4 للتصميم والتصدير
const A4_WIDTH_PX = 2480
const A4_HEIGHT_PX = 3508
const SHEET_EXPORT_WIDTH_PX = 794
const A4_DESIGN_HEIGHT_PX = 1123
const EXPORT_PIXEL_RATIO = 2

const SHEET_DENSITY_LEVELS = ['roomy', 'comfortable', 'balanced', 'compact', 'tight']
const MAX_SUPERSET_SIZE = 4
const SUPERSET_ORDINAL_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع']
const SUPERSET_SIZE_LABEL_AR = {
  2: 'ثنائي',
  3: 'ثلاثي',
  4: 'رباعي',
}
const SUPERSET_PICK_MODES = [
  { mode: 'superset-2', size: 2, label: 'سوبر ست ثنائي' },
  { mode: 'superset-3', size: 3, label: 'سوبر ست ثلاثي' },
  { mode: 'superset-4', size: 4, label: 'سوبر ست رباعي' },
]

const getSupersetSizeFromMode = (mode) => {
  if (mode === 'superset-2' || mode === 'superset') {
    return 2
  }
  if (mode === 'superset-3') {
    return 3
  }
  if (mode === 'superset-4') {
    return 4
  }
  return 0
}

const isSupersetPickMode = (mode) => getSupersetSizeFromMode(mode) > 0

const getSheetDensityByCount = (exerciseCount) => {
  if (exerciseCount <= 6) {
    return 'roomy'
  }
  if (exerciseCount <= 12) {
    return 'comfortable'
  }
  if (exerciseCount <= 20) {
    return 'balanced'
  }
  if (exerciseCount <= 30) {
    return 'compact'
  }
  return 'tight'
}

const waitNextPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })

const measureNodeHeight = (node) =>
  Math.ceil(
    Math.max(
      node.scrollHeight,
      node.offsetHeight,
      node.getBoundingClientRect().height,
    ),
  )

const defaultMuscleSections = [
  { id: 'chest', labelAr: 'الصدر', labelEn: 'Chest' },
  { id: 'back', labelAr: 'الظهر', labelEn: 'Back' },
  { id: 'shoulders', labelAr: 'الأكتاف', labelEn: 'Shoulders' },
  { id: 'biceps', labelAr: 'البايسبس', labelEn: 'Biceps' },
  { id: 'triceps', labelAr: 'الترايسبس', labelEn: 'Triceps' },
  { id: 'legs', labelAr: 'الأرجل', labelEn: 'Legs' },
  { id: 'abs', labelAr: 'البطن', labelEn: 'Abs' },
  { id: 'forearms', labelAr: 'الساعد', labelEn: 'Forearms' },
  { id: 'traps', labelAr: 'الترابيس', labelEn: 'Traps' },
]

const exerciseCatalog = [
  // الصدر
  ['chest', 'بنج اعلى همر'],
  ['chest', 'جمع فراشه فلاي'],
  ['chest', 'بنج اعلى دمبلص'],
  ['chest', 'فتح دمبلص اعلى'],
  ['chest', 'بنج مستوي وسط'],
  ['chest', 'بنج همر اسفل'],
  ['chest', 'بلوفر جهاز ضيق'],
  ['chest', 'بنج اسفل همر'],
  ['chest', 'فتح دمبلص حول العالم اسفل'],
  ['chest', 'بنج بريس اعلى همر'],
  ['chest', 'جمع اسلاك نائم اعلى'],
  ['chest', 'بلوفر دمبلص عكس المقعد'],
  // الظهر
  ['back', 'سحب اسناد متقابل'],
  ['back', 'سحب همر مفرد جالس'],
  ['back', 'سحب بكرة متشابك من الاعلى'],
  ['back', 'عقلة امام عريض'],
  ['back', 'سحب بكره امام من الاعلى وسط'],
  ['back', 'سحب همر جالس متقابل'],
  ['back', 'سحب همر منحني مفرد'],
  ['back', 'سحب بكره خلفي عريض'],
  ['back', 'سحب حبل بلوفر واقف'],
  ['back', 'سحب همر مفرد من الاسفل'],
  // الأكتاف
  ['shoulders', 'ضغط دمبلص اكتاف جالس'],
  ['shoulders', 'نشر باك دك'],
  ['shoulders', 'ضغط اكتاف جهاز للداخل'],
  ['shoulders', 'نشر دمبلص مفرد للامام مطرقة'],
  ['shoulders', 'نشر دمبلص جانبي واقف'],
  ['shoulders', 'نشر دمبلص منحني'],
  ['shoulders', 'نشر سلك مفرد للامام'],
  ['shoulders', 'ضغط امام وسط'],
  ['shoulders', 'نشر دمبلص مفرد للجانب'],
  ['shoulders', 'ضغط خلفي عريض'],
  // البايسبس
  ['biceps', 'كيل جهاز قائم وسط'],
  ['biceps', 'كيل حديد وسط واقف'],
  ['biceps', 'كيل لاري سونيك'],
  ['biceps', 'كيل دمبلص مفرد تركيز'],
  ['biceps', 'كيل سلك قرفصاء'],
  // الترايسبس
  ['triceps', 'برليك'],
  ['triceps', 'ترايسبس حديد EZ واقف ضيق'],
  ['triceps', 'ترايسبس بش داون محربة'],
  ['triceps', 'ترايسبس دمبلص معاً'],
  ['triceps', 'ترايسبس بش داون مفرد حبل'],
  ['triceps', 'ترايسبس جهاز جالس خلف الرأس'],
  // الأرجل
  ['legs', 'ترايسبس سيقان', 'الأماميات / Leg Extensions'],
  ['legs', 'لك بريس وسط'],
  ['legs', 'لك بريس وسط جالس من الاعلى'],
  ['legs', 'دبني خلفي عريض'],
  ['legs', 'نشر حبل بين الساقين', 'تقاطعات الأرجل / أدوات السحب'],
  ['legs', 'كيل سيقان نائم', 'الخلفيات / Leg Curls'],
  ['legs', 'دواخل جهاز'],
  ['legs', 'خواص جهاز', 'الخوارج'],
  ['legs', 'كولف', 'السمانة'],
  // الساعد
  ['forearms', 'ساعد'],
  // الترابيس
  ['traps', 'سحب مثلث الاكتاف بالدمبلص'],
  ['traps', 'سحب مثلث الاكتاف ضيق'],
  ['traps', 'هز الاكتاف بالبار'],
]

const initialExercises = exerciseCatalog.map(([sectionId, name, notes], index) => ({
  id: `ex-${sectionId}-${index + 1}`,
  name,
  sectionId,
  notes: notes || '',
}))

const normalizeText = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\u064B-\u0652]/g, '')

const weekDays = [
  { id: 'sat', label: 'السبت' },
  { id: 'sun', label: 'الأحد' },
  { id: 'mon', label: 'الاثنين' },
  { id: 'tue', label: 'الثلاثاء' },
  { id: 'wed', label: 'الأربعاء' },
  { id: 'thu', label: 'الخميس' },
  { id: 'fri', label: 'الجمعة' },
]

const workoutPatterns = [
  { id: 'three-on-one', label: '3 أيام تمرين + يوم راحة', trainDays: 3, restDays: 1 },
  { id: 'two-on-one', label: 'يومين تمرين + يوم راحة', trainDays: 2, restDays: 1 },
  {
    id: 'two-rest-two',
    label: 'يومين تمرين + راحة + يومين تمرين + راحة',
    trainDays: 4,
    restDays: 1,
    restEvery: 2,
  },
  { id: 'four-on-one', label: '4 أيام تمرين + يوم راحة', trainDays: 4, restDays: 1 },
  { id: 'one-on-one', label: 'يوم تمرين + يوم راحة', trainDays: 1, restDays: 1 },
  { id: 'five-on-two', label: '5 أيام تمرين + يومين راحة', trainDays: 5, restDays: 2 },
]

const dayThemeColors = [
  { accent: '#c62828', soft: '#ffebee', header: '#d32f2f' },
  { accent: '#1565c0', soft: '#e3f2fd', header: '#1e88e5' },
  { accent: '#2e7d32', soft: '#e8f5e9', header: '#43a047' },
  { accent: '#6d4c41', soft: '#efebe9', header: '#8d6e63' },
  { accent: '#6a1b9a', soft: '#f3e5f5', header: '#8e24aa' },
  { accent: '#00838f', soft: '#e0f7fa', header: '#00acc1' },
  { accent: '#ef6c00', soft: '#fff3e0', header: '#fb8c00' },
]

const emptyExerciseDraft = {
  name: '',
  sectionId: 'chest',
  notes: '',
}

const getSectionById = (sectionId, sections = defaultMuscleSections) =>
  sections.find((section) => section.id === sectionId) ??
  sections[0] ??
  defaultMuscleSections[0]

const getSectionFullLabel = (sectionId, sections = defaultMuscleSections) => {
  const section = getSectionById(sectionId, sections)
  return `${section.labelAr} (${section.labelEn})`
}

const resolveSectionId = (exercise, sections = defaultMuscleSections) => {
  if (exercise?.sectionId && sections.some((section) => section.id === exercise.sectionId)) {
    return exercise.sectionId
  }

  const source = normalizeText(`${exercise?.focus || ''} ${exercise?.name || ''}`)
  if (source.includes('ساعد') || source.includes('forearm')) {
    return 'forearms'
  }
  if (
    source.includes('ترابيس') ||
    source.includes('trap') ||
    source.includes('مثلث') ||
    source.includes('هزالاكتاف')
  ) {
    return 'traps'
  }
  if (
    source.includes('رجل') ||
    source.includes('ارجل') ||
    source.includes('سيقان') ||
    source.includes('ساقي') ||
    source.includes('leg') ||
    source.includes('سكوات') ||
    source.includes('دبني') ||
    source.includes('كولف') ||
    source.includes('لكبريس') ||
    source.includes('خواص') ||
    source.includes('دواخل')
  ) {
    return 'legs'
  }
  if (source.includes('صدر') || source.includes('chest') || source.includes('بنش') || source.includes('بنج')) {
    return 'chest'
  }
  if (source.includes('ظهر') || source.includes('back') || source.includes('سحب') || source.includes('عقلة')) {
    return 'back'
  }
  if (source.includes('كتف') || source.includes('اكتاف') || source.includes('shoulder') || source.includes('نشر')) {
    return 'shoulders'
  }
  if (source.includes('باي') || source.includes('bicep') || source.includes('كيل')) {
    return 'biceps'
  }
  if (source.includes('تراي') || source.includes('tricep') || source.includes('برليك')) {
    return 'triceps'
  }
  if (
    source.includes('بطن') ||
    source.includes('كور') ||
    source.includes('abs') ||
    source.includes('بلانك') ||
    source.includes('كرانش')
  ) {
    return 'abs'
  }

  // Match against custom section Arabic labels
  const matchedCustom = sections.find((section) =>
    source.includes(normalizeText(section.labelAr)),
  )
  if (matchedCustom) {
    return matchedCustom.id
  }

  return sections[0]?.id || 'chest'
}

const normalizeExercise = (exercise, sections = defaultMuscleSections) => {
  const sectionId = resolveSectionId(exercise, sections)
  const section = getSectionById(sectionId, sections)
  return {
    id: exercise?.id || `ex-${sectionId}-${Date.now()}`,
    name: String(exercise?.name ?? '').trim(),
    notes: String(exercise?.notes ?? ''),
    sectionId,
    focus: section.labelAr,
  }
}

const getExerciseKey = (exercise) =>
  `${exercise.sectionId}::${normalizeText(exercise.name)}`

const buildSeedLibrary = (sections = defaultMuscleSections) =>
  initialExercises
    .map((exercise) => normalizeExercise(exercise, sections))
    .filter((exercise) => exercise.name)

const mergeWithCatalog = (library = [], sections = defaultMuscleSections) => {
  const merged = []
  const seen = new Set()

  ;[...(Array.isArray(library) ? library : []), ...buildSeedLibrary(sections)].forEach(
    (item) => {
      const normalized = normalizeExercise(item, sections)
      if (!normalized.name) {
        return
      }
      const key = getExerciseKey(normalized)
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      merged.push(normalized)
    },
  )

  return merged
}

const mergeCustomSections = (extraSections = []) => {
  const seen = new Set(defaultMuscleSections.map((section) => section.id))
  const extras = (Array.isArray(extraSections) ? extraSections : [])
    .filter(
      (section) =>
        section &&
        typeof section.id === 'string' &&
        typeof section.labelAr === 'string' &&
        section.labelAr.trim() &&
        !seen.has(section.id),
    )
    .map((section) => ({
      id: section.id,
      labelAr: section.labelAr.trim(),
      labelEn: String(section.labelEn || section.labelAr).trim(),
      isCustom: true,
    }))
  return [...defaultMuscleSections, ...extras]
}

const isSubsequenceMatch = (target, query) => {
  let queryIndex = 0
  for (let index = 0; index < target.length; index += 1) {
    if (target[index] === query[queryIndex]) {
      queryIndex += 1
    }
    if (queryIndex === query.length) {
      return true
    }
  }
  return false
}

const createEmptyCoursePlan = (daysCount) =>
  Array.from({ length: daysCount }, () => [])

const normalizeDayExercises = (dayExercises) =>
  (Array.isArray(dayExercises) ? dayExercises : [])
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          slotId: `slot-${item}-${index}`,
          exerciseIds: [item],
          prescription: '',
        }
      }
      if (!item || typeof item !== 'object') {
        return null
      }

      const exerciseIds = []
      if (Array.isArray(item.exerciseIds)) {
        item.exerciseIds.forEach((id) => {
          if (typeof id === 'string' && id && !exerciseIds.includes(id)) {
            exerciseIds.push(id)
          }
        })
      } else if (typeof item.exerciseId === 'string' && item.exerciseId) {
        exerciseIds.push(item.exerciseId)
        if (
          typeof item.pairedExerciseId === 'string' &&
          item.pairedExerciseId &&
          item.pairedExerciseId !== item.exerciseId
        ) {
          exerciseIds.push(item.pairedExerciseId)
        }
      }

      if (!exerciseIds.length) {
        return null
      }

      return {
        slotId:
          typeof item.slotId === 'string' && item.slotId
            ? item.slotId
            : `slot-${exerciseIds.join('-')}-${index}`,
        exerciseIds: exerciseIds.slice(0, MAX_SUPERSET_SIZE),
        prescription: item.prescription ?? '',
      }
    })
    .filter(Boolean)

const daySlotIncludesExercise = (slot, exerciseId) =>
  Array.isArray(slot?.exerciseIds) && slot.exerciseIds.includes(exerciseId)

const isSupersetSlot = (slot) =>
  Array.isArray(slot?.exerciseIds) && slot.exerciseIds.length > 1

const getDaySlotDisplayName = (slot, getExerciseById) => {
  if (!slot?.exerciseIds?.length) {
    return ''
  }
  return slot.exerciseIds
    .map((id) => getExerciseById(id)?.name)
    .filter(Boolean)
    .join(' + ')
}

const getSafeDaysCount = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return 1
  }
  return Math.min(30, Math.max(1, parsed))
}

const countPlanExercises = (coursePlan) =>
  (Array.isArray(coursePlan) ? coursePlan : []).reduce(
    (total, dayExercises) => total + normalizeDayExercises(dayExercises ?? []).length,
    0,
  )

const formatHistoryDate = (value) => {
  try {
    return new Date(value).toLocaleString('ar-IQ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return value || '—'
  }
}

const loadHistoryFromStorage = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.createdAt || 0).getTime(),
      )
  } catch {
    return []
  }
}

const persistHistoryToStorage = (history) => {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
}

function App() {
  const [formData, setFormData] = useState({
    playerName: '',
    startDate: new Date().toISOString().slice(0, 10),
    weight: '',
    height: '',
    goal: 'تنشيف + زيادة لياقة',
    daysCount: '4',
    cardioMinutes: '30',
    courseNotes: 'الراحة بين المجموعات: 60–90 ثانية\nاختر وزن مناسب يحافظ على الأداء الصحيح\nسخّن الجسم جيدًا قبل البدء',
  })
  const [exerciseLibrary, setExerciseLibrary] = useState(() => buildSeedLibrary())
  const [customSections, setCustomSections] = useState([])
  const [sectionDraft, setSectionDraft] = useState({ labelAr: '', labelEn: '' })
  const [courseHistory, setCourseHistory] = useState(() => loadHistoryFromStorage())
  const [activeHistoryId, setActiveHistoryId] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [activeTab, setActiveTab] = useState('home')
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState('pattern')
  const [workoutPatternId, setWorkoutPatternId] = useState(workoutPatterns[0].id)
  const [activeCourseDay, setActiveCourseDay] = useState(0)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [librarySectionId, setLibrarySectionId] = useState('all')
  const [courseSectionId, setCourseSectionId] = useState('all')
  const [selectedWeekDayIds, setSelectedWeekDayIds] = useState(['sat', 'mon', 'wed'])
  const [customDayInput, setCustomDayInput] = useState('')
  const [customDayLabels, setCustomDayLabels] = useState([])
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [exerciseDraft, setExerciseDraft] = useState(emptyExerciseDraft)
  const [coursePlan, setCoursePlan] = useState(createEmptyCoursePlan(4))
  const [isExporting, setIsExporting] = useState(false)
  const [exportKind, setExportKind] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewDataUrl, setPreviewDataUrl] = useState(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [coursePickMode, setCoursePickMode] = useState('normal') // normal | superset-2 | superset-3 | superset-4
  const [pendingSupersetIds, setPendingSupersetIds] = useState([])
  const exportSheetRef = useRef(null)

  const muscleSections = useMemo(
    () => mergeCustomSections(customSections),
    [customSections],
  )

  const sheetExerciseCount = useMemo(
    () => countPlanExercises(coursePlan),
    [coursePlan],
  )

  const sheetDensity = useMemo(
    () => getSheetDensityByCount(sheetExerciseCount),
    [sheetExerciseCount],
  )

  const daysCountNumber = useMemo(
    () => getSafeDaysCount(formData.daysCount),
    [formData.daysCount],
  )

  const selectedWorkoutPattern = useMemo(
    () =>
      workoutPatterns.find((pattern) => pattern.id === workoutPatternId) ??
      workoutPatterns[0],
    [workoutPatternId],
  )
  const trainingTemplateDays = useMemo(
    () =>
      scheduleMode === 'pattern'
        ? selectedWorkoutPattern.trainDays
        : daysCountNumber,
    [daysCountNumber, scheduleMode, selectedWorkoutPattern.trainDays],
  )

  const selectedCustomDayLabels = useMemo(() => {
    const baseLabels = weekDays
      .filter((day) => selectedWeekDayIds.includes(day.id))
      .map((day) => day.label)
    return [...baseLabels, ...customDayLabels]
  }, [selectedWeekDayIds, customDayLabels])

  const courseDayTitles = useMemo(() => {
    if (scheduleMode === 'pattern') {
      return Array.from(
        { length: trainingTemplateDays },
        (_, index) => `اليوم ${index + 1}`,
      )
    }
    const source = selectedCustomDayLabels.length
      ? selectedCustomDayLabels
      : ['يوم مخصص']
    return Array.from({ length: trainingTemplateDays }, (_, index) => {
      const label = source[index % source.length]
      const cycle = Math.floor(index / source.length) + 1
      return source.length < trainingTemplateDays
        ? `${label} (دورة ${cycle})`
        : label
    })
  }, [scheduleMode, selectedCustomDayLabels, trainingTemplateDays])

  useEffect(() => {
    setCoursePlan((previous) => {
      const updated = createEmptyCoursePlan(trainingTemplateDays).map(
        (_, dayIndex) => normalizeDayExercises(previous[dayIndex] ?? []),
      )
      return updated
    })
  }, [trainingTemplateDays])

  useEffect(() => {
    if (activeCourseDay >= trainingTemplateDays) {
      setActiveCourseDay(0)
    }
  }, [activeCourseDay, trainingTemplateDays])

  useEffect(() => {
    try {
      const rawDraft =
        localStorage.getItem(DRAFT_STORAGE_KEY) ||
        LEGACY_DRAFT_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
      const rawLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY)

      let restoredSections = []
      let restoredLibraryItems = []
      let draft = null

      if (rawLibrary) {
        try {
          const libraryData = JSON.parse(rawLibrary)
          if (Array.isArray(libraryData.customSections)) {
            restoredSections = [...libraryData.customSections]
          }
          if (Array.isArray(libraryData.exerciseLibrary)) {
            restoredLibraryItems = [...libraryData.exerciseLibrary]
          }
        } catch {
          // ignore broken library cache
        }
      }

      if (rawDraft) {
        draft = JSON.parse(rawDraft)
        if (Array.isArray(draft.customSections) && draft.customSections.length) {
          restoredSections = [...restoredSections, ...draft.customSections]
        }
        if (Array.isArray(draft.exerciseLibrary) && draft.exerciseLibrary.length) {
          restoredLibraryItems = [...restoredLibraryItems, ...draft.exerciseLibrary]
        }

        if (draft.formData) {
          setFormData((previous) => ({
            ...previous,
            ...draft.formData,
            playerName: '',
            weight: '',
            height: '',
          }))
        } else {
          setFormData((previous) => ({
            ...previous,
            playerName: '',
            weight: '',
            height: '',
          }))
        }
        if (Array.isArray(draft.coursePlan)) {
          setCoursePlan(draft.coursePlan.map((day) => normalizeDayExercises(day ?? [])))
        }
        if (draft.scheduleMode) {
          setScheduleMode(draft.scheduleMode)
        }
        if (draft.workoutPatternId) {
          setWorkoutPatternId(draft.workoutPatternId)
        }
        if (Array.isArray(draft.selectedWeekDayIds)) {
          setSelectedWeekDayIds(draft.selectedWeekDayIds)
        }
        if (Array.isArray(draft.customDayLabels)) {
          setCustomDayLabels(draft.customDayLabels)
        }
        if (typeof draft.activeHistoryId === 'string') {
          setActiveHistoryId(draft.activeHistoryId)
        }
      } else {
        setFormData((previous) => ({
          ...previous,
          playerName: '',
          weight: '',
          height: '',
        }))
      }

      // دمج الأقسام بدون تكرار
      const uniqueSectionsMap = new Map()
      restoredSections.forEach((section) => {
        if (section?.id && section?.labelAr) {
          uniqueSectionsMap.set(section.id, {
            id: section.id,
            labelAr: section.labelAr,
            labelEn: section.labelEn || section.labelAr,
            isCustom: true,
          })
        }
      })
      const uniqueSections = [...uniqueSectionsMap.values()]
      if (uniqueSections.length) {
        setCustomSections(uniqueSections)
      }

      const sectionsForDraft = mergeCustomSections(uniqueSections)
      setExerciseLibrary(
        mergeWithCatalog(
          restoredLibraryItems.length ? restoredLibraryItems : buildSeedLibrary(),
          sectionsForDraft,
        ),
      )

      // تأكيد بقاء السجل كما هو من التخزين المحلي للجهاز
      setCourseHistory(loadHistoryFromStorage())

      if (rawDraft || rawLibrary || loadHistoryFromStorage().length) {
        setStatusMessage('تم استرجاع المكتبة والسجل المحفوظين على هذا الجهاز')
      }
    } catch {
      setExerciseLibrary(buildSeedLibrary())
      setCourseHistory(loadHistoryFromStorage())
      setStatusMessage('تعذر قراءة بعض البيانات، تم تحميل الأساسي مع السجل المتاح')
    } finally {
      setHasHydrated(true)
    }
  }, [])

  // حفظ تلقائي على نفس الجهاز — يبقى بعد الخروج وتحديث Netlify/GitHub
  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    try {
      const libraryPayload = {
        exerciseLibrary: mergeWithCatalog(exerciseLibrary, muscleSections),
        customSections,
        catalogVersion: CATALOG_VERSION,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libraryPayload))

      const draft = {
        formData: {
          ...formData,
          playerName: '',
          weight: '',
          height: '',
        },
        exerciseLibrary: libraryPayload.exerciseLibrary,
        coursePlan,
        scheduleMode,
        workoutPatternId,
        selectedWeekDayIds,
        customDayLabels,
        customSections,
        catalogVersion: CATALOG_VERSION,
        savedAt: new Date().toISOString(),
        activeHistoryId,
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      persistHistoryToStorage(courseHistory)
    } catch {
      // تجاهل فشل التخزين المحلي
    }
  }, [
    hasHydrated,
    exerciseLibrary,
    customSections,
    coursePlan,
    scheduleMode,
    workoutPatternId,
    selectedWeekDayIds,
    customDayLabels,
    formData,
    activeHistoryId,
    muscleSections,
    courseHistory,
  ])

  const filteredExercises = useMemo(() => {
    const query = normalizeText(exerciseSearch.trim())
    return exerciseLibrary
      .map((exercise) => normalizeExercise(exercise, muscleSections))
      .filter((exercise) => {
        const matchesSection =
          librarySectionId === 'all' || exercise.sectionId === librarySectionId
        if (!matchesSection) {
          return false
        }
        if (!query) {
          return true
        }
        const sectionLabel = getSectionFullLabel(exercise.sectionId, muscleSections)
        return (
          isSubsequenceMatch(normalizeText(exercise.name), query) ||
          isSubsequenceMatch(normalizeText(sectionLabel), query) ||
          isSubsequenceMatch(normalizeText(exercise.notes), query)
        )
      })
  }, [exerciseLibrary, exerciseSearch, librarySectionId, muscleSections])

  const filteredExercisesForCourse = useMemo(() => {
    const query = normalizeText(courseSearch.trim())
    return exerciseLibrary
      .map((exercise) => normalizeExercise(exercise, muscleSections))
      .filter((exercise) => {
        const matchesSection =
          courseSectionId === 'all' || exercise.sectionId === courseSectionId
        if (!matchesSection) {
          return false
        }
        if (!query) {
          return true
        }
        const sectionLabel = getSectionFullLabel(exercise.sectionId, muscleSections)
        return (
          isSubsequenceMatch(normalizeText(exercise.name), query) ||
          isSubsequenceMatch(normalizeText(sectionLabel), query) ||
          isSubsequenceMatch(normalizeText(exercise.notes), query)
        )
      })
  }, [exerciseLibrary, courseSearch, courseSectionId, muscleSections])

  const groupedLibraryExercises = useMemo(
    () =>
      muscleSections
        .map((section) => ({
          section,
          exercises: filteredExercises.filter(
            (exercise) => exercise.sectionId === section.id,
          ),
        }))
        .filter((group) => group.exercises.length > 0),
    [filteredExercises, muscleSections],
  )

  const groupedCourseExercises = useMemo(
    () =>
      muscleSections
        .map((section) => ({
          section,
          exercises: filteredExercisesForCourse.filter(
            (exercise) => exercise.sectionId === section.id,
          ),
        }))
        .filter((group) => group.exercises.length > 0),
    [filteredExercisesForCourse, muscleSections],
  )

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleExerciseDraftChange = (event) => {
    const { name, value } = event.target
    setExerciseDraft((previous) => ({ ...previous, [name]: value }))
  }

  const saveExercise = () => {
    const trimmedName = exerciseDraft.name.trim()
    if (!trimmedName) {
      return
    }

    const section = getSectionById(exerciseDraft.sectionId, muscleSections)
    const payload = {
      name: trimmedName,
      sectionId: section.id,
      focus: section.labelAr,
      notes: exerciseDraft.notes.trim() || 'بدون ملاحظات',
    }

    if (editingExerciseId) {
      setExerciseLibrary((previous) =>
        previous.map((exercise) =>
          exercise.id === editingExerciseId
            ? normalizeExercise({ ...exercise, ...payload }, muscleSections)
            : exercise,
        ),
      )
      setStatusMessage('تم تعديل التمرين وحفظه تلقائياً')
    } else {
      const newItem = normalizeExercise(
        {
          id: `ex-custom-${Date.now()}`,
          ...payload,
          isCustom: true,
        },
        muscleSections,
      )
      setExerciseLibrary((previous) => [newItem, ...previous])
      setLibrarySectionId(section.id)
      setStatusMessage('تم إضافة التمرين وحفظه تلقائياً')
    }

    setExerciseDraft({
      ...emptyExerciseDraft,
      sectionId: section.id,
    })
    setEditingExerciseId(null)
  }

  const deleteExercise = (exerciseId) => {
    const exercise = exerciseLibrary.find((item) => item.id === exerciseId)
    if (!exercise) {
      return
    }
    if (!window.confirm(`تحذف التمرين "${exercise.name}" من المكتبة؟`)) {
      return
    }

    setExerciseLibrary((previous) =>
      previous.filter((item) => item.id !== exerciseId),
    )
    setCoursePlan((previous) =>
      previous.map((dayExercises) =>
        normalizeDayExercises(dayExercises).filter(
          (item) => !daySlotIncludesExercise(item, exerciseId),
        ),
      ),
    )
    if (editingExerciseId === exerciseId) {
      setEditingExerciseId(null)
      setExerciseDraft({
        ...emptyExerciseDraft,
        sectionId: librarySectionId === 'all' ? 'chest' : librarySectionId,
      })
    }
    setStatusMessage('تم حذف التمرين من المكتبة وحفظ التغيير تلقائياً')
  }

  const addMuscleSection = () => {
    const labelAr = sectionDraft.labelAr.trim()
    const labelEn = sectionDraft.labelEn.trim() || labelAr
    if (!labelAr) {
      setStatusMessage('اكتب اسم القسم أولاً')
      return
    }

    const alreadyExists = muscleSections.some(
      (section) =>
        normalizeText(section.labelAr) === normalizeText(labelAr) ||
        normalizeText(section.labelEn) === normalizeText(labelEn),
    )
    if (alreadyExists) {
      setStatusMessage('هذا القسم موجود مسبقاً')
      return
    }

    const newSection = {
      id: `sec-${Date.now()}`,
      labelAr,
      labelEn,
      isCustom: true,
    }
    setCustomSections((previous) => [...previous, newSection])
    setLibrarySectionId(newSection.id)
    setExerciseDraft((previous) => ({
      ...previous,
      sectionId: newSection.id,
    }))
    setSectionDraft({ labelAr: '', labelEn: '' })
    setStatusMessage(`تم إضافة قسم ${labelAr}`)
  }

  const toggleExerciseInDay = (exerciseId, dayIndex) => {
    setCoursePlan((previous) =>
      previous.map((dayExercises, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) {
          return normalizeDayExercises(dayExercises)
        }
        const normalized = normalizeDayExercises(dayExercises)
        const alreadyIn = normalized.some((item) =>
          daySlotIncludesExercise(item, exerciseId),
        )
        if (alreadyIn) {
          setPendingSupersetId(null)
          return normalized.filter(
            (item) => !daySlotIncludesExercise(item, exerciseId),
          )
        }
        return [
          ...normalized,
          {
            slotId: `slot-${exerciseId}-${Date.now()}`,
            exerciseIds: [exerciseId],
            prescription: '',
          },
        ]
      }),
    )
  }

  const handleCourseExercisePick = (exerciseId) => {
    const targetSize = getSupersetSizeFromMode(coursePickMode)
    if (!targetSize) {
      toggleExerciseInDay(exerciseId, activeCourseDay)
      return
    }

    const normalized = normalizeDayExercises(activeDayExercises)
    if (normalized.some((item) => daySlotIncludesExercise(item, exerciseId))) {
      toggleExerciseInDay(exerciseId, activeCourseDay)
      return
    }

    if (pendingSupersetIds.includes(exerciseId)) {
      const nextPending = pendingSupersetIds.filter((id) => id !== exerciseId)
      setPendingSupersetIds(nextPending)
      setStatusMessage(
        nextPending.length
          ? `تم إزالة تمرين من السوبر — اختر التمرين ${SUPERSET_ORDINAL_AR[nextPending.length]}`
          : 'تم إلغاء اختيار السوبر ست',
      )
      return
    }

    const nextPending = [...pendingSupersetIds, exerciseId]
    if (nextPending.length < targetSize) {
      setPendingSupersetIds(nextPending)
      setStatusMessage(
        `تم اختيار التمرين ${SUPERSET_ORDINAL_AR[nextPending.length - 1]} — اختر التمرين ${SUPERSET_ORDINAL_AR[nextPending.length]} للسوبر ست ${SUPERSET_SIZE_LABEL_AR[targetSize]}`,
      )
      return
    }

    setCoursePlan((previous) =>
      previous.map((dayExercises, currentDayIndex) => {
        if (currentDayIndex !== activeCourseDay) {
          return normalizeDayExercises(dayExercises)
        }
        const cleaned = normalizeDayExercises(dayExercises).filter(
          (item) => !nextPending.some((id) => daySlotIncludesExercise(item, id)),
        )
        return [
          ...cleaned,
          {
            slotId: `slot-super-${nextPending.join('-')}-${Date.now()}`,
            exerciseIds: nextPending,
            prescription: '',
          },
        ]
      }),
    )
    setPendingSupersetIds([])
    setStatusMessage(
      `تم إضافة سوبر ست ${SUPERSET_SIZE_LABEL_AR[targetSize]} (${targetSize} تمارين معاً)`,
    )
  }

  const updateExercisePrescription = (dayIndex, slotId, prescription) => {
    setCoursePlan((previous) =>
      previous.map((dayExercises, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) {
          return normalizeDayExercises(dayExercises)
        }
        return normalizeDayExercises(dayExercises).map((item) =>
          item.slotId === slotId ? { ...item, prescription } : item,
        )
      }),
    )
  }

  const isExerciseSelectedInDay = (dayExercises, exerciseId) =>
    normalizeDayExercises(dayExercises).some((item) =>
      daySlotIncludesExercise(item, exerciseId),
    )

  const getExercisePrescription = (dayExercises, exerciseId) =>
    normalizeDayExercises(dayExercises).find((item) =>
      daySlotIncludesExercise(item, exerciseId),
    )?.prescription ?? ''

  const getSlotForExercise = (dayExercises, exerciseId) =>
    normalizeDayExercises(dayExercises).find((item) =>
      daySlotIncludesExercise(item, exerciseId),
    ) ?? null

  const toggleWeekDay = (dayId) => {
    setSelectedWeekDayIds((previous) =>
      previous.includes(dayId)
        ? previous.filter((item) => item !== dayId)
        : [...previous, dayId],
    )
  }

  const addCustomDayLabel = () => {
    const trimmed = customDayInput.trim()
    if (!trimmed) {
      return
    }
    if (selectedCustomDayLabels.includes(trimmed)) {
      setCustomDayInput('')
      return
    }
    setCustomDayLabels((previous) => [...previous, trimmed])
    setCustomDayInput('')
  }

  const removeCustomDayLabel = (label) => {
    setCustomDayLabels((previous) => previous.filter((item) => item !== label))
  }

  const openLibraryTab = () => {
    setExerciseLibrary((previous) => mergeWithCatalog(previous, muscleSections))
    setActiveTab('library')
    setEditingExerciseId(null)
    setExerciseDraft({
      ...emptyExerciseDraft,
      sectionId: librarySectionId === 'all' ? 'chest' : librarySectionId,
    })
  }

  const openExerciseManagerForEdit = (exerciseId) => {
    const exercise = exerciseLibrary.find((item) => item.id === exerciseId)
    if (!exercise) {
      return
    }
    const normalized = normalizeExercise(exercise, muscleSections)
    setActiveTab('library')
    setEditingExerciseId(exerciseId)
    setLibrarySectionId(normalized.sectionId)
    setExerciseDraft({
      name: normalized.name,
      sectionId: normalized.sectionId,
      notes: normalized.notes,
    })
  }

  const getExerciseById = (exerciseId) =>
    exerciseLibrary.find((exercise) => exercise.id === exerciseId)

  const activeDayExercises = coursePlan[activeCourseDay] ?? []

  const exportScheduleBlocks = useMemo(() => {
    const blocks = []
    let streak = 0

    coursePlan.forEach((dayExercises, dayIndex) => {
      const normalized = normalizeDayExercises(dayExercises)
        const focusLabels = [
          ...new Set(
            normalized
              .flatMap((item) =>
                (item.exerciseIds || []).map((exerciseId) => {
                  const exercise = exerciseLibrary.find(
                    (entry) => entry.id === exerciseId,
                  )
                  if (!exercise) {
                    return null
                  }
                  return getSectionFullLabel(
                    resolveSectionId(exercise, muscleSections),
                    muscleSections,
                  )
                }),
              )
              .filter(Boolean),
          ),
        ]
      const theme = dayThemeColors[dayIndex % dayThemeColors.length]
      const dayTitle = courseDayTitles[dayIndex] || `اليوم ${dayIndex + 1}`
      const focusTitle = focusLabels.length ? ` (${focusLabels.join(' + ')})` : ''

      blocks.push({
        type: 'training',
        key: `train-${dayIndex}`,
        dayIndex,
        title: `${dayTitle}${focusTitle}`,
        theme,
        exercises: normalized,
      })

      streak += 1
      const restEvery =
        scheduleMode === 'pattern'
          ? selectedWorkoutPattern.restEvery || selectedWorkoutPattern.trainDays
          : selectedWorkoutPattern.trainDays
      if (
        scheduleMode === 'pattern' &&
        selectedWorkoutPattern.restDays > 0 &&
        streak >= restEvery
      ) {
        for (let restIndex = 0; restIndex < selectedWorkoutPattern.restDays; restIndex += 1) {
          blocks.push({
            type: 'rest',
            key: `rest-${dayIndex}-${restIndex}`,
          })
        }
        streak = 0
      }
    })

    return blocks
  }, [
    coursePlan,
    courseDayTitles,
    scheduleMode,
    selectedWorkoutPattern,
    exerciseLibrary,
    muscleSections,
  ])

  const filteredHistory = useMemo(() => {
    const query = normalizeText(historySearch.trim())
    if (!query) {
      return courseHistory
    }
    return courseHistory.filter((record) => {
      const haystack = normalizeText(
        `${record.formData?.playerName || ''} ${record.formData?.startDate || ''} ${record.source || ''}`,
      )
      return isSubsequenceMatch(haystack, query)
    })
  }, [courseHistory, historySearch])

  const buildCourseSnapshot = (source) => {
    const now = new Date().toISOString()
    const existing = courseHistory.find((item) => item.id === activeHistoryId)
    return {
      id: existing?.id || `course-${Date.now()}`,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      source,
      formData: { ...formData },
      coursePlan: coursePlan.map((day) => normalizeDayExercises(day ?? [])),
      scheduleMode,
      workoutPatternId,
      selectedWeekDayIds: [...selectedWeekDayIds],
      customDayLabels: [...customDayLabels],
      customSections: customSections.map((section) => ({ ...section })),
      exerciseLibrary: mergeWithCatalog(exerciseLibrary, muscleSections),
    }
  }

  const upsertHistoryRecord = (source) => {
    const snapshot = buildCourseSnapshot(source)
    setCourseHistory((previous) => {
      const withoutCurrent = previous.filter((item) => item.id !== snapshot.id)
      const next = [snapshot, ...withoutCurrent].sort(
        (left, right) =>
          new Date(right.updatedAt || 0).getTime() -
          new Date(left.updatedAt || 0).getTime(),
      )
      persistHistoryToStorage(next)
      return next
    })
    setActiveHistoryId(snapshot.id)
    return snapshot
  }

  const applyCourseRecord = (record) => {
    if (!record) {
      return
    }
    const restoredSections = Array.isArray(record.customSections)
      ? record.customSections
      : []
    const sectionsForRecord = mergeCustomSections([
      ...customSections,
      ...restoredSections,
    ])
    if (restoredSections.length) {
      setCustomSections(
        sectionsForRecord
          .filter((section) => section.isCustom)
          .map((section) => ({
            id: section.id,
            labelAr: section.labelAr,
            labelEn: section.labelEn || section.labelAr,
            isCustom: true,
          })),
      )
    }
    if (record.formData) {
      setFormData((previous) => ({ ...previous, ...record.formData }))
    }
    if (Array.isArray(record.exerciseLibrary)) {
      setExerciseLibrary(mergeWithCatalog(record.exerciseLibrary, sectionsForRecord))
    } else {
      setExerciseLibrary((previous) => mergeWithCatalog(previous, sectionsForRecord))
    }
    if (record.scheduleMode) {
      setScheduleMode(record.scheduleMode)
    }
    if (record.workoutPatternId) {
      setWorkoutPatternId(record.workoutPatternId)
    }
    if (Array.isArray(record.selectedWeekDayIds)) {
      setSelectedWeekDayIds(record.selectedWeekDayIds)
    }
    if (Array.isArray(record.customDayLabels)) {
      setCustomDayLabels(record.customDayLabels)
    }
    if (Array.isArray(record.coursePlan)) {
      setCoursePlan(record.coursePlan.map((day) => normalizeDayExercises(day ?? [])))
    }
    setActiveHistoryId(record.id)
    setActiveCourseDay(0)
  }

  const loadHistoryRecord = (recordId) => {
    const record = courseHistory.find((item) => item.id === recordId)
    if (!record) {
      return
    }
    applyCourseRecord(record)
    setActiveTab('home')
    setStatusMessage(
      `تم فتح كورس ${record.formData?.playerName || 'اللاعب'} للتعديل أو التصدير`,
    )
  }

  const deleteHistoryRecord = (recordId) => {
    if (!window.confirm('تحذف هذا الكورس من السجل؟')) {
      return
    }
    setCourseHistory((previous) => {
      const next = previous.filter((item) => item.id !== recordId)
      persistHistoryToStorage(next)
      return next
    })
    if (activeHistoryId === recordId) {
      setActiveHistoryId(null)
    }
    setStatusMessage('تم حذف الكورس من السجل')
  }

  const startNewCourse = () => {
    setActiveHistoryId(null)
    setFormData((previous) => ({
      ...previous,
      playerName: '',
      weight: '',
      height: '',
      startDate: new Date().toISOString().slice(0, 10),
    }))
    setCoursePlan(createEmptyCoursePlan(trainingTemplateDays))
    setActiveCourseDay(0)
    setActiveTab('home')
    setStatusMessage('تم تجهيز كورس جديد')
  }

  const saveDraft = () => {
    const draft = {
      formData: {
        ...formData,
        // لا نحفظ بيانات اللاعب بالمسودة حتى تبقى فاضية عند كل فتح
        playerName: '',
        weight: '',
        height: '',
      },
      exerciseLibrary: mergeWithCatalog(exerciseLibrary, muscleSections),
      coursePlan,
      scheduleMode,
      workoutPatternId,
      selectedWeekDayIds,
      customDayLabels,
      customSections,
      catalogVersion: CATALOG_VERSION,
      savedAt: new Date().toISOString(),
      activeHistoryId,
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    upsertHistoryRecord('draft')
    setStatusMessage('تم حفظ المسودة وإضافتها إلى السجل')
  }

  const getCourseFileBaseName = () => {
    const safePlayerName = (formData.playerName || 'لاعب')
      .trim()
      .replace(/\s+/g, '-')
    return `كورس-${safePlayerName}-${formData.startDate || 'today'}`
  }

  const renderCourseImage = async () => {
    const node = exportSheetRef.current
    if (!node) {
      throw new Error('preview-unavailable')
    }

    const previousInlineWidth = node.style.width
    const previousInlineMaxWidth = node.style.maxWidth
    const previousInlineMinHeight = node.style.minHeight
    const previousInlineHeight = node.style.height
    const previousInlineOverflow = node.style.overflow
    const previousDensityClass = SHEET_DENSITY_LEVELS.find((level) =>
      node.classList.contains(`sheet-density-${level}`),
    )

    const clearDensityClasses = () => {
      SHEET_DENSITY_LEVELS.forEach((level) => {
        node.classList.remove(`sheet-density-${level}`)
      })
    }

    const applyDensity = async (level) => {
      clearDensityClasses()
      node.classList.add(`sheet-density-${level}`)
      await waitNextPaint()
      return measureNodeHeight(node)
    }

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      node.classList.add('is-exporting')
      node.style.width = `${SHEET_EXPORT_WIDTH_PX}px`
      node.style.maxWidth = `${SHEET_EXPORT_WIDTH_PX}px`
      node.style.minHeight = `${A4_DESIGN_HEIGHT_PX}px`
      node.style.height = 'auto'
      node.style.overflow = 'visible'

      let density = getSheetDensityByCount(sheetExerciseCount)
      let contentHeight = await applyDensity(density)
      const startIndex = SHEET_DENSITY_LEVELS.indexOf(density)

      // كثرة التمارين → صغّر الخطوط والمسافات لتناسب ارتفاع A4
      for (let index = startIndex; index < SHEET_DENSITY_LEVELS.length - 1; index += 1) {
        if (contentHeight <= A4_DESIGN_HEIGHT_PX) {
          break
        }
        density = SHEET_DENSITY_LEVELS[index + 1]
        contentHeight = await applyDensity(density)
      }

      // قلة التمارين → كبّر شوية بدون تجاوز الصفحة
      for (let index = SHEET_DENSITY_LEVELS.indexOf(density); index > 0; index -= 1) {
        const looser = SHEET_DENSITY_LEVELS[index - 1]
        const probeHeight = await applyDensity(looser)
        if (probeHeight <= A4_DESIGN_HEIGHT_PX * 0.98) {
          density = looser
          contentHeight = probeHeight
        } else {
          contentHeight = await applyDensity(density)
          break
        }
      }

      await waitNextPaint()
      contentHeight = Math.max(contentHeight, measureNodeHeight(node))
      // صفحة A4 كاملة دائماً حتى يملأ الجدول عرض الورقة
      const pageHeight = Math.max(contentHeight, A4_DESIGN_HEIGHT_PX)

      const sourceDataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: EXPORT_PIXEL_RATIO,
        backgroundColor: '#ffffff',
        width: SHEET_EXPORT_WIDTH_PX,
        height: pageHeight,
        style: {
          fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
          width: `${SHEET_EXPORT_WIDTH_PX}px`,
          maxWidth: `${SHEET_EXPORT_WIDTH_PX}px`,
          minWidth: `${SHEET_EXPORT_WIDTH_PX}px`,
          height: `${pageHeight}px`,
          minHeight: `${pageHeight}px`,
          transform: 'none',
          overflow: 'visible',
        },
      })

      const image = new Image()
      image.decoding = 'async'
      const imageLoaded = new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })
      image.src = sourceDataUrl
      await imageLoaded

      const canvas = document.createElement('canvas')
      canvas.width = A4_WIDTH_PX
      canvas.height = A4_HEIGHT_PX
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('canvas-unavailable')
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX)

      // هوامش ≈ 1 سم يمين ويسار على ورقة A4
      const sideMargin = Math.round(A4_WIDTH_PX * (10 / 210))
      const topMargin = Math.round(A4_HEIGHT_PX * 0.015)
      const drawWidth = A4_WIDTH_PX - sideMargin * 2
      const drawHeight = A4_HEIGHT_PX - topMargin * 2
      context.drawImage(image, sideMargin, topMargin, drawWidth, drawHeight)

      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.93),
        widthPx: canvas.width,
        heightPx: canvas.height,
      }
    } finally {
      node.classList.remove('is-exporting')
      clearDensityClasses()
      if (previousDensityClass) {
        node.classList.add(`sheet-density-${previousDensityClass}`)
      }
      node.style.width = previousInlineWidth
      node.style.maxWidth = previousInlineMaxWidth
      node.style.minHeight = previousInlineMinHeight
      node.style.height = previousInlineHeight
      node.style.overflow = previousInlineOverflow
    }
  }

  const openExportPreview = async () => {
    if (!exportSheetRef.current || isPreviewLoading) {
      return
    }

    setIsPreviewOpen(true)
    setIsPreviewLoading(true)
    setPreviewDataUrl(null)
    setStatusMessage('جاري تجهيز المعاينة بنفس هيئة التنزيل...')

    try {
      const { dataUrl } = await renderCourseImage()
      setPreviewDataUrl(dataUrl)
      setStatusMessage('المعاينة جاهزة — نفس هيئة الصورة/PDF')
    } catch {
      setStatusMessage('فشل تجهيز المعاينة، حاول مرة ثانية')
      setIsPreviewOpen(false)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const closeExportPreview = () => {
    setIsPreviewOpen(false)
    setIsPreviewLoading(false)
  }

  const downloadCourseFile = async (kind) => {
    if (!exportSheetRef.current || isExporting) {
      return
    }

    setIsExporting(true)
    setExportKind(kind)
    setStatusMessage(
      kind === 'pdf' ? 'جاري تجهيز ملف PDF...' : 'جاري تجهيز الصورة...',
    )

    try {
      const { dataUrl } = await renderCourseImage()
      const baseName = getCourseFileBaseName()

      if (kind === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        })
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
        pdf.save(`${baseName}.pdf`)
        setStatusMessage('تم تنزيل ملف PDF وحفظ الكورس في السجل')
      } else {
        const link = document.createElement('a')
        link.download = `${baseName}.jpg`
        link.href = dataUrl
        link.click()
        setStatusMessage('تم تنزيل الصورة وحفظ الكورس في السجل')
      }

      upsertHistoryRecord('export')
    } catch {
      setStatusMessage(
        kind === 'pdf'
          ? 'فشل تنزيل PDF، حاول مرة ثانية'
          : 'فشل تنزيل الصورة، حاول مرة ثانية',
      )
    } finally {
      setIsExporting(false)
      setExportKind(null)
    }
  }

  return (
    <main className="app" dir="rtl">
      <header className="hero">
        <div className="page-brand-header">
          <div className="brand-side brand-right">{CENTER_NAME}</div>
          <div className="brand-logo-wrap">
            <img
              src="/logo-top-classic.png"
              alt="Top Classic Gym"
              className="brand-logo"
            />
          </div>
          <div className="brand-side brand-left">{COACH_TITLE}</div>
        </div>
        <div className="brand-divider" />

        <nav className="app-tabs" aria-label="أقسام التطبيق">
          <button
            type="button"
            className={activeTab === 'home' ? 'active' : ''}
            onClick={() => setActiveTab('home')}
          >
            <span className="app-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.5 10.8 12 4.5l7.5 6.3V20a1 1 0 0 1-1 1h-4.2v-5.2h-4.6V21H5.5a1 1 0 0 1-1-1v-9.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="app-tab-label">الرئيسية</span>
          </button>
          <button
            type="button"
            className={activeTab === 'library' ? 'active' : ''}
            onClick={openLibraryTab}
          >
            <span className="app-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 5.8h5.2a2 2 0 0 1 1.5.7l.6.7H19a1.2 1.2 0 0 1 1.2 1.2V18a1.2 1.2 0 0 1-1.2 1.2H5A1.2 1.2 0 0 1 3.8 18V7A1.2 1.2 0 0 1 5 5.8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 12.2h8M8 15.2h5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="app-tab-label">المكتبة</span>
            <span className="app-tab-count">{exerciseLibrary.length}</span>
          </button>
          <button
            type="button"
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            <span className="app-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 7.2v5l3.2 1.9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1L4.8 8.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.8 5.2v3.6h3.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="app-tab-label">السجل</span>
            <span className="app-tab-count">{courseHistory.length}</span>
          </button>
          <button
            type="button"
            className={activeTab === 'about' ? 'active' : ''}
            onClick={() => setActiveTab('about')}
          >
            <span className="app-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="8.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 10.6v5.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="7.8" r="1" fill="currentColor" />
              </svg>
            </span>
            <span className="app-tab-label">حول</span>
          </button>
        </nav>
      </header>

      {statusMessage && activeTab !== 'home' && (
        <p className="status-message">{statusMessage}</p>
      )}

      {activeTab === 'home' && (
      <section className="grid-layout">
        <article className="panel">
          {activeHistoryId && (
            <div className="history-edit-banner">
              <div>
                <strong>تعديل كورس من السجل</strong>
                <span>أي حفظ أو تصدير راح يحدّث نفس السجل.</span>
              </div>
              <button type="button" className="ghost" onClick={startNewCourse}>
                كورس جديد
              </button>
            </div>
          )}
          <h3 className="section-title">بيانات اللاعب</h3>
          <div className="form-grid">
            <label>
              اسم اللاعب
              <input
                name="playerName"
                value={formData.playerName}
                onChange={handleInputChange}
                autoComplete="off"
                placeholder="اكتب اسم اللاعب"
              />
            </label>

            <label>
              تاريخ البداية
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <h3 className="section-title">القياسات</h3>
          <div className="form-grid">
            <label>
              الوزن (كغم)
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                autoComplete="off"
                placeholder="—"
              />
            </label>

            <label>
              الطول (سم)
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                autoComplete="off"
                placeholder="—"
              />
            </label>
          </div>

          <div className="course-picker-entry">
            <h3>اختيار تمارين الكورس</h3>
            <p>
              اختَر نظام الجدول أولاً، بعدها وزّع تمارين لكل يوم (يوم 1، يوم 2...)
              ويتم تكرارها تلقائيا حسب النظام المختار.
            </p>

            <label>
              نوع جدولة الأيام
              <select
                value={scheduleMode}
                onChange={(event) => setScheduleMode(event.target.value)}
              >
                <option value="pattern">نظام جاهز (تمرين + راحة)</option>
                <option value="custom">اختيار أيام مخصص</option>
              </select>
            </label>

            {scheduleMode === 'pattern' ? (
              <label>
              نظام أيام التمرين والراحة
              <select
                value={workoutPatternId}
                onChange={(event) => setWorkoutPatternId(event.target.value)}
              >
                {workoutPatterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </select>
              </label>
            ) : (
              <div className="custom-days-box">
                <p>اختَر أيامك الخاصة أو أضف أيام مخصصة</p>
                <div className="custom-days-grid">
                  {weekDays.map((day) => (
                    <button
                      type="button"
                      key={day.id}
                      className={selectedWeekDayIds.includes(day.id) ? 'active' : ''}
                      onClick={() => toggleWeekDay(day.id)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="custom-day-input-row">
                  <input
                    placeholder="أضف يوم مخصص (مثال: صباحي)"
                    value={customDayInput}
                    onChange={(event) => setCustomDayInput(event.target.value)}
                  />
                  <button type="button" onClick={addCustomDayLabel}>
                    إضافة
                  </button>
                </div>
                <div className="selected-exercises">
                  {selectedCustomDayLabels.length > 0 ? (
                    selectedCustomDayLabels.map((label) => (
                      <span key={label}>
                        {label}
                        {customDayLabels.includes(label) && (
                          <button type="button" onClick={() => removeCustomDayLabel(label)}>
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span>ماكو أيام مضافة، راح يستخدم يوم مخصص تلقائيا</span>
                  )}
                </div>
              </div>
            )}

            <div className="course-extra-fields">
              <label>
                دقائق الكارديو
                <select
                  name="cardioMinutes"
                  value={formData.cardioMinutes}
                  onChange={handleInputChange}
                >
                  <option value="0">بدون كارديو</option>
                  <option value="10">10 دقائق</option>
                  <option value="15">15 دقيقة</option>
                  <option value="20">20 دقيقة</option>
                  <option value="25">25 دقيقة</option>
                  <option value="30">30 دقيقة</option>
                  <option value="35">35 دقيقة</option>
                  <option value="40">40 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">60 دقيقة</option>
                </select>
              </label>

              <label className="full-width">
                ملاحظات
                <textarea
                  name="courseNotes"
                  rows="4"
                  value={formData.courseNotes}
                  onChange={handleInputChange}
                  placeholder="اكتب ملاحظات الكورس هنا..."
                />
              </label>
            </div>

            <button
              type="button"
              className="open-course-picker"
              onClick={() => {
                setExerciseLibrary((previous) => mergeWithCatalog(previous, muscleSections))
                setIsCoursePickerOpen(true)
              }}
            >
              اختيار تمارين الأيام
            </button>

            {statusMessage && <p className="status-message">{statusMessage}</p>}

            <div className="actions home-actions">
              <button type="button" className="secondary" onClick={saveDraft}>
                حفظ كمسودة
              </button>
              <button
                type="button"
                className="preview-btn"
                onClick={openExportPreview}
                disabled={isPreviewLoading || isExporting}
              >
                {isPreviewLoading ? 'جاري المعاينة...' : 'معاينة'}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => downloadCourseFile('image')}
                disabled={isExporting}
              >
                {isExporting && exportKind === 'image'
                  ? 'جاري التنزيل...'
                  : 'تنزيل صورة'}
              </button>
              <button
                type="button"
                className="pdf"
                onClick={() => downloadCourseFile('pdf')}
                disabled={isExporting}
              >
                {isExporting && exportKind === 'pdf'
                  ? 'جاري التنزيل...'
                  : 'تنزيل PDF'}
              </button>
            </div>
          </div>
        </article>

        {/* مصدر التصدير مخفي — لازم يبقى في الصفحة عشان التنزيل/المعاينة */}
        <div className="export-sheet-offscreen" aria-hidden="true">
          <div
            className={`export-sheet sheet-density-${sheetDensity}`}
            ref={exportSheetRef}
            data-exercise-count={sheetExerciseCount}
          >
            <header className="sheet-brand-header">
              <div className="sheet-brand-side sheet-brand-right">
                {CENTER_NAME}
              </div>
              <div className="sheet-brand-logo-wrap">
                <img
                  src="/logo-top-classic.png"
                  alt="Top Classic Gym"
                  className="sheet-brand-logo"
                />
              </div>
              <div className="sheet-brand-side sheet-brand-left">
                {COACH_TITLE}
              </div>
            </header>
            <div className="sheet-brand-line" />

            <div className="sheet-course-heading">الكورس</div>

            <div className="sheet-player-strip">
              <div className="player-meta-item">
                <strong>اللاعب:</strong> {formData.playerName || '—'}
              </div>
              <div className="player-meta-item">
                <strong>الوزن:</strong> {formData.weight} كغم
              </div>
              <div className="player-meta-item">
                <strong>الطول:</strong> {formData.height} سم
              </div>
              <div className="player-meta-item">
                <strong>التاريخ:</strong> {formData.startDate}
              </div>
            </div>

            <div className="sheet-program-blocks">
              {exportScheduleBlocks.map((block) => {
                if (block.type === 'rest') {
                  return (
                    <div key={block.key} className="sheet-rest-bar">
                      <span aria-hidden="true">😴</span>
                      <strong>استراحة</strong>
                    </div>
                  )
                }

                const { theme, title, exercises, dayIndex } = block

                return (
                  <section
                    key={block.key}
                    className="sheet-day-table"
                    style={{
                      '--day-accent': theme.accent,
                      '--day-header': theme.header,
                      '--day-soft': theme.soft,
                    }}
                  >
                    <div className="sheet-day-heading">
                      <div className="sheet-day-title">{title}</div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th className="col-index">ت</th>
                          <th className="col-name">التمرين</th>
                          <th className="col-sets">المجموعات × التكرارات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercises.length > 0 ? (
                          exercises.map((dayExercise, exerciseIndex) => {
                            const displayName = getDaySlotDisplayName(
                              dayExercise,
                              getExerciseById,
                            )
                            if (!displayName) {
                              return null
                            }
                            const primaryExercise = getExerciseById(
                              dayExercise.exerciseIds[0],
                            )
                            return (
                              <tr key={`${dayIndex}-${dayExercise.slotId}`}>
                                <td className="col-index">{exerciseIndex + 1}</td>
                                <td className="col-name">{displayName}</td>
                                <td className="col-sets">
                                  {dayExercise.prescription.trim() ||
                                    primaryExercise?.notes ||
                                    '—'}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td className="col-index">—</td>
                            <td className="col-name empty-day">لا يوجد تمارين مضافة</td>
                            <td className="col-sets">—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                )
              })}
            </div>

            <div className="sheet-cardio-bar">
              <div className="sheet-cardio-label">
                <span aria-hidden="true">❤️</span>
                الكارديو
              </div>
              <div className="sheet-cardio-text">
                {Number(formData.cardioMinutes) > 0
                  ? `بعد التمرين: ${formData.cardioMinutes} دقيقة كارديو`
                  : 'بدون كارديو'}
              </div>
            </div>

            <div className="sheet-notes-bar">
              <div className="sheet-notes-row">
                <div className="sheet-notes-label">
                  <span aria-hidden="true">📋</span>
                  ملاحظات:
                </div>
                <div className="sheet-notes-inline">
                  {(formData.courseNotes || '')
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, index, list) => (
                      <span key={line} className="sheet-note-item">
                        {line}
                        {index < list.length - 1 ? (
                          <span className="sheet-note-sep" aria-hidden="true">
                            {' '}
                            ·{' '}
                          </span>
                        ) : null}
                      </span>
                    ))}
                </div>
              </div>
              <div className="sheet-notes-contact">
                للتواصل:{' '}
                <a className="sheet-notes-phone" href="tel:07731984759">
                  07731984759
                </a>
              </div>
            </div>
          </div>
        </div>

        {isPreviewOpen && (
          <div
            className="preview-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="معاينة التصدير"
            onClick={closeExportPreview}
          >
            <div
              className="preview-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="preview-modal-header">
                <div>
                  <h3>معاينة التصدير</h3>
                  <p>نفس هيئة الصورة وملف PDF اللي راح ينزل</p>
                </div>
                <button
                  type="button"
                  className="close"
                  onClick={closeExportPreview}
                >
                  إغلاق
                </button>
              </div>

              <div className="preview-modal-stage">
                {isPreviewLoading && (
                  <p className="preview-modal-loading">جاري تجهيز المعاينة...</p>
                )}
                {!isPreviewLoading && previewDataUrl && (
                  <img
                    src={previewDataUrl}
                    alt="معاينة كورس التمرين"
                    className="preview-modal-image"
                  />
                )}
              </div>

              <div className="actions preview-modal-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => downloadCourseFile('image')}
                  disabled={isExporting || isPreviewLoading}
                >
                  {isExporting && exportKind === 'image'
                    ? 'جاري التنزيل...'
                    : 'تنزيل صورة'}
                </button>
                <button
                  type="button"
                  className="pdf"
                  onClick={() => downloadCourseFile('pdf')}
                  disabled={isExporting || isPreviewLoading}
                >
                  {isExporting && exportKind === 'pdf'
                    ? 'جاري التنزيل...'
                    : 'تنزيل PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {activeTab === 'library' && (
      <section className="library-page">
        <div className="library-hero-bar">
          <div>
            <h2>مكتبة التمارين</h2>
            <p>تصفح حسب القسم، ابحث بسرعة، وأضف قسم أو تمرين أو احذف.</p>
          </div>
          <div className="library-stat">
            <strong>{filteredExercises.length}</strong>
            <span>تمرين ظاهر</span>
          </div>
        </div>

        <div className="library-layout">
          <aside className="library-sidebar panel">
            <div className="library-section-creator">
              <h3>إضافة قسم</h3>
              <p className="library-sidebar-hint">
                أضف قسماً جديداً للمكتبة (مثال: الكور / الكارديو).
              </p>
              <div className="exercise-form library-form">
                <label>
                  اسم القسم بالعربي
                  <input
                    name="labelAr"
                    placeholder="مثال: الكارديو"
                    value={sectionDraft.labelAr}
                    onChange={(event) =>
                      setSectionDraft((previous) => ({
                        ...previous,
                        labelAr: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  الاسم بالإنجليزي (اختياري)
                  <input
                    name="labelEn"
                    placeholder="مثال: Cardio"
                    value={sectionDraft.labelEn}
                    onChange={(event) =>
                      setSectionDraft((previous) => ({
                        ...previous,
                        labelEn: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="exercise-form-actions">
                  <button type="button" onClick={addMuscleSection}>
                    إضافة القسم
                  </button>
                </div>
              </div>
            </div>

            <h3>{editingExerciseId ? 'تعديل تمرين' : 'إضافة تمرين'}</h3>
            <p className="library-sidebar-hint">
              اختر القسم ثم اكتب اسم التمرين والملاحظات.
            </p>
            <div className="exercise-form library-form">
              <label>
                القسم
                <select
                  name="sectionId"
                  value={exerciseDraft.sectionId}
                  onChange={handleExerciseDraftChange}
                >
                  {muscleSections.map((section) => (
                    <option key={`draft-${section.id}`} value={section.id}>
                      {section.labelAr} ({section.labelEn})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                اسم التمرين
                <input
                  name="name"
                  placeholder="مثال: بنج مستوي وسط"
                  value={exerciseDraft.name}
                  onChange={handleExerciseDraftChange}
                />
              </label>
              <label>
                ملاحظات
                <input
                  name="notes"
                  placeholder="جولات / تكرار (اختياري)"
                  value={exerciseDraft.notes}
                  onChange={handleExerciseDraftChange}
                />
              </label>
              <div className="exercise-form-actions">
                <button type="button" onClick={saveExercise}>
                  {editingExerciseId ? 'حفظ التعديل' : 'إضافة للمكتبة'}
                </button>
                {editingExerciseId && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditingExerciseId(null)
                      setExerciseDraft({
                        ...emptyExerciseDraft,
                        sectionId:
                          librarySectionId === 'all' ? 'chest' : librarySectionId,
                      })
                    }}
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
            </div>
          </aside>

          <div className="library-main panel">
            <div className="library-toolbar">
              <input
                className="exercise-search"
                placeholder="ابحث عن تمرين أو قسم..."
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
              />
            </div>

            <div className="section-tabs library-section-tabs">
              <button
                type="button"
                className={librarySectionId === 'all' ? 'active' : ''}
                onClick={() => setLibrarySectionId('all')}
              >
                الكل
              </button>
              {muscleSections.map((section) => (
                <button
                  type="button"
                  key={`library-tab-${section.id}`}
                  className={librarySectionId === section.id ? 'active' : ''}
                  onClick={() => {
                    setLibrarySectionId(section.id)
                    setExerciseDraft((previous) => ({
                      ...previous,
                      sectionId: section.id,
                    }))
                  }}
                >
                  {section.labelAr}
                </button>
              ))}
            </div>

            <div className="exercise-list library-exercise-list">
              {groupedLibraryExercises.map(({ section, exercises }) => (
                <div key={`library-group-${section.id}`} className="exercise-section-group">
                  <h4 className="exercise-section-title">
                    <span>
                      {section.labelAr}
                      <small> ({section.labelEn})</small>
                    </span>
                    <em>{exercises.length}</em>
                  </h4>
                  {exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className={`exercise-item${
                        editingExerciseId === exercise.id ? ' is-editing' : ''
                      }`}
                    >
                      <div className="exercise-pick">
                        <strong>{exercise.name}</strong>
                        {exercise.notes ? <small>{exercise.notes}</small> : null}
                      </div>
                      <div className="exercise-item-actions">
                        <button
                          type="button"
                          className="edit"
                          onClick={() => openExerciseManagerForEdit(exercise.id)}
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteExercise(exercise.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {groupedLibraryExercises.length === 0 && (
                <p className="empty-list">ماكو نتائج مطابقة للبحث أو القسم.</p>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {activeTab === 'history' && (
      <section className="history-page">
        <div className="library-hero-bar">
          <div>
            <h2>سجل الكورسات</h2>
            <p>
              كل حفظ مسودة أو تصدير يُخزَّن هنا، وتقدر تفتحه للتعديل أو التصدير مرة ثانية.
            </p>
          </div>
          <div className="library-stat">
            <strong>{courseHistory.length}</strong>
            <span>كورس محفوظ</span>
          </div>
        </div>

        <div className="panel history-panel">
          <div className="history-toolbar">
            <input
              className="exercise-search"
              placeholder="ابحث باسم اللاعب أو التاريخ..."
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
            />
            <button type="button" className="history-new-btn" onClick={startNewCourse}>
              كورس جديد
            </button>
          </div>

          <div className="history-list">
            {filteredHistory.map((record) => {
              const exerciseCount = countPlanExercises(record.coursePlan)
              const isActive = activeHistoryId === record.id
              return (
                <article
                  key={record.id}
                  className={`history-item${isActive ? ' is-active' : ''}`}
                >
                  <div className="history-item-main">
                    <div className="history-item-title-row">
                      <h3>{record.formData?.playerName || 'بدون اسم'}</h3>
                      <span
                        className={`history-source ${
                          record.source === 'export' ? 'export' : 'draft'
                        }`}
                      >
                        {record.source === 'export' ? 'تصدير' : 'مسودة'}
                      </span>
                    </div>
                    <div className="history-item-meta">
                      <span>تاريخ البداية: {record.formData?.startDate || '—'}</span>
                      <span>
                        الوزن/الطول: {record.formData?.weight || '—'} كغم /{' '}
                        {record.formData?.height || '—'} سم
                      </span>
                      <span>التمارين: {exerciseCount}</span>
                      <span>آخر تحديث: {formatHistoryDate(record.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="history-item-actions">
                    <button type="button" onClick={() => loadHistoryRecord(record.id)}>
                      تعديل / تصدير
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteHistoryRecord(record.id)}
                    >
                      حذف
                    </button>
                  </div>
                </article>
              )
            })}
            {filteredHistory.length === 0 && (
              <p className="empty-list">
                {courseHistory.length === 0
                  ? 'ماكو كورسات بالسجل بعد. احفظ مسودة أو صدّر كورس من الرئيسية.'
                  : 'ماكو نتائج مطابقة للبحث.'}
              </p>
            )}
          </div>
        </div>
      </section>
      )}

      {activeTab === 'about' && (
      <section className="about-page">
        <article className="about-card">
          <div className="about-logo-wrap">
            <img
              src="/developer-logo.png"
              alt="شعار المطور"
              className="about-logo"
            />
          </div>
          <div className="about-info">
            <p className="about-eyebrow">{DEVELOPER_TITLE}</p>
            <h2>{DEVELOPER_NAME}</h2>
            <p className="about-role">مطور برمجيات · Software Solutions</p>
            <a className="about-phone" href={`tel:${DEVELOPER_PHONE}`}>
              <span className="about-phone-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8.2 4.8h2.1l1.1 3.2-1.4 1.1a11.4 11.4 0 0 0 5 5l1.1-1.4 3.2 1.1v2.1a1.6 1.6 0 0 1-1.6 1.6A12.8 12.8 0 0 1 5.2 6.4 1.6 1.6 0 0 1 6.8 4.8Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{DEVELOPER_PHONE}</span>
            </a>
          </div>
        </article>
      </section>
      )}

      {isCoursePickerOpen && (
        <div className="exercise-modal-overlay">
          <article className="exercise-modal">
            <div className="exercise-modal-header">
              <h3>اختيار تمارين الكورس ({filteredExercisesForCourse.length})</h3>
              <button
                type="button"
                className="close"
                onClick={() => {
                  setIsCoursePickerOpen(false)
                  setPendingSupersetIds([])
                  setCoursePickMode('normal')
                }}
              >
                اغلاق
              </button>
            </div>

            <div className="day-tabs">
              {Array.from({ length: trainingTemplateDays }, (_, index) => (
                <button
                  type="button"
                  key={`day-tab-${index}`}
                  className={activeCourseDay === index ? 'active' : ''}
                  onClick={() => {
                    setActiveCourseDay(index)
                    setPendingSupersetIds([])
                  }}
                >
                  يوم {index + 1}
                </button>
              ))}
            </div>

            <div className="course-pick-mode">
              <button
                type="button"
                className={coursePickMode === 'normal' ? 'active' : ''}
                onClick={() => {
                  setCoursePickMode('normal')
                  setPendingSupersetIds([])
                }}
              >
                تمرين عادي
              </button>
              {SUPERSET_PICK_MODES.map(({ mode, label }) => (
                <button
                  type="button"
                  key={mode}
                  className={coursePickMode === mode ? 'active' : ''}
                  onClick={() => {
                    setCoursePickMode(mode)
                    setPendingSupersetIds([])
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {isSupersetPickMode(coursePickMode) && (
              <p className="superset-hint">
                {pendingSupersetIds.length
                  ? `${pendingSupersetIds
                      .map(
                        (id, index) =>
                          `${SUPERSET_ORDINAL_AR[index]}: ${
                            getExerciseById(id)?.name || '—'
                          }`,
                      )
                      .join(' — ')} — اختر التمرين ${
                      SUPERSET_ORDINAL_AR[pendingSupersetIds.length]
                    }`
                  : `اختر ${getSupersetSizeFromMode(coursePickMode)} تمارين بالترتيب لتصير صف واحد مع علامة + (سوبر ${SUPERSET_SIZE_LABEL_AR[getSupersetSizeFromMode(coursePickMode)]})`}
                {pendingSupersetIds.length ? (
                  <button
                    type="button"
                    className="superset-cancel"
                    onClick={() => setPendingSupersetIds([])}
                  >
                    إلغاء
                  </button>
                ) : null}
              </p>
            )}

            <input
              className="exercise-search"
              placeholder="بحث ذكي عن التمارين (حرف بحرف)..."
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
            />

            <div className="section-tabs">
              <button
                type="button"
                className={courseSectionId === 'all' ? 'active' : ''}
                onClick={() => setCourseSectionId('all')}
              >
                الكل
              </button>
              {muscleSections.map((section) => (
                <button
                  type="button"
                  key={`course-tab-${section.id}`}
                  className={courseSectionId === section.id ? 'active' : ''}
                  onClick={() => setCourseSectionId(section.id)}
                >
                  {section.labelAr}
                </button>
              ))}
            </div>

            <div className="selected-exercises">
              {normalizeDayExercises(activeDayExercises).map((dayExercise) => {
                const displayName = getDaySlotDisplayName(
                  dayExercise,
                  getExerciseById,
                )
                if (!displayName) {
                  return null
                }
                return (
                  <span
                    key={`selected-${dayExercise.slotId}`}
                    className={isSupersetSlot(dayExercise) ? 'is-superset' : ''}
                  >
                    {isSupersetSlot(dayExercise) ? 'سوبر: ' : ''}
                    {displayName}
                    {dayExercise.prescription.trim()
                      ? ` (${dayExercise.prescription.trim()})`
                      : ''}
                  </span>
                )
              })}
              {activeDayExercises.length === 0 && (
                <span>اليوم {activeCourseDay + 1} بدون تمارين حاليا</span>
              )}
            </div>

            <div className="exercise-list">
              {groupedCourseExercises.map(({ section, exercises }) => (
                <div key={`course-group-${section.id}`} className="exercise-section-group">
                  <h4 className="exercise-section-title">
                    {section.labelAr} ({section.labelEn})
                  </h4>
                  {exercises.map((exercise) => {
                    const selected = isExerciseSelectedInDay(
                      activeDayExercises,
                      exercise.id,
                    )
                    const slot = getSlotForExercise(activeDayExercises, exercise.id)
                    const pendingIndex = pendingSupersetIds.indexOf(exercise.id)
                    const isPending = pendingIndex >= 0
                    return (
                      <div
                        key={`course-${exercise.id}`}
                        className={`exercise-item${isPending ? ' is-pending-super' : ''}${
                          slot && isSupersetSlot(slot) ? ' is-superset-item' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="exercise-pick"
                          onClick={() => handleCourseExercisePick(exercise.id)}
                        >
                          <strong>{exercise.name}</strong>
                          {exercise.notes ? <small>{exercise.notes}</small> : null}
                          {slot && isSupersetSlot(slot) ? (
                            <small className="superset-tag">
                              سوبر ست مع:{' '}
                              {slot.exerciseIds
                                .filter((id) => id !== exercise.id)
                                .map((id) => getExerciseById(id)?.name)
                                .filter(Boolean)
                                .join(' + ')}
                            </small>
                          ) : null}
                        </button>
                        <div className="exercise-item-actions">
                          <button
                            type="button"
                            className={
                              selected || isPending
                                ? isPending
                                  ? 'pending'
                                  : 'picked'
                                : ''
                            }
                            onClick={() => handleCourseExercisePick(exercise.id)}
                          >
                            {selected
                              ? slot && isSupersetSlot(slot)
                                ? 'سوبر'
                                : 'مضاف'
                              : isPending
                                ? SUPERSET_ORDINAL_AR[pendingIndex]
                                : isSupersetPickMode(coursePickMode)
                                  ? 'اختيار'
                                  : 'إضافة'}
                          </button>
                        </div>
                        {selected && slot && slot.exerciseIds[0] === exercise.id && (
                          <div className="exercise-prescription-input">
                            <label>
                              {isSupersetSlot(slot)
                                ? 'السِت / التكرار للسوبر ست'
                                : 'السِت / التكرار لهذا اليوم'}
                              <input
                                placeholder="مثال: 4 × 8 أو 4 x 12"
                                value={slot.prescription ?? ''}
                                onChange={(event) =>
                                  updateExercisePrescription(
                                    activeCourseDay,
                                    slot.slotId,
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
              {groupedCourseExercises.length === 0 && (
                <p className="empty-list">ماكو نتائج مطابقة للبحث أو القسم.</p>
              )}
            </div>
          </article>
        </div>
      )}
    </main>
  )
}

export default App
