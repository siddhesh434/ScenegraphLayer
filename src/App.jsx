/* ═══════════════════════════════════════════════════
   App.jsx — Map Canvas with Text Annotations & Drawing
   ═══════════════════════════════════════════════════
   Architecture:
     - react-map-gl Map for base map + Source/Layer for drawings
     - Markers for text annotations
     - Transparent overlay div for drawing interaction
     - State: annotations[], drawings (GeoJSON FC), drawStyle, mode

   File map:
     constants.js           → modes, colors, defaults
     utils/geoHelpers.js    → geometry builders & preview
     components/Toolbar.jsx → tool buttons
     components/PropertiesPanel.jsx → context-aware styling
     components/TextAnnotation.jsx  → editable text marker
*/

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';

import {
    MODES, DRAWING_MODES, DRAG_DRAW_MODES,
    DEFAULT_TEXT_STYLE,
    DEFAULT_DRAW_STYLE, MODE_LABELS, genId,
} from './constants';
import { buildFeature, buildArrowhead, buildPreview } from './utils/geoHelpers';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import TextAnnotation from './components/TextAnnotation';

/* ── Maplibre layer paint specs (data-driven from feature properties) ── */
const FILL_PAINT = {
    'fill-color': ['coalesce', ['get', 'fillColor'], '#4D96FF'],
    'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.15],
};
const LINE_PAINT = {
    'line-color': ['coalesce', ['get', 'strokeColor'], '#4D96FF'],
    'line-width': ['coalesce', ['get', 'strokeWidth'], 2],
    'line-opacity': ['coalesce', ['get', 'opacity'], 1],
};
const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' };

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

/* ═══════════════════════════════════════════════════
   Main App Component
   ═══════════════════════════════════════════════════ */
