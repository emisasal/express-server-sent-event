import styles from "./card.module.css"

const Card = ({ event }: { event: string }) => {
  return <div className={styles.card}>{event}</div>
}

export default Card
