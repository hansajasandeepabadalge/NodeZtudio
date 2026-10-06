'use client';

import { PALETTE } from '@/common/settings';
import styles from './Sidebar.module.css';

export default function ColorPicker({ activeColor, onColorChange }: {
    activeColor: string;
    onColorChange: (color: string) => void;
}) {
    return <div className={styles.colorPicker}>
        <div className={styles.colorInputRow}>
            <input aria-label="Custom paint color" type="color" value={activeColor} onChange={event => onColorChange(event.target.value)} />
            <span>{activeColor.toUpperCase()}</span>
            <span className={styles.muted}>Paint color</span>
        </div>
        <div className={styles.swatches}>
            {PALETTE.map(color => <button key={color} type="button" aria-label={`Use color ${color}`} aria-pressed={activeColor.toLowerCase() === color}
                onClick={() => onColorChange(color)} title={color} style={{ background: color }} />)}
        </div>
    </div>;
}
