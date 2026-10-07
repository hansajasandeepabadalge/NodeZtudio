const paths = {
    select: 'M4 3l7 18 3-7 7-3z',
    draw: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    box: 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16',
    paint: 'M14 3l7 7-5 5-7-7zM9 8l-3 3 7 7 3-3M6 15l-3 3v3h3l4-4',
    erase: 'M20 20H7l-4-4L13 6l7 7-7 7M7 12l7 7',
    fill: 'M4 11l7-7 9 9-7 7zM4 11l9 2h7M9 2l5 5M21 17v4',
    pick: 'M16 3l5 5-3 3-5-5zM13 6l-9 9v5h5l9-9M4 15l5 5',
    undo: 'M9 4L4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3',
    redo: 'M15 4l5 5-5 5M20 9H10a6 6 0 0 0 0 12h3',
    grid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
    reset: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
    save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11zM7 21v-8h10v8M7 3v5h8V3',
    load: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12',
    clear: 'M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V3h6v3',
    cube: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
    close: 'M6 6l12 12M6 18L18 6',
} as const;

export type EditorIconName = keyof typeof paths;

export default function EditorIcon({ name, size = 18 }: { name: EditorIconName; size?: number }) {
    return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
