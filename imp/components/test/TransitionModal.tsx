'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ViewState } from '../StoryMap/Types/types';
import {
  EASING,
  RoutePoint,
  getDistanceKm,
  calculateBearing,
  interpolateBearing,
  lerp,
  distanceToZoom,
  catmullRom,
  catmullRomBearing,
  cubicBezier,
  generateBezierControlPoints,
  fetchRoute,
  getPointAtDistance,
} from '../StoryMap/Slides/transitionUtils';
import DeckModal from './DeckModal';

const getDefaultViewState = (
  capturedViews: { index: number; viewState: ViewState }[]
): ViewState => {
  if (capturedViews.length > 0) {
    return capturedViews[0].viewState;
  }
  return {
    latitude: 1.2834,
    longitude: 103.8607,
    zoom: 15.5,
    pitch: 50,
    bearing: -20,
  };
};

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  capturedViews: { index: number; viewState: ViewState }[];
}

type PreviewMode = 'direct' | 'arc' | 'spline' | 'drone' | 'road';

// ============ MAIN COMPONENT ============

export default function TransitionModal({
  isOpen,
  onClose,
  capturedViews,
}: TransitionModalProps) {
  const [viewState, setViewState] = useState<ViewState>(() =>
    getDefaultViewState(capturedViews)
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('direct');

  // Drone/Road controls
  const [altitude, setAltitude] = useState(15);
  const [pitch, setPitch] = useState(60);
  const [speed, setSpeed] = useState(50);

  // Road mode state
  const [routeData, setRouteData] = useState<RoutePoint[] | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [characterState, setCharacterState] = useState<{
    position: { lat: number; lng: number };
    bearing: number;
  } | null>(null);

  // Initialize view when modal opens
  useEffect(() => {
    if (isOpen && capturedViews.length > 0) {
      setViewState(capturedViews[0].viewState);
    }
  }, [isOpen, capturedViews]);

  // Fetch route when road mode selected
  useEffect(() => {
    if (isOpen && previewMode === 'road' && capturedViews.length >= 2) {
      setIsLoadingRoute(true);
      setRouteError(null);
      const points = capturedViews.map((v) => ({
        lat: v.viewState.latitude,
        lng: v.viewState.longitude,
      }));
      fetchRoute(points).then((route) => {
        setIsLoadingRoute(false);
        if (route) {
          setRouteData(route);
        } else {
          setRouteError(
            'Could not find driving route. Points may be inaccessible by road.'
          );
        }
      });
    }
  }, [isOpen, previewMode, capturedViews]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAnimating(false);
  }, []);

  // ============ ANIMATION HANDLERS ============

  const animateDirect = useCallback(() => {
    const views = capturedViews.map((v) => v.viewState);
    const segmentDuration = 3000;
    let currentSegment = 0;

    const animateSegment = () => {
      if (currentSegment >= views.length - 1) {
        setIsAnimating(false);
        return;
      }
      const startView = views[currentSegment];
      const endView = views[currentSegment + 1];
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const t = EASING.easeInOut(
          Math.min((currentTime - startTime) / segmentDuration, 1)
        );
        setViewState({
          latitude: lerp(startView.latitude, endView.latitude, t),
          longitude: lerp(startView.longitude, endView.longitude, t),
          zoom: lerp(startView.zoom, endView.zoom, t),
          pitch: lerp(startView.pitch, endView.pitch, t),
          bearing: interpolateBearing(startView.bearing, endView.bearing, t),
        });
        if (t < 1) animationRef.current = requestAnimationFrame(animate);
        else {
          currentSegment++;
          animateSegment();
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    };

    setViewState(views[0]);
    timeoutRef.current = setTimeout(animateSegment, 100);
  }, [capturedViews]);

  const animateArc = useCallback(() => {
    const views = capturedViews.map((v) => v.viewState);
    const segmentDuration = 4000;
    let currentSegment = 0;

    const animateSegment = () => {
      if (currentSegment >= views.length - 1) {
        setIsAnimating(false);
        return;
      }
      const startView = views[currentSegment];
      const endView = views[currentSegment + 1];
      const startTime = performance.now();
      const distance = getDistanceKm(
        startView.latitude,
        startView.longitude,
        endView.latitude,
        endView.longitude
      );
      const peakZoom = distanceToZoom(distance);

      const animate = (currentTime: number) => {
        const t = Math.min((currentTime - startTime) / segmentDuration, 1);
        const easedT = EASING.easeInOut(t);
        // Parabolic zoom
        const t1 = 1 - t;
        const arcZoom =
          t1 * t1 * startView.zoom +
          2 * t1 * t * peakZoom +
          t * t * endView.zoom;
        // Pitch: flatten at peak
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
        if (t < 1) animationRef.current = requestAnimationFrame(animate);
        else {
          currentSegment++;
          animateSegment();
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    };

    setViewState(views[0]);
    timeoutRef.current = setTimeout(animateSegment, 100);
  }, [capturedViews]);

  const animateSpline = useCallback(() => {
    const views = capturedViews.map((v) => v.viewState);
    const extendedViews = [views[0], ...views, views[views.length - 1]];
    const totalSegments = views.length - 1;
    const segmentDuration = 3000;
    const totalDuration = totalSegments * segmentDuration;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const globalT = Math.min((currentTime - startTime) / totalDuration, 1);
      if (globalT >= 1) {
        setViewState(views[views.length - 1]);
        setIsAnimating(false);
        return;
      }

      const segmentFloat = globalT * totalSegments;
      const segmentIndex = Math.floor(segmentFloat);
      const localT = EASING.easeInOut(segmentFloat - segmentIndex);
      const i = segmentIndex + 1;
      const p0 = extendedViews[i - 1],
        p1 = extendedViews[i],
        p2 = extendedViews[i + 1],
        p3 = extendedViews[i + 2];

      setViewState({
        latitude: catmullRom(
          p0.latitude,
          p1.latitude,
          p2.latitude,
          p3.latitude,
          localT
        ),
        longitude: catmullRom(
          p0.longitude,
          p1.longitude,
          p2.longitude,
          p3.longitude,
          localT
        ),
        zoom: catmullRom(p0.zoom, p1.zoom, p2.zoom, p3.zoom, localT),
        pitch: catmullRom(p0.pitch, p1.pitch, p2.pitch, p3.pitch, localT),
        bearing: catmullRomBearing(
          p0.bearing,
          p1.bearing,
          p2.bearing,
          p3.bearing,
          localT
        ),
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [capturedViews]);

  const animateDrone = useCallback(() => {
    const views = capturedViews.map((v) => ({
      lat: v.viewState.latitude,
      lng: v.viewState.longitude,
    }));
    const bezierSegments = views.slice(0, -1).map((start, i) => {
      const end = views[i + 1];
      const prev = i > 0 ? views[i - 1] : undefined;
      const next = i < views.length - 2 ? views[i + 2] : undefined;
      return {
        start,
        end,
        ...generateBezierControlPoints(start, end, prev, next),
      };
    });

    const totalSegments = views.length - 1;
    const segmentDuration = 4000;
    const totalDuration = totalSegments * segmentDuration;
    const startTime = performance.now();

    const initialBearing = calculateBearing(
      views[0].lat,
      views[0].lng,
      views[1].lat,
      views[1].lng
    );
    setViewState({
      latitude: views[0].lat,
      longitude: views[0].lng,
      zoom: altitude,
      pitch,
      bearing: initialBearing,
    });

    const animate = (currentTime: number) => {
      const globalT = Math.min((currentTime - startTime) / totalDuration, 1);
      if (globalT >= 1) {
        const last = views[views.length - 1],
          prev = views[views.length - 2];
        setViewState({
          latitude: last.lat,
          longitude: last.lng,
          zoom: altitude,
          pitch,
          bearing: calculateBearing(prev.lat, prev.lng, last.lat, last.lng),
        });
        setIsAnimating(false);
        return;
      }

      const segmentFloat = globalT * totalSegments;
      const segmentIndex = Math.min(
        Math.floor(segmentFloat),
        totalSegments - 1
      );
      const localT = EASING.easeInOut(segmentFloat - segmentIndex);
      const seg = bezierSegments[segmentIndex];

      const lat = cubicBezier(
        seg.start.lat,
        seg.cp1.lat,
        seg.cp2.lat,
        seg.end.lat,
        localT
      );
      const lng = cubicBezier(
        seg.start.lng,
        seg.cp1.lng,
        seg.cp2.lng,
        seg.end.lng,
        localT
      );
      const lookAheadT = Math.min(localT + 0.05, 1);
      const aheadLat = cubicBezier(
        seg.start.lat,
        seg.cp1.lat,
        seg.cp2.lat,
        seg.end.lat,
        lookAheadT
      );
      const aheadLng = cubicBezier(
        seg.start.lng,
        seg.cp1.lng,
        seg.cp2.lng,
        seg.end.lng,
        lookAheadT
      );

      setViewState({
        latitude: lat,
        longitude: lng,
        zoom: altitude,
        pitch,
        bearing: calculateBearing(lat, lng, aheadLat, aheadLng),
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    timeoutRef.current = setTimeout(
      () => (animationRef.current = requestAnimationFrame(animate)),
      100
    );
  }, [capturedViews, altitude, pitch]);

  const animateRoad = useCallback(() => {
    if (!routeData || routeData.length < 2) return;

    const totalDistance = routeData[routeData.length - 1].distance;
    const totalDuration = (totalDistance / speed) * 1000;
    const startTime = performance.now();
    let prevBearing = calculateBearing(
      routeData[0].lat,
      routeData[0].lng,
      routeData[1].lat,
      routeData[1].lng
    );

    const animate = (currentTime: number) => {
      const t = EASING.easeInOut(
        Math.min((currentTime - startTime) / totalDuration, 1)
      );
      const currentDistance = t * totalDistance;
      const currentPoint = getPointAtDistance(routeData, currentDistance);
      const lookAheadPoint = getPointAtDistance(
        routeData,
        Math.min(currentDistance + 60, totalDistance)
      );
      const targetBearing = calculateBearing(
        currentPoint.lat,
        currentPoint.lng,
        lookAheadPoint.lat,
        lookAheadPoint.lng
      );
      const smoothedBearing = interpolateBearing(
        prevBearing,
        targetBearing,
        0.1
      );
      prevBearing = smoothedBearing;

      // Update character state for car icon
      setCharacterState({
        position: currentPoint,
        bearing: smoothedBearing,
      });

      setViewState({
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        zoom: altitude,
        pitch,
        bearing: smoothedBearing,
      });

      if (t < 1) animationRef.current = requestAnimationFrame(animate);
      else {
        setIsAnimating(false);
        setCharacterState(null); // Clear car when animation ends
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [routeData, altitude, pitch, speed]);

  const previewFlythrough = useCallback(() => {
    if (isAnimating) {
      stopAnimation();
      return;
    }
    if (capturedViews.length < 2) return;
    if (previewMode === 'road' && (!routeData || isLoadingRoute)) return;

    setIsAnimating(true);

    switch (previewMode) {
      case 'direct':
        animateDirect();
        break;
      case 'arc':
        animateArc();
        break;
      case 'spline':
        animateSpline();
        break;
      case 'drone':
        animateDrone();
        break;
      case 'road':
        animateRoad();
        break;
    }
  }, [
    isAnimating,
    capturedViews,
    previewMode,
    routeData,
    isLoadingRoute,
    stopAnimation,
    animateDirect,
    animateArc,
    animateSpline,
    animateDrone,
    animateRoad,
  ]);

  if (!isOpen) return null;

  const modeDescriptions: Record<PreviewMode, string> = {
    direct: '📍 Direct: Smooth linear transition between points',
    arc: '🌐 Arc Flyover: Google Earth-style zoom out and fly over',
    spline: '🎢 Spline: Smooth curved path (Catmull-Rom)',
    drone: '🚁 Drone: Constant altitude, always facing forward',
    road: '🚗 Road: Follow actual driving route via OSRM',
  };

  const showControls = previewMode === 'drone' || previewMode === 'road';
  const totalDistanceKm = routeData
    ? (routeData[routeData.length - 1].distance / 1000).toFixed(2)
    : '0';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '85%',
          height: '85%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 8,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            Transition Overview ({capturedViews.length} views)
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {capturedViews.length >= 2 && (
              <button
                onClick={previewFlythrough}
                disabled={
                  previewMode === 'road' && (isLoadingRoute || !routeData)
                }
                style={{
                  padding: '6px 16px',
                  background: isAnimating ? '#e74c3c' : '#27ae60',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor:
                    previewMode === 'road' && (isLoadingRoute || !routeData)
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: 500,
                  opacity:
                    previewMode === 'road' && (isLoadingRoute || !routeData)
                      ? 0.6
                      : 1,
                }}
              >
                {isAnimating ? '⏹ Stop' : '▶ Preview'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div
          style={{
            padding: '8px 12px',
            background: '#f9f9f9',
            borderBottom: '1px solid #eee',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {(['direct', 'arc', 'spline', 'drone', 'road'] as PreviewMode[]).map(
            (mode) => (
              <button
                key={mode}
                onClick={() => !isAnimating && setPreviewMode(mode)}
                disabled={isAnimating}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  background: previewMode === mode ? '#4a90d9' : '#fff',
                  color: previewMode === mode ? '#fff' : '#333',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: previewMode === mode ? 600 : 400,
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Mode Description */}
        <div
          style={{
            padding: '8px 12px',
            background: '#f0f4f8',
            borderBottom: '1px solid #ddd',
            fontSize: 13,
            color: '#555',
          }}
        >
          {modeDescriptions[previewMode]}
          {previewMode === 'road' && routeData && (
            <span style={{ marginLeft: 16, color: '#333' }}>
              📍 {totalDistanceKm} km
            </span>
          )}
        </div>

        {/* Controls for Drone/Road */}
        {showControls && (
          <div
            style={{
              padding: '10px 12px',
              background: '#fafafa',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              fontSize: 13,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ color: '#555' }}>Zoom:</label>
              <input
                type="range"
                min="12"
                max="18"
                step="0.5"
                value={altitude}
                onChange={(e) => setAltitude(parseFloat(e.target.value))}
                disabled={isAnimating}
                style={{ width: 80 }}
              />
              <span style={{ minWidth: 30 }}>{altitude}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ color: '#555' }}>Pitch:</label>
              <input
                type="range"
                min="0"
                max="85"
                step="5"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                disabled={isAnimating}
                style={{ width: 80 }}
              />
              <span style={{ minWidth: 30 }}>{pitch}°</span>
            </div>
            {previewMode === 'road' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ color: '#555' }}>Speed:</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  disabled={isAnimating}
                  style={{ width: 80 }}
                />
                <span style={{ minWidth: 50 }}>{speed} m/s</span>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {capturedViews.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
              }}
            >
              No captured views yet. Capture views on slides first.
            </div>
          ) : previewMode === 'road' && isLoadingRoute ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '4px solid #ddd',
                  borderTopColor: '#4a90d9',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Fetching driving route...
            </div>
          ) : previewMode === 'road' && routeError ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#e74c3c',
                flexDirection: 'column',
                gap: 8,
                padding: 20,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 32 }}>⚠️</span>
              {routeError}
            </div>
          ) : (
            <DeckModal
              viewState={viewState}
              onViewStateChange={setViewState}
              isAnimating={isAnimating}
              capturedViews={capturedViews}
              routeData={routeData}
              showRoute={previewMode === 'road'}
              characterState={characterState}
            />
          )}
        </div>

        {/* Footer - Captured Views */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #ddd',
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
          }}
        >
          {capturedViews.map((v, i) => (
            <div
              key={v.index}
              style={{
                padding: 8,
                border: '1px solid #ddd',
                minWidth: 120,
                borderRadius: 4,
                background: '#fafafa',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {i === 0
                  ? '🚀 Start'
                  : i === capturedViews.length - 1
                  ? '🏁 End'
                  : `📍 #${i + 1}`}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                Lat: {v.viewState.latitude.toFixed(4)}
                <br />
                Lng: {v.viewState.longitude.toFixed(4)}
                <br />
                Zoom: {v.viewState.zoom.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
