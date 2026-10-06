import { TEXT_COLOR, SETTINGS } from '@/common/settings';

// Full-screen loading spinner — shown while the scene initialises.
export default function Loader() {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: SETTINGS.ui.loaderBackground,
            color: TEXT_COLOR,
            fontSize: '14px',
            zIndex: 999,
        }}>
            Loading…
        </div>
    );
}
