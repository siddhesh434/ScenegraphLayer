/* ═══════════════════════════════════════════════════
   PropertiesPanel.jsx — Top bar with context-aware controls
   ═══════════════════════════════════════════════════
   Shows different controls based on selection type:
   - Text annotation: font size, color, bold/italic
   - Drawing: stroke color, stroke width, fill color, fill opacity
   - Common: delete button
*/
import React from 'react';
import { COLORS } from '../constants';

/* ── Shared delete icon ── */
const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
);

/* ── Text Properties ── */
function TextProps({ annotation, onUpdate }) {
    return (
        <>
            {/* Font Size */}
            <div className="prop-group">
                <span className="prop-label">Size</span>
                <div className="size-controls">
                    <button className="size-btn" onClick={() => onUpdate({ fontSize: Math.max(10, annotation.fontSize - 2) })}>−</button>
                    <span className="size-value">{annotation.fontSize}</span>
                    <button className="size-btn" onClick={() => onUpdate({ fontSize: Math.min(80, annotation.fontSize + 2) })}>+</button>
                </div>
            </div>

            <div className="prop-divider" />

            {/* Color */}
            <div className="prop-group">
                <span className="prop-label">Color</span>
                <div className="color-swatches">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            className={`swatch ${annotation.color === c ? 'swatch-active' : ''}`}
                            style={{ background: c }}
                            onClick={() => onUpdate({ color: c })}
                        />
                    ))}
                </div>
            </div>

            <div className="prop-divider" />

            {/* Bold / Italic */}
            <div className="prop-group">
                <button
                    className={`style-toggle ${annotation.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={() => onUpdate({ fontWeight: annotation.fontWeight === 'bold' ? 'normal' : 'bold' })}
                >B</button>
                <button
                    className={`style-toggle italic ${annotation.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={() => onUpdate({ fontStyle: annotation.fontStyle === 'italic' ? 'normal' : 'italic' })}
                >I</button>
            </div>
        </>
    );
}

/* ── Drawing Properties ── */
function DrawingProps({ style, onUpdate }) {
    const isLineType = ['freehand', 'line', 'arrow'].includes(style.drawType);

    return (
        <>
            {/* Stroke Color */}
            <div className="prop-group">
                <span className="prop-label">Stroke</span>
                <div className="color-swatches">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            className={`swatch ${style.strokeColor === c ? 'swatch-active' : ''}`}
                            style={{ background: c }}
                            onClick={() => onUpdate({ strokeColor: c })}
                        />
                    ))}
                </div>
            </div>

            <div className="prop-divider" />

            {/* Stroke Width */}
            <div className="prop-group">
                <span className="prop-label">Width</span>
                <div className="size-controls">
                    <button className="size-btn" onClick={() => onUpdate({ strokeWidth: Math.max(1, style.strokeWidth - 1) })}>−</button>
                    <span className="size-value">{style.strokeWidth}</span>
                    <button className="size-btn" onClick={() => onUpdate({ strokeWidth: Math.min(20, style.strokeWidth + 1) })}>+</button>
                </div>
            </div>

            {!isLineType && (
                <>
                    <div className="prop-divider" />

                    {/* Fill Color */}
                    <div className="prop-group">
                        <span className="prop-label">Fill</span>
                        <div className="color-swatches">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={`swatch ${style.fillColor === c ? 'swatch-active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => onUpdate({ fillColor: c })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="prop-divider" />

                    {/* Fill Opacity */}
                    <div className="prop-group">
                        <span className="prop-label">Opacity</span>
                        <input
                            type="range"
                            className="opacity-slider"
                            min="0"
                            max="1"
                            step="0.05"
                            value={style.fillOpacity}
                            onChange={(e) => onUpdate({ fillOpacity: parseFloat(e.target.value) })}
                        />
                        <span className="size-value">{Math.round(style.fillOpacity * 100)}%</span>
                    </div>
                </>
            )}
        </>
    );
}

/* ── Main PropertiesPanel ── */
export default function PropertiesPanel({
    type,           // 'text' | 'drawing' | null
    annotation,     // text annotation object (when type === 'text')
    drawingStyle,   // drawing style object (when type === 'drawing')
    onUpdate,       // (updates) => void
    onDelete,       // () => void
}) {
    if (!type) return null;

    return (
        <div className="props-panel">
            {type === 'text' && <TextProps annotation={annotation} onUpdate={onUpdate} />}
            {type === 'drawing' && <DrawingProps style={drawingStyle} onUpdate={onUpdate} />}

            <div className="prop-divider" />

            <button className="delete-btn" onClick={onDelete} title="Delete (Del)">
                <TrashIcon />
            </button>
        </div>
    );
}
