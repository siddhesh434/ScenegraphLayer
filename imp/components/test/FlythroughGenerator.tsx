'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const PRESETS = {
  nyc: { start: { lat: 40.7128, lon: -74.006, zoom: 9, bearing: 0, pitch: 0 }, end: { lat: 40.7580, lon: -73.9855, zoom: 17, bearing: 45, pitch: 60 } },
  sf: { start: { lat: 37.7749, lon: -122.4194, zoom: 9, bearing: 0, pitch: 0 }, end: { lat: 37.8199, lon: -122.4783, zoom: 17, bearing: 330, pitch: 65 } },
  tokyo: { start: { lat: 35.6762, lon: 139.6503, zoom: 8, bearing: 0, pitch: 0 }, end: { lat: 35.6586, lon: 139.7454, zoom: 16, bearing: 60, pitch: 55 } },
  london: { start: { lat: 51.5074, lon: -0.1278, zoom: 9, bearing: 0, pitch: 0 }, end: { lat: 51.5014, lon: -0.1419, zoom: 17, bearing: 20, pitch: 60 } },
  dubai: { start: { lat: 25.2048, lon: 55.2708, zoom: 8, bearing: 0, pitch: 0 }, end: { lat: 25.1972, lon: 55.2744, zoom: 16, bearing: 315, pitch: 65 } }
};

const EASING: Record<string, (t: number) => number> = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};

type ViewState = { latitude: number; longitude: number; zoom: number; pitch: number; bearing: number };
type Position = { lat: number; lon: number; zoom: number; bearing: number; pitch: number };

