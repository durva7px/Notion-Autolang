import cursor from '../../assets/icons/cursor.png'
import styles from './Cursor.module.css'

/** Decorative pointer arrow. `rotate` is in degrees. */
export default function Cursor({ rotate = 0, className = '', style, ...props }) {
  return (
    <img
      src={cursor}
      alt=""
      aria-hidden="true"
      className={`${styles.cursor} ${className}`}
      style={{ '--cursor-rotate': `${rotate}deg`, ...style }}
      data-animate="cursor"
      {...props}
    />
  )
}
