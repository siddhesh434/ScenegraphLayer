'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Block } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/* ---------------- Types ---------------- */

type MapState = {
  lat: number;
  lon: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

type Slide = {
  key: string;
  id: number;
  blocks: Block[];
  mapState: MapState;
};

const defaultMapState: MapState = {
  lat: 40.7128,
  lon: -74.006,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

/* ---------------- Icons ---------------- */

const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const CameraIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ChevronIcon = ({ down }: { down: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: down ? 'rotate(0deg)' : 'rotate(-180deg)',
      transition: 'transform 0.2s ease',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/* ---------------- Editor Component ---------------- */

function Editor({
  initialContent,
  onChange,
}: {
  initialContent: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const editor = useCreateBlockNote(
    initialContent.length > 0 ? { initialContent } : undefined
  );

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => onChange(editor.document)}
      theme="light"
    />
  );
}

/* ---------------- Map Controls Component ---------------- */

function MapControls({
  mapState,
  isEditing,
  onToggleEdit,
  onCapture,
  onManualChange,
}: {
  mapState: MapState;
  isEditing: boolean;
  onToggleEdit: () => void;
  onCapture: () => void;
  onManualChange: (field: keyof MapState, value: number) => void;
}) {
  const [showManual, setShowManual] = useState(false);

  const fieldLabels: Record<keyof MapState, string> = {
    lat: 'Latitude',
    lon: 'Longitude',
    zoom: 'Zoom',
    pitch: 'Pitch',
    bearing: 'Bearing',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: 20,
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        fontSize: 13,
        width: 280,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: isEditing
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          {isEditing ? <UnlockIcon /> : <LockIcon />}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>
            Map Controls
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {isEditing ? 'Editing mode' : 'View only'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={onToggleEdit}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            background: isEditing
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            boxShadow: isEditing
              ? '0 4px 12px rgba(239, 68, 68, 0.3)'
              : '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          {isEditing ? <LockIcon /> : <UnlockIcon />}
          {isEditing ? 'Lock' : 'Edit'}
        </button>
        <button
          onClick={onCapture}
          disabled={!isEditing}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            cursor: isEditing ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: 13,
            background: isEditing
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : '#e5e7eb',
            color: isEditing ? '#fff' : '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            boxShadow: isEditing
              ? '0 4px 12px rgba(16, 185, 129, 0.3)'
              : 'none',
          }}
        >
          <CameraIcon />
          Capture
        </button>
      </div>

      {/* Manual Input Toggle */}
      <button
        onClick={() => setShowManual(!showManual)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          background: showManual ? '#f9fafb' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
        }}
      >
        <span>Manual Coordinates</span>
        <ChevronIcon down={showManual} />
      </button>

      {/* Manual Input Fields */}
      {showManual && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            background: '#f9fafb',
            borderRadius: 10,
            display: 'grid',
            gap: 10,
          }}
        >
          {(['lat', 'lon', 'zoom', 'pitch', 'bearing'] as const).map(
            (field) => (
              <div
                key={field}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <label
                  style={{
                    width: 70,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#6b7280',
                  }}
                >
                  {fieldLabels[field]}
                </label>
                <input
                  type="number"
                  value={mapState[field]}
                  onChange={(e) =>
                    onManualChange(field, parseFloat(e.target.value) || 0)
                  }
                  step={
                    field === 'lat' || field === 'lon'
                      ? 0.0001
                      : field === 'zoom'
                      ? 0.1
                      : 1
                  }
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    background: '#fff',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>
            )
          )}
        </div>
      )}

      {/* Current Position Display */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <MapPinIcon />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Current Position
          </span>
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#334155',
            lineHeight: 1.6,
          }}
        >
          <div>
            {mapState.lat.toFixed(6)}, {mapState.lon.toFixed(6)}
          </div>
          <div style={{ color: '#64748b', marginTop: 4 }}>
            Z {mapState.zoom.toFixed(1)} · P {mapState.pitch.toFixed(0)}° · B{' '}
            {mapState.bearing.toFixed(0)}°
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Map Component with proper initialization ---------------- */

function MapView({
  mapState,
  isEditing,
  onViewStateChange,
}: {
  mapState: MapState;
  isEditing: boolean;
  onViewStateChange: (state: MapState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Wait for container to be mounted and have dimensions
    const checkReady = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight });
          setIsReady(true);
          return true;
        }
      }
      return false;
    };

    // Check immediately
    if (checkReady()) return;

    // If not ready, use RAF to wait for layout
    let rafId: number;
    const poll = () => {
      if (!checkReady()) {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !isReady) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#0f172a',
      }}
    >
      {!isReady ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          Loading map...
        </div>
      ) : (
        <div onContextMenu={(e) => e.preventDefault()}>
          <DeckGL
            width={dimensions.width}
            height={dimensions.height}
            viewState={{
              latitude: mapState.lat,
              longitude: mapState.lon,
              zoom: mapState.zoom,
              pitch: mapState.pitch,
              bearing: mapState.bearing,
            }}
            onViewStateChange={({ viewState }) => {
              if (isEditing) {
                onViewStateChange({
                  lat: viewState.latitude,
                  lon: viewState.longitude,
                  zoom: viewState.zoom,
                  pitch: viewState.pitch,
                  bearing: ((viewState.bearing % 360) + 360) % 360,
                });
              }
            }}
            controller={
              isEditing
                ? { dragRotate: true, touchRotate: true, keyboard: true }
                : false
            }
            layers={[]}
          >
            <Map mapStyle={MAP_STYLE} />
          </DeckGL>
        </div>
      )}
    </div>
  );
}

