import { Button } from '@/components/ui/button.jsx'

export function OnboardingTour({ step, total, title, body, onNext, onSkip }) {
  if (!title) return null

  const isLast = step >= total - 1

  return (
    <div
      className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Product tour"
    >
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Tour {step + 1} of {total}
        </p>
        <p className="font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <Button size="sm" onClick={onNext}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
