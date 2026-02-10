import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

/* ─── Constants ───────────────────────────────────── */
const COLORS = [
    '#FFFFFF', '#FF6B6B', '#FFD93D', '#6BCB77',
    '#4D96FF', '#9B59B6', '#FF8A5C', '#EA4C89',
    '#00D2FF', '#3D3D3D',
];

const DEFAULT_ANNOTATION = {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'normal',
    fontStyle: 'normal',
};

let _idCounter = 0;
const genId = () => `ann_${++_idCounter}`;

/* ─── AnnotationNode Component ────────────────────── */
function AnnotationNode({
    annotation,
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
            el.focus();
            if (el.value) {
                el.select();
            }
            autoResize(el);
        }
    }, [isEditing]);

    const baseStyle = {
        fontSize: `${annotation.fontSize}px`,
        color: annotation.color,
        fontWeight: annotation.fontWeight,
        fontStyle: annotation.fontStyle,
    };

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
                onMouseDown={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div
            className={`ann-display ${isSelected ? 'ann-selected' : ''}`}
            style={baseStyle}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onStartEdit();
            }}
        >
            {annotation.text || 'Double-click to edit'}
        </div>
    );
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

/* ─── Toolbar Icons (SVG) ─────────────────────────── */
const SelectIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
    </svg>
);

const TextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" />
        <path d="M12 4v16" />
        <path d="M8 20h8" />
    </svg>
);

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
);

