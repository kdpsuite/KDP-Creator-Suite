# Phase 3 Integration Guide: Using New Components

This guide shows how to integrate Phase 3 components into your existing dashboard pages.

## 1. Using Custom Illustrations in EmptyState

**Before (Phase 1):**
```jsx
<EmptyState
  title="No Projects"
  description="Create your first project to get started"
  action={{ label: 'Create Project', onClick: handleCreate }}
/>
```

**After (Phase 3):**
```jsx
import { EmptyState } from '@/components/EmptyState'
import { EmptyProjectsIllustration } from '@/components/illustrations/EmptyProjectsIllustration'

<EmptyState
  icon={<EmptyProjectsIllustration />}
  title="No Projects"
  description="Create your first project to get started"
  action={{ label: 'Create Project', onClick: handleCreate }}
/>
```

## 2. Using Onboarding Tooltips

**In your main dashboard component:**
```jsx
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip'

export function Dashboard() {
  const { shouldShowTooltip, dismissTooltip } = useOnboarding()

  return (
    <div>
      <OnboardingTooltip
        tooltipId="create-project"
        content="Click here to create your first project"
        position="right"
        shouldShow={shouldShowTooltip('create-project')}
        onDismiss={dismissTooltip}
      >
        <button onClick={handleCreateProject}>Create Project</button>
      </OnboardingTooltip>

      <OnboardingTooltip
        tooltipId="upload-pdf"
        content="Upload a PDF to start processing"
        position="top"
        shouldShow={shouldShowTooltip('upload-pdf')}
        onDismiss={dismissTooltip}
      >
        <UploadArea />
      </OnboardingTooltip>
    </div>
  )
}
```

## 3. Using Page Transitions

**Wrap dashboard sections with PageTransition:**
```jsx
import { PageTransition } from '@/components/animations/PageTransition'

export function ProjectsSection() {
  return (
    <PageTransition className="space-y-4">
      <h2>Projects</h2>
      <ProjectList />
    </PageTransition>
  )
}
```

**With staggered children:**
```jsx
<PageTransition stagger={true}>
  {projects.map((project) => (
    <ProjectCard key={project.id} project={project} />
  ))}
</PageTransition>
```

## 4. Using Shimmer Animation on Skeleton Loaders

**Update SkeletonLoader component:**
```jsx
export function SkeletonLoader({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-muted rounded animate-pulse"
        />
      ))}
    </div>
  )
}
```

**Or add shimmer effect:**
```jsx
<div className="h-12 bg-muted rounded animate-shimmer" />
```

## 5. Updated EmptyState Component (Optional Enhancement)

If you want to enhance the existing EmptyState component to support icons:

```jsx
export function EmptyState({
  icon,
  title,
  description,
  action
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 animate-slide-in-up">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md transition-premium hover:brightness-110"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

## 6. localStorage Keys Used

The onboarding system uses these localStorage keys:
- `kdp_onboarding_completed`: Marks if user has completed onboarding
- `kdp_tooltip_{tooltipId}`: Tracks which tooltips have been dismissed

To reset onboarding for testing:
```javascript
// In browser console
localStorage.removeItem('kdp_onboarding_completed')
localStorage.clear() // Or selectively clear tooltip keys
```

## 7. CSS Classes Available

All Phase 3 animations are available as Tailwind utilities:
- `.animate-slide-in-up`: Fade + slide up (300ms)
- `.animate-fade-in`: Fade only (200ms)
- `.animate-shimmer`: Shimmer effect (2s loop)
- `.animate-pulse`: Pulse effect (2s loop)
- `.transition-premium`: Smooth transitions (300ms cubic-bezier)
- `.glass`: Glassmorphism effect

## 8. Testing Checklist

- [ ] Illustrations render correctly in light and dark modes
- [ ] Onboarding tooltips show on first visit only
- [ ] Tooltips dismiss when X button is clicked
- [ ] Page transitions are smooth and not jarring
- [ ] Shimmer animation works on skeleton loaders
- [ ] All animations respect `prefers-reduced-motion`

## 9. Performance Notes

- All animations use CSS (no JavaScript overhead)
- SVG illustrations are lightweight (~2KB each)
- localStorage checks happen once on mount
- No external animation libraries needed

## Next Steps

1. Update dashboard pages to use new illustrations
2. Add onboarding tooltips to key user flows
3. Wrap main sections with PageTransition
4. Test across browsers and devices
5. Monitor Vercel deployment for performance
