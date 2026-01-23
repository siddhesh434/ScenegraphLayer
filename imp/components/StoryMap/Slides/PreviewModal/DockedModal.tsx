'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ViewState, Slide } from '../../Types/types';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  EASING,
  getDistanceKm,
  interpolateBearing,
  lerp,
  distanceToZoom,
} from '../transitionUtils';
import DeckSlideshow from './DeckSlidesshow/DeckSlidesshow';

type TransitionMode = 'direct' | 'arc';

interface DockedModalProps {
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

function ReadOnlyEditor({ blocks }: { blocks: any[] }) {
  const editor = useCreateBlockNote({
    initialContent: blocks.length > 0 ? blocks : undefined,
  });
  return <BlockNoteView editor={editor} editable={false} theme="light" />;
}

export default function DockedModal({
  isOpen,
  onClose,
  slides,
  editorWidth,
  editorPosition,
}: DockedModalProps) {
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && capturedViews.length > 0) {
      setActiveIndex(0);
      setViewState(capturedViews[0].viewState);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

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

  const animateToView = useCallback(
    (fromIndex: number, toIndex: number) => {
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

      switch (transitionMode) {
        case 'direct':
          animateSegmentDirect(fromIndex, toIndex, onComplete);
          break;
        case 'arc':
          animateSegmentArc(fromIndex, toIndex, onComplete);
          break;
      }
    },
    [capturedViews, transitionMode, animateSegmentDirect, animateSegmentArc]
  );

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAnimating) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(containerCenter - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex && capturedViews[closestIndex]) {
      const prevIndex = activeIndex;
      setActiveIndex(closestIndex);
      animateToView(prevIndex, closestIndex);
    }
  }, [activeIndex, capturedViews, isAnimating, animateToView]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modeLabels: Record<TransitionMode, string> = {
    direct: 'Direct',
    arc: 'Arc',
  };

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 12, color: '#8b5a2b', fontWeight: 600 }}>
            DOCKED
          </span>
          <span style={{ color: '#444' }}>|</span>
          <span style={{ fontSize: 14 }}>
            {activeIndex + 1} / {capturedViews.length}
          </span>
        </div>

        {/* Transition mode buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(modeLabels) as TransitionMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => !isAnimating && setTransitionMode(mode)}
              disabled={isAnimating}
              style={{
                padding: '4px 10px',
                background: transitionMode === mode ? '#8b5a2b' : 'transparent',
                border: '1px solid #444',
                borderRadius: 3,
                color: transitionMode === mode ? '#fff' : '#888',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: 12,
              }}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555' }}>
            scroll to navigate
          </span>
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
            {/* Editor Panel */}
            <div
              ref={scrollContainerRef}
              style={{
                width: `${editorWidth}%`,
                height: '100%',
                background: '#fff',
                overflowY: 'auto',
                scrollBehavior: 'smooth',
                order: editorPosition === 'left' ? 0 : 1,
              }}
            >
              <div style={{ height: '40vh' }} />

              {capturedViews.map((view, index) => (
                <div
                  key={view.slideKey}
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                  style={{
                    minHeight: '60vh',
                    padding: 24,
                    borderBottom: '1px solid #eee',
                    opacity: activeIndex === index ? 1 : 0.4,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        background: activeIndex === index ? '#8b5a2b' : '#ddd',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>
                      📍 {view.viewState.latitude.toFixed(4)},{' '}
                      {view.viewState.longitude.toFixed(4)}
                    </span>
                  </div>
                  <ReadOnlyEditor key={view.slideKey} blocks={view.blocks} />
                </div>
              ))}

              <div style={{ height: '40vh' }} />
            </div>

            {/* Map Panel */}
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
                routeData={null}
                showRoute={false}
                characterState={null}
              />

              {isAnimating && (
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
                  Flying...
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                }}
              >
                {activeIndex + 1} / {capturedViews.length}
              </div>

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
