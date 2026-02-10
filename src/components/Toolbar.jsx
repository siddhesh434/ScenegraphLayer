/* ═══════════════════════════════════════════════════
   Toolbar.jsx — Left sidebar with all canvas tools
   ═══════════════════════════════════════════════════
   Tool groups:
     1. Selection: Select, Text
     2. Drawing:   Freehand, Line, Rectangle, Circle, Polygon, Arrow
*/
import React from 'react';
import { MODES } from '../constants';

/* ── SVG Icons ── */
const icons = {
    [MODES.SELECT]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
        </svg>
    ),
    [MODES.TEXT]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M8 20h8" />
        </svg>
    ),
    [MODES.FREEHAND]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
        </svg>
    ),
    [MODES.LINE]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
    ),
    [MODES.RECTANGLE]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
    ),
    [MODES.CIRCLE]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
        </svg>
    ),
    [MODES.POLYGON]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l9 7-3.5 10h-11L3 9z" />
        </svg>
    ),
    [MODES.ARROW]: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5" />
            <polyline points="10 5 19 5 19 14" />
        </svg>
    ),
};

const SHORTCUTS = {
    [MODES.SELECT]: 'V',
    [MODES.TEXT]: 'T',
    [MODES.FREEHAND]: 'P',
    [MODES.LINE]: 'L',
    [MODES.RECTANGLE]: 'R',
    [MODES.CIRCLE]: 'C',
    [MODES.POLYGON]: 'G',
    [MODES.ARROW]: 'A',
};

export default function Toolbar({ mode, setMode }) {
    const selectionTools = [MODES.SELECT, MODES.TEXT];
    const drawingTools = [
        MODES.FREEHAND, MODES.LINE, MODES.RECTANGLE,
        MODES.CIRCLE, MODES.ARROW,
    ];

    return (
        <div className="toolbar">
            <div className="toolbar-brand">✏️</div>

            {/* Selection tools */}
            <div className="toolbar-group">
                {selectionTools.map((m) => (
                    <button
                        key={m}
                        className={`tool-btn ${mode === m ? 'active' : ''}`}
                        onClick={() => setMode(m)}
                        title={`${m.charAt(0).toUpperCase() + m.slice(1)} (${SHORTCUTS[m]})`}
                    >
                        {icons[m]}
                    </button>
                ))}
            </div>

            <div className="toolbar-divider" />

            {/* Drawing tools */}
            <div className="toolbar-group">
                {drawingTools.map((m) => (
                    <button
                        key={m}
                        className={`tool-btn ${mode === m ? 'active' : ''}`}
                        onClick={() => setMode(m)}
                        title={`${m.charAt(0).toUpperCase() + m.slice(1)} (${SHORTCUTS[m]})`}
                    >
                        {icons[m]}
                    </button>
                ))}
            </div>
        </div>
    );
}
