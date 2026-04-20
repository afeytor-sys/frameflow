// Theme-aware Fotonizer logo.
// light theme  → /logo-light.jpg (white background)
// dark + mono  → /logo-dark.jpg  (black background)
// Switching is done via CSS classes in globals.css — works in server and client components.

interface LogoProps {
  className?: string
  style?: React.CSSProperties
  alt?: string
}

export function Logo({ className = '', style, alt = 'Fotonizer' }: LogoProps) {
  return (
    <>
      <img
        src="/logo-light.jpg"
        alt={alt}
        className={`logo-light ${className}`}
        style={style}
      />
      <img
        src="/logo-dark.jpg"
        alt=""
        aria-hidden="true"
        className={`logo-dark ${className}`}
        style={style}
      />
    </>
  )
}