/* ─── Main App ────────────────────────────────────── */
function App() {
    const [viewState, setViewState] = useState({
        longitude: 72.8777,
        latitude: 19.076,
        zoom: 12,
    });

    const [annotations, setAnnotations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [mode, setMode] = useState('select'); // 'select' | 'text'

    const selectedAnn = useMemo(
        () => annotations.find((a) => a.id === selectedId),
        [annotations, selectedId],
    );

    /* ── Handlers ── */
    const updateAnnotation = useCallback((id, updates) => {
        setAnnotations((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        );
    }, []);

    const deleteAnnotation = useCallback(
        (id) => {
            setAnnotations((prev) => prev.filter((a) => a.id !== id));
            if (selectedId === id) setSelectedId(null);
            if (editingId === id) setEditingId(null);
        },
        [selectedId, editingId],
    );

    const handleMapClick = useCallback(
        (e) => {
            if (mode === 'text') {
                console.log("Hello");
                const id = genId();
                setAnnotations((prev) => [
                    ...prev,
                    {
                        id,
                        text: '',
                        longitude: e.lngLat.lng,
                        latitude: e.lngLat.lat,
                        ...DEFAULT_ANNOTATION,
                    },
                ]);
                console.log("Hello");
                setSelectedId(id);
                setEditingId(id);
            } else {
                setSelectedId(null);
                setEditingId(null);
            }
        },
        [mode],
    );

    const handleDragEnd = useCallback(
        (id, e) => {
            updateAnnotation(id, {
                longitude: e.lngLat.lng,
                latitude: e.lngLat.lat,
            });
        },
        [updateAnnotation],
    );

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const onKey = (e) => {
            if (editingId) return;
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    if (selectedId) deleteAnnotation(selectedId);
                    break;
                case 'Escape':
                    setSelectedId(null);
                    setEditingId(null);
                    setMode('select');
                    break;
                case 't':
                case 'T':
                    setMode('text');
                    break;
                case 'v':
                case 'V':
                    setMode('select');
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedId, editingId, deleteAnnotation]);

    /* ── Render ── */
    return (
        <div className="app-container">
            {/* ── Left Toolbar ── */}
            <div className="toolbar">
                <div className="toolbar-brand">✏️</div>

                <div className="toolbar-group">
                    <button
                        className={`tool-btn ${mode === 'select' ? 'active' : ''}`}
                        onClick={() => setMode('select')}
                        title="Select (V)"
                    >
                        <SelectIcon />
                    </button>
                    <button
                        className={`tool-btn ${mode === 'text' ? 'active' : ''}`}
                        onClick={() => setMode('text')}
                        title="Add Text (T)"
                    >
                        <TextIcon />
                    </button>
                </div>
            </div>

            {/* ── Properties Panel (top bar) ── */}
            {selectedAnn && !editingId && (
                <div className="props-panel">
                    {/* Font Size */}
                    <div className="prop-group">
                        <span className="prop-label">Size</span>
                        <div className="size-controls">
                            <button
                                className="size-btn"
                                onClick={() =>
                                    updateAnnotation(selectedId, {
                                        fontSize: Math.max(10, selectedAnn.fontSize - 2),
                                    })
                                }
                            >
                                −
                            </button>
                            <span className="size-value">{selectedAnn.fontSize}</span>
                            <button
                                className="size-btn"
                                onClick={() =>
                                    updateAnnotation(selectedId, {
                                        fontSize: Math.min(80, selectedAnn.fontSize + 2),
                                    })
                                }
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="prop-divider" />

                    {/* Colors */}
                    <div className="prop-group">
                        <span className="prop-label">Color</span>
                        <div className="color-swatches">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={`swatch ${selectedAnn.color === c ? 'swatch-active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => updateAnnotation(selectedId, { color: c })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="prop-divider" />

                    {/* Bold / Italic */}
                    <div className="prop-group">
                        <button
                            className={`style-toggle ${selectedAnn.fontWeight === 'bold' ? 'active' : ''}`}
                            onClick={() =>
                                updateAnnotation(selectedId, {
                                    fontWeight:
                                        selectedAnn.fontWeight === 'bold' ? 'normal' : 'bold',
                                })
                            }
                        >
                            B
                        </button>
                        <button
                            className={`style-toggle italic ${selectedAnn.fontStyle === 'italic' ? 'active' : ''}`}
                            onClick={() =>
                                updateAnnotation(selectedId, {
                                    fontStyle:
                                        selectedAnn.fontStyle === 'italic' ? 'normal' : 'italic',
                                })
                            }
                        >
                            I
                        </button>
                    </div>

                    <div className="prop-divider" />

                    {/* Delete */}
                    <button
                        className="delete-btn"
                        onClick={() => deleteAnnotation(selectedId)}
                        title="Delete (Del)"
                    >
                        <TrashIcon />
                    </button>
                </div>
            )}

            {/* ── Mode Indicator ── */}
            {mode === 'text' && (
                <div className="mode-badge">
                    <span className="mode-dot" />
                    Click on map to place text
                </div>
            )}

            {/* ── Map ── */}
            <Map
                {...viewState}
                onMove={(e) => setViewState(e.viewState)}
                onClick={handleMapClick}
                style={{ width: '100%', height: '100%' }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                cursor={mode === 'text' ? 'crosshair' : 'default'}
                dragPan={mode !== 'text'}
                dragRotate={mode !== 'text'}
                scrollZoom={mode !== 'text'}
                doubleClickZoom={mode !== 'text'}
                touchZoom={mode !== 'text'}
                touchRotate={mode !== 'text'}
                keyboard={mode !== 'text'}
            >
                {annotations.map((ann) => (
                    <Marker
                        key={ann.id}
                        longitude={ann.longitude}
                        latitude={ann.latitude}
                        draggable={
                            mode === 'select' &&
                            selectedId === ann.id &&
                            editingId !== ann.id
                        }
                        onDragEnd={(e) => handleDragEnd(ann.id, e)}
                        anchor="center"
                    >
                        <AnnotationNode
                            annotation={ann}
                            isSelected={selectedId === ann.id}
                            isEditing={editingId === ann.id}
                            onSelect={() => {
                                if (mode === 'select') {
                                    setSelectedId(ann.id);
                                }
                            }}
                            onStartEdit={() => {
                                setSelectedId(ann.id);
                                setEditingId(ann.id);
                            }}
                            onFinishEdit={(text) => {
                                if (!text.trim()) {
                                    deleteAnnotation(ann.id);
                                } else {
                                    updateAnnotation(ann.id, { text });
                                }
                                setEditingId(null);
                            }}
                        />
                    </Marker>
                ))}
            </Map>
        </div>
    );
}

export default App;
