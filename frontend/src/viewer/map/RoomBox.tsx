import type { RoomRect } from '../lib/roomLayout';
import { roomFillColor } from '../lib/roomColors';
import styles from './RoomBox.module.css';

interface RoomBoxProps {
  name: string;
  rect: RoomRect;
}

/** One schematic room rectangle + label. Pure presentation — MapCanvas owns layout/occupancy. */
export function RoomBox({ name, rect }: RoomBoxProps) {
  return (
    <div
      className={styles.room}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: roomFillColor(name) }}
    >
      <span className={styles.label}>{name}</span>
    </div>
  );
}
