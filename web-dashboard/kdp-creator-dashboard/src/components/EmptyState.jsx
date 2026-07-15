import { isValidElement } from 'react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

export function EmptyState({
  icon: iconProp = Inbox,
  title = 'No data yet',
  description = 'Get started by creating your first item',
  action,
  actionLabel = 'Create',
  variant = 'default'
}) {
  const iconColor = {
    default: 'text-muted-foreground',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    success: 'text-green-500'
  }[variant]

  const resolvedAction = typeof action === 'object' && action?.onClick ? action.onClick : action
  const resolvedActionLabel =
    typeof action === 'object' && action?.label ? action.label : actionLabel

  const renderIcon = () => {
    if (isValidElement(iconProp)) {
      return iconProp
    }

    const IconComponent = iconProp
    return <IconComponent className={`w-8 h-8 ${iconColor}`} />
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`mb-4 p-3 rounded-full bg-muted`}>
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{description}</p>
      {resolvedAction && (
        <Button onClick={resolvedAction} size="sm">
          {resolvedActionLabel}
        </Button>
      )}
    </div>
  )
}
