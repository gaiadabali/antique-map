import styles from './Hairline.module.css'

type Props = {
  direction?: 'horizontal' | 'vertical'
  strength?: 'hair' | 'strong'
}

export function Hairline({ direction = 'horizontal', strength = 'hair' }: Props) {
  return (
    <hr
      aria-hidden="true"
      className={[
        styles.hairline,
        direction === 'vertical' ? styles.vertical : styles.horizontal,
        strength === 'strong' ? styles.strong : styles.hair,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
