import React from 'react'

export function PageTransition({
  children,
  className = '',
  stagger = false,
  delay = 0
}) {
  const baseClasses = 'animate-slide-in-up'
  const style = {
    animationDelay: `${delay}ms`
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={style}
    >
      {stagger ? (
        // If stagger is true, wrap children with staggered animations
        React.Children.map(children, (child, index) => (
          <div
            key={index}
            className="animate-slide-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {child}
          </div>
        ))
      ) : (
        children
      )}
    </div>
  )
}