export default function FlythroughGenerator() {
  const [viewState, setViewState] = useState<ViewState>({ latitude: 40.7128, longitude: -74.006, zoom: 10, pitch: 0, bearing: 0 });
  const [startPos, setStartPos] = useState<Position>({ lat: 40.7128, lon: -74.006, zoom: 10, bearing: 0, pitch: 0 });
  const [endPos, setEndPos] = useState<Position>({ lat: 40.7580, lon: -73.9855, zoom: 16, bearing: 45, pitch: 60 });
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(30);
  const [easing, setEasing] = useState('easeInOut');
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState({ active: false, percent: 0, status: '' });
  const deckRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  const interpolate = (start: number, end: number, t: number) => start + (end - start) * EASING[easing](t);

  const interpolateBearing = (start: number, end: number, t: number) => {
    let delta = end - start;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return start + delta * EASING[easing](t);
  };

  const capturePosition = (type: 'start' | 'end') => {
    const pos = { lat: viewState.latitude, lon: viewState.longitude, zoom: viewState.zoom, bearing: ((viewState.bearing % 360) + 360) % 360, pitch: viewState.pitch };
    type === 'start' ? setStartPos(pos) : setEndPos(pos);
  };

  const goTo = (pos: Position) => {
    setViewState(prev => ({
      ...prev,
      latitude: pos.lat,
      longitude: pos.lon,
      zoom: pos.zoom,
      pitch: pos.pitch,
      bearing: pos.bearing,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator()
    } as any));
  };

  const loadPreset = (name: keyof typeof PRESETS) => {
    const p = PRESETS[name];
    setStartPos(p.start);
    setEndPos(p.end);
    goTo(p.start);
  };

  const previewAnimation = useCallback(() => {
    if (isAnimating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    const durationMs = duration * 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const t = Math.min((currentTime - startTime) / durationMs, 1);
      setViewState({
        latitude: interpolate(startPos.lat, endPos.lat, t),
        longitude: interpolate(startPos.lon, endPos.lon, t),
        zoom: interpolate(startPos.zoom, endPos.zoom, t),
        pitch: interpolate(startPos.pitch, endPos.pitch, t),
        bearing: interpolateBearing(startPos.bearing, endPos.bearing, t)
      });
      if (t < 1) animationRef.current = requestAnimationFrame(animate);
      else setIsAnimating(false);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, duration, startPos, endPos, easing]);

  const generateVideo = async () => {
    const canvas = document.querySelector('#deck-container canvas') as HTMLCanvasElement;
    if (!canvas) { alert('Canvas not found'); return; }

    setProgress({ active: true, percent: 0, status: 'Initializing...' });
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `flythrough_${Date.now()}.webm`;
      link.click();
      setProgress({ active: false, percent: 0, status: '' });
    };

    recorder.start();
    setProgress(p => ({ ...p, status: 'Recording...' }));
    const durationMs = duration * 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const t = Math.min((currentTime - startTime) / durationMs, 1);
      setProgress(p => ({ ...p, percent: Math.round(t * 100) }));
      setViewState({
        latitude: interpolate(startPos.lat, endPos.lat, t),
        longitude: interpolate(startPos.lon, endPos.lon, t),
        zoom: interpolate(startPos.zoom, endPos.zoom, t),
        pitch: interpolate(startPos.pitch, endPos.pitch, t),
        bearing: interpolateBearing(startPos.bearing, endPos.bearing, t)
      });
      if (t < 1) requestAnimationFrame(animate);
      else setTimeout(() => recorder.stop(), 100);
    };

    setViewState({ latitude: startPos.lat, longitude: startPos.lon, zoom: startPos.zoom, pitch: startPos.pitch, bearing: startPos.bearing });
    setTimeout(() => requestAnimationFrame(animate), 500);
  };

  const viewInfo = `${viewState.latitude.toFixed(4)}, ${viewState.longitude.toFixed(4)} | Z:${viewState.zoom.toFixed(1)} | P:${viewState.pitch.toFixed(0)}° | B:${(((viewState.bearing % 360) + 360) % 360).toFixed(0)}°`;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: 320, padding: 10, overflowY: 'auto', background: '#f5f5f5' }}>
        <h2 style={{ marginBottom: 15 }}>Flythrough Generator</h2>

        <Section title="Presets">
          {Object.keys(PRESETS).map(p => <button key={p} onClick={() => loadPreset(p as keyof typeof PRESETS)} style={btnStyle}>{p.toUpperCase()}</button>)}
        </Section>

        <Section title="Current Position">
          <Row><Field label="Lat" value={viewState.latitude.toFixed(6)} readOnly /></Row>
          <Row><Field label="Lon" value={viewState.longitude.toFixed(6)} readOnly /></Row>
          <Row><Field label="Zoom" value={viewState.zoom.toFixed(2)} readOnly /></Row>
          <Row>
            <Field label="Bearing" value={(((viewState.bearing % 360) + 360) % 360).toFixed(0)} readOnly />
          </Row>
          <Row>
            <Field label="Pitch" value={viewState.pitch.toFixed(0)} readOnly />

          </Row>
        </Section>

        <Section title={<>Start Position <button onClick={() => capturePosition('start')} style={btnStyle}>Capture</button></>}>
          <Row><Field label="Lat" value={startPos.lat.toFixed(6)} readOnly /></Row>
          <Row><Field label="Lon" value={startPos.lon.toFixed(6)} readOnly /></Row>
          <Row><Field label="Zoom" value={startPos.zoom.toFixed(2)} readOnly /></Row>
          <Row><Field label="Bearing" value={startPos.bearing.toFixed(0)} readOnly /></Row>
          <Row><Field label="Pitch" value={startPos.pitch.toFixed(0)} readOnly /></Row>
        </Section>

        <Section title={<>End Position <button onClick={() => capturePosition('end')} style={btnStyle}>Capture</button></>}>
          <Row><Field label="Lat" value={endPos.lat.toFixed(6)} readOnly /></Row>
          <Row><Field label="Lon" value={endPos.lon.toFixed(6)} readOnly /></Row>
          <Row><Field label="Zoom" value={endPos.zoom.toFixed(2)} readOnly /></Row>
          <Row><Field label="Bearing" value={endPos.bearing.toFixed(0)} readOnly /></Row>
          <Row><Field label="Pitch" value={endPos.pitch.toFixed(0)} readOnly /></Row>
        </Section>

        <Section title="Animation Settings">
          <Row>
            <Field label="Duration(s)" value={duration} onChange={e => setDuration(+e.target.value)} type="number" min={1} max={60} />
            <div>
              <label style={labelStyle}>FPS</label>
              <select value={fps} onChange={e => setFps(+e.target.value)} style={inputStyle}>
                <option value={24}>24</option><option value={30}>30</option><option value={60}>60</option>
              </select>
            </div>
          </Row>
          <Row>
            <div>
              <label style={labelStyle}>Easing</label>
              <select value={easing} onChange={e => setEasing(e.target.value)} style={inputStyle}>
                <option value="linear">Linear</option><option value="easeInOut">Ease In-Out</option>
                <option value="easeIn">Ease In</option><option value="easeOut">Ease Out</option>
                <option value="easeInOutCubic">Ease In-Out Cubic</option>
              </select>
            </div>
          </Row>
        </Section>

        <button onClick={previewAnimation} style={{ ...btnStyle, width: '100%' }}>{isAnimating ? 'Stop' : 'Preview'}</button>
        <button onClick={generateVideo} style={{ ...btnStyle, width: '100%' }}>Generate Video</button>
        <button onClick={() => goTo(startPos)} style={btnStyle}>Go to Start</button>
        <button onClick={() => goTo(endPos)} style={btnStyle}>Go to End</button>
      </div>

      <div
        id="deck-container"
        style={{ flex: 1, position: 'relative' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <DeckGL
          ref={deckRef}
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) => setViewState(vs as ViewState)}
          controller={{
            dragRotate: true,      // Right-click + drag horizontal = bearing
            touchRotate: true,     // Two-finger rotate on touch = bearing
            keyboard: true,        // Arrow keys for pitch/bearing
          }}
          layers={[]}
        >
          <Map mapStyle={MAP_STYLE} />
        </DeckGL>
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.9)', padding: 5, fontSize: 11 }}>{viewInfo}</div>
        {progress.active && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#fff' }}>
            <div style={{ fontSize: 24 }}>{progress.percent}%</div>
            <div>{progress.status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ marginBottom: 15, padding: 10, background: '#fff', border: '1px solid #ddd' }}>
    <h3 style={{ marginBottom: 8, fontSize: 14 }}>{title}</h3>
    {children}
  </div>
);

const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>{children}</div>;

const Field = ({ label, value, readOnly, onChange, type = 'text', min, max }: any) => (
  <div style={{ flex: 1 }}>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} readOnly={readOnly} onChange={onChange} min={min} max={max} style={inputStyle} />
  </div>
);

const labelStyle: React.CSSProperties = { fontSize: 12, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: 4, fontSize: 12 };
const btnStyle: React.CSSProperties = { padding: '6px 10px', margin: '2px', cursor: 'pointer' };