/* ---------------- Slides Component ---------------- */

export default function Slides() {
  const createId = () => crypto.randomUUID();

  const [mounted, setMounted] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([
    {
      key: createId(),
      id: 1,
      blocks: [],
      mapState: { ...defaultMapState },
    },
  ]);

  const [currentId, setCurrentId] = useState(1);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    key: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [liveMapState, setLiveMapState] = useState<MapState>({
    ...defaultMapState,
  });

  const activeSlide = slides.find((s) => s.id === currentId);

  // Ensure component is mounted before rendering WebGL
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeSlide) {
      setLiveMapState({ ...activeSlide.mapState });
      setIsEditing(false);
    }
  }, [activeSlide?.key]);

  const updateBlocks = (key: string, blocks: Block[]) => {
    setSlides((prev) =>
      prev.map((s) => (s.key === key ? { ...s, blocks } : s))
    );
  };

  const updateMapState = (key: string, mapState: MapState) => {
    setSlides((prev) =>
      prev.map((s) => (s.key === key ? { ...s, mapState } : s))
    );
  };

  const addSlide = () => {
    const newId = slides.length + 1;
    setSlides((prev) => [
      ...prev,
      {
        key: createId(),
        id: newId,
        blocks: [],
        mapState: { ...defaultMapState },
      },
    ]);
    setCurrentId(newId);
  };

  const deleteSlide = (key: string) => {
    if (slides.length <= 1) return;
    const index = slides.findIndex((s) => s.key === key);
    if (index === -1) return;
    setSlides((prev) => {
      const next = prev.filter((s) => s.key !== key);
      return next.map((s, i) => ({ ...s, id: i + 1 }));
    });
    setCurrentId((curr) => Math.max(1, curr - 1));
    setMenu(null);
  };

  const handleCapture = () => {
    if (activeSlide) {
      updateMapState(activeSlide.key, { ...liveMapState });
      setIsEditing(false);
    }
  };

  const handleManualChange = (field: keyof MapState, value: number) => {
    const newState = { ...liveMapState, [field]: value };
    setLiveMapState(newState);
    if (activeSlide) {
      updateMapState(activeSlide.key, newState);
    }
  };

  useEffect(() => {
    const handleClick = () => setMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {activeSlide && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Editor Panel */}
          <div
            style={{
              width: '32%',
              borderRight: '1px solid #e2e8f0',
              overflow: 'auto',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Editor Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                }}
              >
                Content Editor
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                Slide {activeSlide.id}
              </div>
            </div>
            {/* Editor Content */}
            <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
              <Editor
                key={activeSlide.key}
                initialContent={activeSlide.blocks}
                onChange={(blocks) => updateBlocks(activeSlide.key, blocks)}
              />
            </div>
          </div>

          {/* Map Panel */}
          <div
            style={{
              width: '68%',
              position: 'relative',
              background: '#0f172a',
            }}
          >
            <MapView
              key={activeSlide.key}
              mapState={liveMapState}
              isEditing={isEditing}
              onViewStateChange={setLiveMapState}
            />

            <MapControls
              mapState={liveMapState}
              isEditing={isEditing}
              onToggleEdit={() => setIsEditing(!isEditing)}
              onCapture={handleCapture}
              onManualChange={handleManualChange}
            />

            {/* Lock Indicator */}
            {!isEditing && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  background: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(12px)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <LockIcon />
                Map Locked
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide Thumbnails */}
      <div
        style={{
          height: 140,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '0 20px',
          gap: 16,
          background: '#ffffff',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        {slides.map((slide) => (
          <button
            key={slide.key}
            onClick={() => setCurrentId(slide.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, key: slide.key });
            }}
            style={{
              minWidth: 180,
              height: 100,
              border:
                slide.id === currentId
                  ? '2px solid #6366f1'
                  : '1px solid #e2e8f0',
              borderRadius: 12,
              background:
                slide.id === currentId
                  ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              cursor: 'pointer',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow:
                slide.id === currentId
                  ? '0 4px 16px rgba(99, 102, 241, 0.2)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Slide Number Badge */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: slide.id === currentId ? '#6366f1' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Slide {slide.id}
            </div>
            {/* Map Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: slide.id === currentId ? '#4f46e5' : '#64748b',
                fontFamily: 'monospace',
              }}
            >
              <MapPinIcon />
              {slide.mapState.lat.toFixed(2)}, {slide.mapState.lon.toFixed(2)}
            </div>
            {/* Active Indicator */}
            {slide.id === currentId && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '12px 12px 0 0',
                }}
              />
            )}
          </button>
        ))}

        {/* Context Menu */}
        {menu && (
          <div
            style={{
              position: 'fixed',
              top: menu.y,
              left: menu.x,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: 6,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
            }}
            onClick={() => deleteSlide(menu.key)}
          >
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 500,
                color: '#ef4444',
                transition: 'background 0.15s ease',
              }}
            >
              <TrashIcon />
              Delete Slide
            </div>
          </div>
        )}

        {/* Add Slide Button */}
        <button
          onClick={addSlide}
          style={{
            minWidth: 180,
            height: 100,
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          <PlusIcon />
          Add Slide
        </button>
      </div>
    </div>
  );
}
