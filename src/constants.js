/* ═══════════════════════════════════════════════════
   constants.js — Shared constants for Map Canvas
   ═══════════════════════════════════════════════════ */

/** All available tool modes */
export const MODES = {
    SELECT: 'select',
    TEXT: 'text',
    FREEHAND: 'freehand',
    LINE: 'line',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    ARROW: 'arrow',
};

/** Modes that involve drawing on the map */
export const DRAWING_MODES = new Set([
    MODES.FREEHAND, MODES.LINE, MODES.RECTANGLE,
    MODES.CIRCLE, MODES.ARROW,
]);

/** Draw modes that use drag interaction (pointerdown → move → up) */
export const DRAG_DRAW_MODES = new Set([
    MODES.FREEHAND, MODES.LINE, MODES.RECTANGLE,
    MODES.CIRCLE, MODES.ARROW,
]);

/** Preset color palette */
export const COLORS = [
    '#FFFFFF', '#FF6B6B', '#FFD93D', '#6BCB77',
    '#4D96FF', '#9B59B6', '#FF8A5C', '#EA4C89',
    '#00D2FF', '#3D3D3D',
];

/** Default style for new text annotations */
export const DEFAULT_TEXT_STYLE = {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'normal',
    fontStyle: 'normal',
};

/** Default style for new drawings */
export const DEFAULT_DRAW_STYLE = {
    strokeColor: '#4D96FF',
    strokeWidth: 3,
    fillColor: '#4D96FF',
    fillOpacity: 0.15,
    opacity: 1,
};

/** Mode labels for the mode badge shown at bottom */
export const MODE_LABELS = {
    [MODES.TEXT]: 'Click on map to place text',
    [MODES.FREEHAND]: 'Click and drag to draw',
    [MODES.LINE]: 'Click and drag to draw a line',
    [MODES.RECTANGLE]: 'Click and drag to draw a rectangle',
    [MODES.CIRCLE]: 'Click and drag to draw a circle',
    [MODES.ARROW]: 'Click and drag to draw an arrow',
};

let _idCounter = 0;
export const genId = (prefix = 'item') => `${prefix}_${++_idCounter}`;
