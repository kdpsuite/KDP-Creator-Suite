import { useState, useEffect } from 'react'

const ONBOARDING_KEY = 'kdp_onboarding_completed'
const TOOLTIP_VISIBILITY_KEY = 'kdp_tooltip_'

export function useOnboarding() {
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [visibleTooltips, setVisibleTooltips] = useState({})

  useEffect(() => {
    // Check if this is the first visit
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setIsFirstVisit(true)
      localStorage.setItem(ONBOARDING_KEY, 'true')
    }

    // Load tooltip visibility states
    const tooltips = {}
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(TOOLTIP_VISIBILITY_KEY)) {
        const tooltipId = key.replace(TOOLTIP_VISIBILITY_KEY, '')
        tooltips[tooltipId] = localStorage.getItem(key) === 'true'
      }
    })
    setVisibleTooltips(tooltips)
  }, [])

  const dismissTooltip = (tooltipId) => {
    localStorage.setItem(`${TOOLTIP_VISIBILITY_KEY}${tooltipId}`, 'true')
    setVisibleTooltips(prev => ({
      ...prev,
      [tooltipId]: true
    }))
  }

  const shouldShowTooltip = (tooltipId) => {
    return isFirstVisit && !visibleTooltips[tooltipId]
  }

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsFirstVisit(false)
  }

  return {
    isFirstVisit,
    shouldShowTooltip,
    dismissTooltip,
    completeOnboarding
  }
}
