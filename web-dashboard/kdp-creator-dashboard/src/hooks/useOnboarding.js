import { useState, useEffect } from 'react'

/** Bumped so users stuck after the early-complete bug get tooltips once. */
const ONBOARDING_KEY = 'kdp_onboarding_completed_v2'
const TOOLTIP_VISIBILITY_KEY = 'kdp_tooltip_'

const REQUIRED_TOOLTIP_IDS = [
  'pdf-upload-tooltip',
  'image-upload-tooltip',
  'analytics-overview-tooltip',
  'batch-queue-tooltip',
  'settings-overview-tooltip',
]

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

export function useOnboarding() {
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [visibleTooltips, setVisibleTooltips] = useState({})

  useEffect(() => {
    if (isOnboardingComplete()) {
      setIsFirstVisit(false)
      setVisibleTooltips({})
      return
    }

    setIsFirstVisit(true)
    setVisibleTooltips(loadDismissedTooltips())
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsFirstVisit(false)
  }

  const dismissTooltip = (tooltipId) => {
    localStorage.setItem(`${TOOLTIP_VISIBILITY_KEY}${tooltipId}`, 'true')
    setVisibleTooltips((prev) => {
      const next = { ...prev, [tooltipId]: true }
      if (allRequiredDismissed(next)) {
        localStorage.setItem(ONBOARDING_KEY, 'true')
        setIsFirstVisit(false)
      }
      return next
    })
  }

  const shouldShowTooltip = (tooltipId) => {
    if (!isFirstVisit || isOnboardingComplete()) return false
    return !visibleTooltips[tooltipId]
  }

  return {
    isFirstVisit,
    shouldShowTooltip,
    dismissTooltip,
    completeOnboarding,
  }
}