function App() {
    /* ── Map state ── */
    const [viewState, setViewState] = useState({
        longitude: 72.8777, latitude: 19.076, zoom: 12,
    });
    const mapRef = useRef(null);

    /* ── Mode ── */
    const [mode, setMode] = useState(MODES.SELECT);

    /* ── Text annotations ── */
    const [annotations, setAnnotations] = useState([]);
    const [selectedTextId, setSelectedTextId] = useState(null);
    const [editingTextId, setEditingTextId] = useState(null);

    /* ── Drawings (GeoJSON FeatureCollection) ── */
    const [drawings, setDrawings] = useState(EMPTY_FC);
    const [selectedDrawId, setSelectedDrawId] = useState(null);

    /* ── Drawing style (applied to new drawings) ── */
    const [drawStyle, setDrawStyle] = useState({ ...DEFAULT_DRAW_STYLE });

    /* ── Drawing interaction state ── */
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawPoints, setDrawPoints] = useState([]);
    const [cursorPoint, setCursorPoint] = useState(null);

    /* ── Derived ── */
    const selectedTextAnn = useMemo(
        () => annotations.find((a) => a.id === selectedTextId),
        [annotations, selectedTextId],
    );
    const selectedDrawing = useMemo(
        () => drawings.features.find((f) => f.properties.id === selectedDrawId),
        [drawings, selectedDrawId],
    );
    const isInDrawMode = DRAWING_MODES.has(mode);

    /* ── Rendered drawings GeoJSON (with arrowheads) ── */
    const renderedDrawings = useMemo(() => {
        const features = [];
        drawings.features.forEach((f) => {
            features.push(f);
            if (f.properties.drawType === 'arrow') {
                const head = buildArrowhead(f);
                if (head) features.push(head);
            }
        });
        return { type: 'FeatureCollection', features };
    }, [drawings]);

    /* ── Preview GeoJSON (current drawing in progress) ── */
    const previewFC = useMemo(
        () => buildPreview(mode, drawPoints, cursorPoint, drawStyle) || EMPTY_FC,
        [mode, drawPoints, cursorPoint, drawStyle],
    );

    /* ═══ Helpers ═══ */
    const clearSelection = useCallback(() => {
        setSelectedTextId(null);
        setEditingTextId(null);
        setSelectedDrawId(null);
    }, []);

    const updateAnnotation = useCallback((id, updates) => {
        setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    }, []);

    const deleteAnnotation = useCallback((id) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        setSelectedTextId((prev) => (prev === id ? null : prev));
        setEditingTextId((prev) => (prev === id ? null : prev));
    }, []);

    const updateDrawingFeature = useCallback((drawId, styleUpdates) => {
        setDrawings((prev) => ({
            ...prev,
            features: prev.features.map((f) =>
                f.properties.id === drawId
                    ? { ...f, properties: { ...f.properties, ...styleUpdates } }
                    : f,
            ),
        }));
    }, []);

    const deleteDrawing = useCallback((drawId) => {
        setDrawings((prev) => ({
            ...prev,
            features: prev.features.filter(
                (f) => f.properties.id !== drawId && f.properties.id !== drawId + '_head',
            ),
        }));
        setSelectedDrawId((prev) => (prev === drawId ? null : prev));
    }, []);

    /* ═══ Screen → Geo coordinate conversion ═══ */
    const screenToGeo = useCallback((e) => {
        if (!mapRef.current) return null;
        const rect = e.currentTarget.getBoundingClientRect();
        const point = [e.clientX - rect.left, e.clientY - rect.top];
        const lngLat = mapRef.current.unproject(point);
        return [lngLat.lng, lngLat.lat];
    }, []);

    /* ═══ Drawing event handlers (overlay div) ═══ */

    /** Drag-based drawing: pointerdown → start */
    const handleDrawPointerDown = useCallback((e) => {
        if (!DRAG_DRAW_MODES.has(mode)) return;
        const geo = screenToGeo(e);
        if (!geo) return;
        e.preventDefault();
        setIsDrawing(true);
        setDrawPoints([geo]);
        setCursorPoint(geo);
    }, [mode, screenToGeo]);

    /** Drag-based drawing: pointermove → update */
    const handleDrawPointerMove = useCallback((e) => {
        const geo = screenToGeo(e);
        if (!geo) return;
        setCursorPoint(geo);
        if (isDrawing && mode === MODES.FREEHAND) {
            setDrawPoints((prev) => [...prev, geo]);
        }
    }, [isDrawing, mode, screenToGeo]);

    /** Drag-based drawing: pointerup → finalize */
    const handleDrawPointerUp = useCallback((e) => {
        if (!isDrawing) return;
        const geo = screenToGeo(e);
        if (!geo || drawPoints.length === 0) {
            setIsDrawing(false);
            return;
        }

        const finalPoints = mode === MODES.FREEHAND ? [...drawPoints, geo] : [drawPoints[0], geo];
        const id = genId('draw');
        const feature = buildFeature(mode, finalPoints, drawStyle, id);

        setDrawings((prev) => ({
            ...prev,
            features: [...prev.features, feature],
        }));

        setSelectedDrawId(id);
        setSelectedTextId(null);
        setEditingTextId(null);

        setIsDrawing(false);
        setDrawPoints([]);
        setCursorPoint(null);
    }, [isDrawing, drawPoints, mode, drawStyle, screenToGeo]);

    /* ═══ Map click (text & select) ═══ */
    const handleMapClick = useCallback((e) => {
        if (isInDrawMode) return;

        if (mode === MODES.TEXT) {
            const id = genId('txt');
            setAnnotations((prev) => [
                ...prev,
                { id, text: '', longitude: e.lngLat.lng, latitude: e.lngLat.lat, ...DEFAULT_TEXT_STYLE },
            ]);
            setSelectedTextId(id);
            setEditingTextId(id);
            setSelectedDrawId(null);
        } else if (mode === MODES.SELECT) {
            // Check if clicked on a drawing feature
            const features = mapRef.current?.queryRenderedFeatures(e.point, {
                layers: ['drawings-fill', 'drawings-line'],
            });
            if (features?.length > 0) {
                const fid = features[0].properties.id;
                // Skip arrowhead companion features
                if (!fid.endsWith('_head')) {
                    setSelectedDrawId(fid);
                    setSelectedTextId(null);
                    setEditingTextId(null);
                    return;
                }
            }
            clearSelection();
        }
    }, [mode, isInDrawMode, clearSelection]);

    const handleDragEnd = useCallback((id, e) => {
        updateAnnotation(id, { longitude: e.lngLat.lng, latitude: e.lngLat.lat });
    }, [updateAnnotation]);

    /* ═══ Keyboard shortcuts ═══ */
    useEffect(() => {
        const onKey = (e) => {
            if (editingTextId) return;
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const keyMap = {
                v: MODES.SELECT, t: MODES.TEXT, p: MODES.FREEHAND,
                l: MODES.LINE, r: MODES.RECTANGLE, c: MODES.CIRCLE,
                a: MODES.ARROW,
            };
            const mapped = keyMap[e.key.toLowerCase()];
            if (mapped) { setMode(mapped); return; }

            if ((e.key === 'Delete' || e.key === 'Backspace')) {
                if (selectedTextId) deleteAnnotation(selectedTextId);
                else if (selectedDrawId) deleteDrawing(selectedDrawId);
            }
            if (e.key === 'Escape') {
                if (isDrawing) {
                    setIsDrawing(false);
                    setDrawPoints([]);
                    setCursorPoint(null);
                } else {
                    clearSelection();
                    setMode(MODES.SELECT);
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedTextId, selectedDrawId, editingTextId, isDrawing, deleteAnnotation, deleteDrawing, clearSelection]);

    /* ═══ Properties panel handlers ═══ */
    const propsType = selectedTextAnn ? 'text' : selectedDrawing ? 'drawing' : null;

    const handlePropsUpdate = useCallback((updates) => {
        if (selectedTextId) updateAnnotation(selectedTextId, updates);
        else if (selectedDrawId) {
            updateDrawingFeature(selectedDrawId, updates);
            setDrawStyle((prev) => ({ ...prev, ...updates })); // also update active style
        }
    }, [selectedTextId, selectedDrawId, updateAnnotation, updateDrawingFeature]);

    const handlePropsDelete = useCallback(() => {
        if (selectedTextId) deleteAnnotation(selectedTextId);
        else if (selectedDrawId) deleteDrawing(selectedDrawId);
    }, [selectedTextId, selectedDrawId, deleteAnnotation, deleteDrawing]);

    /* ═══ Cursor style ═══ */
    const cursor = isInDrawMode ? 'crosshair' : mode === MODES.TEXT ? 'crosshair' : 'default';

    /* ═══ Render ═══ */
    return (
        <div className="app-container">
            <Toolbar mode={mode} setMode={setMode} />

            {mode === MODES.SELECT && propsType && !editingTextId && (
                <PropertiesPanel
                    type={propsType}
                    annotation={selectedTextAnn}
                    drawingStyle={selectedDrawing ? selectedDrawing.properties : drawStyle}
                    onUpdate={handlePropsUpdate}
                    onDelete={handlePropsDelete}
                />
            )}

            {MODE_LABELS[mode] && (
                <div className="mode-badge">
                    <span className="mode-dot" />
                    {MODE_LABELS[mode]}
                </div>
            )}

            {/* Drawing overlay — captures pointer events when in drawing mode */}
            {isInDrawMode && (
                <div
                    className="drawing-overlay"
                    onPointerDown={handleDrawPointerDown}
                    onPointerMove={handleDrawPointerMove}
                    onPointerUp={handleDrawPointerUp}
                />
            )}

            <Map
                ref={mapRef}
                {...viewState}
                onMove={(e) => setViewState(e.viewState)}
                onClick={handleMapClick}
                style={{ width: '100%', height: '100%' }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                cursor={cursor}
            >
                {/* Completed drawings */}
                <Source id="drawings-src" type="geojson" data={renderedDrawings}>
                    <Layer id="drawings-fill" type="fill" paint={FILL_PAINT}
                        filter={['==', ['geometry-type'], 'Polygon']} />
                    <Layer id="drawings-line" type="line" paint={LINE_PAINT} layout={LINE_LAYOUT} />
                </Source>

                {/* Drawing preview (in-progress) */}
                <Source id="preview-src" type="geojson" data={previewFC}>
                    <Layer id="preview-fill" type="fill" paint={{ ...FILL_PAINT, 'fill-opacity': 0.1 }}
                        filter={['==', ['geometry-type'], 'Polygon']} />
                    <Layer id="preview-line" type="line"
                        paint={{ ...LINE_PAINT, 'line-dasharray': [4, 4] }}
                        layout={LINE_LAYOUT} />
                </Source>

                {/* Selection highlight */}
                {selectedDrawing && (
                    <Source id="selection-src" type="geojson" data={{
                        type: 'FeatureCollection',
                        features: [selectedDrawing],
                    }}>
                        <Layer id="selection-line" type="line" paint={{
                            'line-color': '#6baaff',
                            'line-width': ['coalesce', ['get', 'strokeWidth'], 2],
                            'line-dasharray': [4, 3],
                            'line-opacity': 0.8,
                        }} layout={LINE_LAYOUT} />
                    </Source>
                )}

                {/* Text annotations */}
                {annotations.map((ann) => (
                    <Marker
                        key={ann.id}
                        longitude={ann.longitude}
                        latitude={ann.latitude}
                        draggable={mode === MODES.SELECT && selectedTextId === ann.id && editingTextId !== ann.id}
                        onDragEnd={(e) => handleDragEnd(ann.id, e)}
                        anchor="center"
                    >
                        <TextAnnotation
                            annotation={ann}
                            isSelected={selectedTextId === ann.id}
                            isEditing={editingTextId === ann.id}
                            onSelect={() => {
                                if (mode === MODES.SELECT) {
                                    setSelectedTextId(ann.id);
                                    setSelectedDrawId(null);
                                }
                            }}
                            onStartEdit={() => {
                                setSelectedTextId(ann.id);
                                setEditingTextId(ann.id);
                            }}
                            onFinishEdit={(text) => {
                                if (!text.trim()) deleteAnnotation(ann.id);
                                else updateAnnotation(ann.id, { text });
                                setEditingTextId(null);
                            }}
                        />
                    </Marker>
                ))}
            </Map>
        </div>
    );
}

export default App;
