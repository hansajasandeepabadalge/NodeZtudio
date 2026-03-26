// Full-screen loading spinner — shown while the scene initialises.
export default function Loader() {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,14,20,0.9)',
            color: '#e8ecf0',
            fontSize: '14px',
            zIndex: 999,
        }}>
            Loading…
        </div>
    );
}
