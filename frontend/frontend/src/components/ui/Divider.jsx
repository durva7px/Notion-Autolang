import styles from './Divider.module.css'

export default function Divider({ className = '', ...props }) {
  return <hr className={`${styles.divider} ${className}`} {...props} />
}
