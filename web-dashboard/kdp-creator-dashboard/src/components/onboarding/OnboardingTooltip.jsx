import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '../Tooltip'

export function OnboardingTooltip({
  children,
  content,
  tooltipId,
  onDismiss,
  position = 'top',
  shouldShow = true
}) {
  const [isVisible, setIsVisible] = useState(shouldShow)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.(tooltipId)
  }

  if (!isVisible) {
    return children
  }

  return (
    <div className="relative inline-block">
      <Tooltip
        content={
          <div className="flex items-center gap-2">
            <span>{content}</span>
            <button
              onClick={handleDismiss}
              className="ml-2 hover:opacity-70 transition-opacity"
              aria-label="Dismiss tooltip"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        }
        position={position}
      >
        {children}
      </Tooltip>
    </div>
  )
}
