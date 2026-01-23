'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ViewState, Slide } from '../../Types/types';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  EASING,
  RoutePoint,
  getDistanceKm,
  calculateBearing,
  interpolateBearing,
  lerp,
  distanceToZoom,
  fetchRoute,
  getPointAtDistance,
} from '../transitionUtils';
import DeckSlideshow from './DeckSlidesshow/DeckSlidesshow';

type TransitionMode = 'direct' | 'arc' | 'road';

interface SlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: Slide[];
  editorWidth: number;
  editorPosition: 'left' | 'right';
}

interface CapturedView {
  index: number;
  viewState: ViewState;
  blocks: any[];
  slideKey: string;
}

interface CharacterState {
  position: { lat: number; lng: number };
  bearing: number;
}

function ReadOnlyEditor({ blocks }: { blocks: any[] }) {
  const editor = useCreateBlockNote({
    initialContent: blocks.length > 0 ? blocks : undefined,
  });
  return <BlockNoteView editor={editor} editable={false} theme="light" />;
}

export default function SlideshowModal({
  isOpen,
  onClose,
  slides,
  editorWidth,
  editorPosition,
}: SlideshowModalProps) {
  const capturedViews: CapturedView[] = slides
    .map((slide, index) =>
      slide.viewState
        ? {
            index: index + 1,
            viewState: slide.viewState,
            blocks: slide.blocks,
            slideKey: slide.key,
          }
        : null
    )
    .filter((v): v is CapturedView => v !== null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewState, setViewState] = useState<ViewState>(() =>
    capturedViews.length > 0
      ? capturedViews[0].viewState
      : {
          latitude: 1.2834,
          longitude: 103.8607,
          zoom: 15.5,
          pitch: 50,
          bearing: -20,
        }
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionMode, setTransitionMode] =
    useState<TransitionMode>('direct');

  // Road mode state
  const [currentRouteData, setCurrentRouteData] = useState<RoutePoint[] | null>(
    null
  );
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState | null>(
    null
  );

  // Road settings
  const [zoom, setZoom] = useState(16);
  const [pitch, setPitch] = useState(60);
  const [speed, setSpeed] = useState(80);

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && capturedViews.length > 0) {
      setActiveIndex(0);
      setViewState(capturedViews[0].viewState);
      setCurrentRouteData(null);
      setCharacterState(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (transitionMode !== 'road') {
      setCurrentRouteData(null);
      setCharacterState(null);
    }
  }, [transitionMode]);

  const animateSegmentDirect = useCallback(
    (fromIndex: number, toIndex: number, onComplete: () => void) => {
      const startView = capturedViews[fromIndex].viewState;
      const endView = capturedViews[toIndex].viewState;
      const duration = 2500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const t = EASING.easeInOut(Math.min(elapsed / duration, 1));
        setViewState({
          latitude: lerp(startView.latitude, endView.latitude, t),
          longitude: lerp(startView.longitude, endView.longitude, t),
          zoom: lerp(startView.zoom, endView.zoom, t),
          pitch: lerp(startView.pitch, endView.pitch, t),
          bearing: interpolateBearing(startView.bearing, endView.bearing, t),
        });
        if (elapsed < duration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setViewState(endView);
          onComplete();
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [capturedViews]
  );

  const animateSegmentArc = useCallback(
    (fromIndex: number, toIndex: number, onComplete: () => void) => {
      const startView = capturedViews[fromIndex].viewState;
      const endView = capturedViews[toIndex].viewState;
      const duration = 3500;
      const startTime = performance.now();
      const distance = getDistanceKm(
        startView.latitude,
        startView.longitude,
        endView.latitude,
        endView.longitude
      );
      const peakZoom = distanceToZoom(distance);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easedT = EASING.easeInOut(t);
        const t1 = 1 - t;
        const arcZoom =
          t1 * t1 * startView.zoom +
          2 * t1 * t * peakZoom +
          t * t * endView.zoom;
        const arcPitch =
          t < 0.5
            ? startView.pitch * (1 - EASING.easeOutCubic(t * 2))
            : endView.pitch * EASING.easeInCubic((t - 0.5) * 2);

        setViewState({
          latitude: lerp(startView.latitude, endView.latitude, easedT),
          longitude: lerp(startView.longitude, endView.longitude, easedT),
          zoom: arcZoom,
          pitch: arcPitch,
          bearing: interpolateBearing(
            startView.bearing,
            endView.bearing,
            easedT
          ),
        });
        if (elapsed < duration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setViewState(endView);
          onComplete();
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [capturedViews]
  );

  const animateSegmentRoad = useCallback(
    (routeData: RoutePoint[], isReverse: boolean, onComplete: () => void) => {
      const totalDistance = routeData[routeData.length - 1].distance;
      const duration = Math.max((totalDistance / speed) * 1000, 1000);
      const startTime = performance.now();
      let prevBearing = viewState.bearing;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawT = Math.min(elapsed / duration, 1);
        const t = EASING.easeInOut(rawT);

        const currentDistance = isReverse
          ? totalDistance * (1 - t)
          : totalDistance * t;
        const currentPoint = getPointAtDistance(routeData, currentDistance);

        const lookAheadDist = isReverse
          ? Math.max(currentDistance - 30, 0)
          : Math.min(currentDistance + 30, totalDistance);
        const lookAheadPoint = getPointAtDistance(routeData, lookAheadDist);

        const targetBearing = calculateBearing(
          currentPoint.lat,
          currentPoint.lng,
          lookAheadPoint.lat,
          lookAheadPoint.lng
        );

        const smoothedBearing = interpolateBearing(
          prevBearing,
          targetBearing,
          0.15
        );
        prevBearing = smoothedBearing;

        setCharacterState({ position: currentPoint, bearing: smoothedBearing });
        setViewState({
          latitude: currentPoint.lat,
          longitude: currentPoint.lng,
          zoom,
          pitch,
          bearing: smoothedBearing,
        });

        if (elapsed < duration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCharacterState(null);
          onComplete();
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [viewState.bearing, zoom, pitch, speed]
  );

  const animateToView = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (
        capturedViews.length < 2 ||
        toIndex < 0 ||
        toIndex >= capturedViews.length ||
        fromIndex === toIndex
      )
        return;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      setIsAnimating(true);
      const onComplete = () => {
        setIsAnimating(false);
        animationRef.current = null;
      };

      if (transitionMode === 'road') {
        setIsLoadingRoute(true);
        const fromView = capturedViews[fromIndex].viewState;
        const toView = capturedViews[toIndex].viewState;
        const isReverse = toIndex < fromIndex;

        const points = isReverse
          ? [
              { lat: toView.latitude, lng: toView.longitude },
              { lat: fromView.latitude, lng: fromView.longitude },
            ]
          : [
              { lat: fromView.latitude, lng: fromView.longitude },
              { lat: toView.latitude, lng: toView.longitude },
            ];

        const route = await fetchRoute(points);
        setIsLoadingRoute(false);

        if (route && route.length >= 2) {
          setCurrentRouteData(route);
          animateSegmentRoad(route, isReverse, () => {
            setCurrentRouteData(null);
            onComplete();
          });
        } else {
          animateSegmentDirect(fromIndex, toIndex, onComplete);
        }
      } else {
        switch (transitionMode) {
          case 'direct':
            animateSegmentDirect(fromIndex, toIndex, onComplete);
            break;
          case 'arc':
            animateSegmentArc(fromIndex, toIndex, onComplete);
            break;
        }
      }
    },
    [
      capturedViews,
      transitionMode,
      animateSegmentDirect,
      animateSegmentArc,
      animateSegmentRoad,
    ]
  );

  const goNext = useCallback(() => {
    if (
      activeIndex < capturedViews.length - 1 &&
      !isAnimating &&
      !isLoadingRoute
    ) {
      animateToView(activeIndex, activeIndex + 1);
      setActiveIndex(activeIndex + 1);
    }
  }, [
    activeIndex,
    capturedViews.length,
    isAnimating,
    isLoadingRoute,
    animateToView,
  ]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0 && !isAnimating && !isLoadingRoute) {
      animateToView(activeIndex, activeIndex - 1);
      setActiveIndex(activeIndex - 1);
    }
  }, [activeIndex, isAnimating, isLoadingRoute, animateToView]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  if (!isOpen) return null;

  const currentView = capturedViews[activeIndex];
  const modeLabels: Record<TransitionMode, string> = {
    direct: 'Direct',
    arc: 'Arc',
    road: 'Road',
  };
  const isDisabled = isAnimating || isLoadingRoute;
  const showControls = transitionMode === 'road';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 16px',
          background: '#1a1a1a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333',
        }}
      >
        {/* Left side - Title and slide counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 12, color: '#8b5a2b', fontWeight: 600 }}>
            SLIDESHOW
          </span>
          <span style={{ color: '#444' }}>|</span>
          <span style={{ fontSize: 14 }}>
            {activeIndex + 1} / {capturedViews.length}
          </span>
          {isLoadingRoute && (
            <span style={{ fontSize: 11, color: '#4a90d9' }}>
              Loading route...
            </span>
          )}

          {/* Navigation buttons - moved here */}
          <span style={{ color: '#444' }}>|</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={goPrev}
              disabled={activeIndex === 0 || isDisabled}
              style={{
                padding: '4px 12px',
                background: activeIndex === 0 || isDisabled ? '#333' : '#555',
                border: '1px solid #444',
                borderRadius: 3,
                color: activeIndex === 0 || isDisabled ? '#666' : '#fff',
                cursor:
                  activeIndex === 0 || isDisabled ? 'not-allowed' : 'pointer',
                fontSize: 12,
              }}
            >
              ← Prev
            </button>
            <button
              onClick={goNext}
              disabled={activeIndex === capturedViews.length - 1 || isDisabled}
              style={{
                padding: '4px 12px',
                background:
                  activeIndex === capturedViews.length - 1 || isDisabled
                    ? '#333'
                    : '#555',
                border: '1px solid #444',
                borderRadius: 3,
                color:
                  activeIndex === capturedViews.length - 1 || isDisabled
                    ? '#666'
                    : '#fff',
                cursor:
                  activeIndex === capturedViews.length - 1 || isDisabled
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: 12,
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Center - Transition mode buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(modeLabels) as TransitionMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => !isDisabled && setTransitionMode(mode)}
              disabled={isDisabled}
              style={{
                padding: '4px 10px',
                background: transitionMode === mode ? '#8b5a2b' : 'transparent',
                border: '1px solid #444',
                borderRadius: 3,
                color: transitionMode === mode ? '#fff' : '#888',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: 12,
              }}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        {/* Right side - Keyboard hint and close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555' }}>↑↓ navigate</span>
          <button
            onClick={onClose}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 3,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Controls for Road */}
      {showControls && (
        <div
          style={{
            padding: '6px 16px',
            background: '#222',
            borderBottom: '1px solid #333',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            fontSize: 12,
            color: '#aaa',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Zoom:
            <input
              type="range"
              min="12"
              max="18"
              step="0.5"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isDisabled}
              style={{ width: 60 }}
            />
            <span style={{ width: 24 }}>{zoom}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Pitch:
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              disabled={isDisabled}
              style={{ width: 60 }}
            />
            <span style={{ width: 28 }}>{pitch}°</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Speed:
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              disabled={isDisabled}
              style={{ width: 60 }}
            />
            <span style={{ width: 40 }}>{speed}m/s</span>
          </label>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {capturedViews.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 48 }}>📍</span>
            <p>No captured views yet</p>
          </div>
        ) : (
          <>
            {/* Editor Panel - rendered once, positioned via order */}
            <div
              style={{
                width: `${editorWidth}%`,
                height: '100%',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                order: editorPosition === 'left' ? 0 : 1,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, color: '#666' }}>
                  Location {activeIndex + 1}
                </span>
              </div>

              <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
                {currentView && (
                  <ReadOnlyEditor
                    key={currentView.slideKey}
                    blocks={currentView.blocks}
                  />
                )}
              </div>

              <div
                style={{
                  padding: '6px 16px',
                  background: '#fafafa',
                  borderTop: '1px solid #eee',
                  fontSize: 11,
                  color: '#888',
                }}
              >
                📍 {currentView?.viewState.latitude.toFixed(4)},{' '}
                {currentView?.viewState.longitude.toFixed(4)} • Zoom{' '}
                {currentView?.viewState.zoom.toFixed(1)}
              </div>
            </div>

            {/* Map */}
            <div
              style={{
                width: `${100 - editorWidth}%`,
                height: '100%',
                position: 'relative',
                order: editorPosition === 'left' ? 1 : 0,
              }}
            >
              <DeckSlideshow
                viewState={viewState}
                isAnimating={isAnimating}
                capturedViews={capturedViews}
                activeIndex={activeIndex}
                routeData={currentRouteData}
                showRoute={transitionMode === 'road' && !!currentRouteData}
                characterState={characterState}
              />

              {(isAnimating || isLoadingRoute) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(139,90,43,0.9)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {isLoadingRoute ? 'Loading...' : 'Flying...'}
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                {viewState.latitude.toFixed(4)},{' '}
                {viewState.longitude.toFixed(4)} | Z{viewState.zoom.toFixed(1)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
