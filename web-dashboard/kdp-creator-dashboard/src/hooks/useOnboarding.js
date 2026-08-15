import { useState, useEffect } from 'react'

/** Bumped so users stuck after the early-complete bug get tooltips once. */
const ONBOARDING_KEY = 'kdp_onboarding_completed_v2'
const TOOLTIP_VISIBILITY_KEY = 'kdp_tooltip_'
const TOUR_STEP_KEY = 'kdp_onboarding_tour_step_v2'

export const TOUR_STEPS = [
  {
    id: 'welcome',
    tab: 'overview',
    title: 'Welcome to KDP Creator Suite',
    body: 'A short tour of the core tools. You can skip anytime — tip callouts stay until dismissed.',
  },
  {
    id: 'pdf-upload-tooltip',
    tab: 'tools',
    title: 'Convert PDFs for KDP',
    body: 'Upload a PDF here to format it for Amazon KDP trim sizes and bleed.',
  },
  {
    id: 'image-upload-tooltip',
    tab: 'tools',
    title: 'Image to coloring page',
    body: 'Turn a photo or illustration into a print-ready coloring page.',
  },
  {
    id: 'analytics-overview-tooltip',
    tab: 'analytics',
    title: 'Usage analytics',
    body: 'Track conversions and batch activity for the last 30 days.',
  },
  {
    id: 'batch-queue-tooltip',
    tab: 'batch',
    title: 'Batch processing',
    body: 'Queue multiple images, reorder pages, and export one KDP-ready PDF.',
  },
  {
    id: 'settings-overview-tooltip',
    tab: 'settings',
    title: 'Settings & support',
    body: 'Account email, support contact, and system status live here.',
  },
]

const REQUIRED_TOOLTIP_IDS = TOUR_STEPS.filter((s) => s.id !== 'welcome').map((s) => s.id)

function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_KEY) === 'true'
}

function loadDismissedTooltips() {
  const tooltips = {}
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(TOOLTIP_VISIBILITY_KEY)) {
      const tooltipId = key.slice(TOOLTIP_VISIBILITY_KEY.length)
      tooltips[tooltipId] = localStorage.getItem(key) === 'true'
    }
  }
  return tooltips
}

function allRequiredDismissed(dismissed) {
  return REQUIRED_TOOLTIP_IDS.every((id) => dismissed[id] === true)
}

function loadTourStep() {
  const raw = Number(localStorage.getItem(TOUR_STEP_KEY) || '0')
  if (Number.isNaN(raw) || raw < 0) return 0
  return Math.min(raw, TOUR_STEPS.length - 1)
}

export function useOnboarding() {
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [visibleTooltips, setVisibleTooltips] = useState({})
  const [tourStep, setTourStep] = useState(0)

  useEffect(() => {
    if (isOnboardingComplete()) {
      setIsFirstVisit(false)
      setVisibleTooltips({})
      return
    }

    setIsFirstVisit(true)
    setVisibleTooltips(loadDismissedTooltips())
    setTourStep(loadTourStep())
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    localStorage.removeItem(TOUR_STEP_KEY)
    setIsFirstVisit(false)
  }

  const dismissTooltip = (tooltipId) => {
    localStorage.setItem(`${TOOLTIP_VISIBILITY_KEY}${tooltipId}`, 'true')
    setVisibleTooltips((prev) => {
      const next = { ...prev, [tooltipId]: true }
      if (allRequiredDismissed(next)) {
        localStorage.setItem(ONBOARDING_KEY, 'true')
        localStorage.removeItem(TOUR_STEP_KEY)
        setIsFirstVisit(false)
      }
      return next
    })
  }

  const shouldShowTooltip = (tooltipId) => {
    if (!isFirstVisit || isOnboardingComplete()) return false
    return !visibleTooltips[tooltipId]
  }

  const nextTourStep = () => {
    setTourStep((prev) => {
      const next = prev + 1
      if (next >= TOUR_STEPS.length) {
        completeOnboarding()
        return prev
      }
      localStorage.setItem(TOUR_STEP_KEY, String(next))
      return next
    })
  }

  const skipTour = () => {
    completeOnboarding()
  }

  const currentTour = isFirstVisit ? TOUR_STEPS[tourStep] : null

  return {
    isFirstVisit,
    shouldShowTooltip,
    dismissTooltip,
    completeOnboarding,
    tourStep,
    tourTotal: TOUR_STEPS.length,
    currentTour,
    nextTourStep,
    skipTour,
  }
}
