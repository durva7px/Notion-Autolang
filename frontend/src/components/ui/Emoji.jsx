export default function Emoji({ src, label, className = '', ...props }) {
  return <img src={src} alt={label ?? ''} aria-hidden={label ? undefined : true} className={`emoji ${className}`} {...props} />
}
