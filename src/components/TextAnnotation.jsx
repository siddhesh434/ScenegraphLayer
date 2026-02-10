/* ═══════════════════════════════════════════════════
   TextAnnotation.jsx — Editable text annotation node
   ═══════════════════════════════════════════════════
   Rendered inside a react-map-gl <Marker>.
   - Display mode: styled text div (click to select, dblclick to edit)
   - Edit mode: auto-resizing textarea
*/
import React, { useRef, useEffect } from 'react';

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

export default function TextAnnotation({
    annotation,   // { id, text, fontSize, color, fontWeight, fontStyle }
    isSelected,
    isEditing,
    onSelect,
    onStartEdit,
    onFinishEdit,
}) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            const el = inputRef.current;
            // distinct timeout to ensure focus works after render layout
            setTimeout(() => {
                el.focus();
                if (el.value) el.select();
                autoResize(el);
            }, 50);
        }
    }, [isEditing]);

    const baseStyle = {
        fontSize: `${annotation.fontSize}px`,
        color: annotation.color,
        fontWeight: annotation.fontWeight,
        fontStyle: annotation.fontStyle,
    };

    /* ── Edit mode ── */
    if (isEditing) {
        return (
            <textarea
                ref={inputRef}
                className="ann-textarea"
                defaultValue={annotation.text}
                style={baseStyle}
                onBlur={(e) => onFinishEdit(e.target.value)}
                onInput={(e) => autoResize(e.target)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.target.blur();
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.target.blur();
                    }
                    e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Enter text..."
                autoFocus
            />
        );
    }

    /* ── Display mode ── */
    return (
        <div
            className={`ann-display ${isSelected ? 'ann-selected' : ''}`}
            style={baseStyle}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
        >
            {annotation.text || 'Double-click to edit'}
        </div>
    );
}
