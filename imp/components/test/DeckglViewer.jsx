'use client';

import { useEffect, useState, useCallback } from 'react';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { Tiles3DLoader } from '@loaders.gl/3d-tiles';
import 'maplibre-gl/dist/maplibre-gl.css';

const LOCATIONS = {
  'Marina Bay Sands': { longitude: 103.861, latitude: 1.2847, zoom: 17 },
  'Orchard Road': { longitude: 103.8318, latitude: 1.3048, zoom: 17 },
  'Clarke Quay': { longitude: 103.8465, latitude: 1.2906, zoom: 17.5 },
  Chinatown: { longitude: 103.8443, latitude: 1.2839, zoom: 17.5 },
  'Gardens by the Bay': { longitude: 103.8636, latitude: 1.2816, zoom: 16.5 },
  Sentosa: { longitude: 103.8275, latitude: 1.2494, zoom: 16 },
};

const INITIAL_VIEW_STATE = {
  ...LOCATIONS['Marina Bay Sands'],
  pitch: 60,
  bearing: 30,
  minZoom: 10,
  maxZoom: 22,
  minPitch: 0,
  maxPitch: 85,
};

export default function DeckGLViewer() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [currentLocation, setCurrentLocation] = useState('Marina Bay Sands');
  const [isLoaded, setIsLoaded] = useState(false);

  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  // Create the 3D Tiles layer
  const layers = [
    new Tile3DLayer({
      id: 'google-3d-tiles',
      data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`,
      loader: Tiles3DLoader,
      loadOptions: {
        '3d-tiles': {
          loadGLTF: true,
        },
      },
      onTilesetLoad: (tileset) => {
        console.log('Tileset loaded:', tileset);
        setIsLoaded(true);
      },
      onTileLoad: (tile) => {
        // Optional: track tile loading
      },
      onTileError: (tile, error) => {
        console.error('Tile error:', error);
      },
    }),
  ];

  // Fly to a location with animation
  const flyTo = useCallback((locationName) => {
    const loc = LOCATIONS[locationName];
    if (!loc) return;

    setCurrentLocation(locationName);

    // Animate to new location
    setViewState((prev) => ({
      ...prev,
      longitude: loc.longitude,
      latitude: loc.latitude,
      zoom: loc.zoom,
      pitch: 60,
      bearing: prev.bearing + 30, // Slight rotation for effect
      transitionDuration: 2000,
    }));
  }, []);

  // Handle view state changes (user interaction)
  const onViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={{
          // Enable all interactions
          dragPan: true,
          dragRotate: true,
          scrollZoom: true,
          touchZoom: true,
          touchRotate: true,
          keyboard: true,
          doubleClickZoom: true,
        }}
        layers={layers}
      >
        {/* Base map (optional, provides context when tiles are loading) */}
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          attributionControl={false}
        />
      </DeckGL>

      {/* Location selector */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.75)',
          padding: '16px',
          borderRadius: '12px',
          color: 'white',
          backdropFilter: 'blur(10px)',
          zIndex: 1,
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8 }}>
          Singapore Hotspots (deck.gl)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.keys(LOCATIONS).map((name) => (
            <button
              key={name}
              onClick={() => flyTo(name)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                background:
                  currentLocation === name
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls help */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.75)',
          padding: '14px',
          borderRadius: '10px',
          color: 'white',
          fontSize: '12px',
          backdropFilter: 'blur(10px)',
          maxWidth: '220px',
          zIndex: 1,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px', opacity: 0.9 }}>
          🎮 Camera Controls
        </div>
        <div style={{ lineHeight: '1.6', opacity: 0.8 }}>
          <div>
            <b>Pan:</b> Left drag
          </div>
          <div>
            <b>Rotate (bearing):</b> Right drag or Ctrl + drag
          </div>
          <div>
            <b>Tilt (pitch):</b> Right drag up/down
          </div>
          <div>
            <b>Zoom:</b> Scroll wheel or pinch
          </div>
        </div>
      </div>

      {/* Camera info */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.75)',
          padding: '12px',
          borderRadius: '10px',
          color: 'white',
          fontSize: '11px',
          backdropFilter: 'blur(10px)',
          fontFamily: 'monospace',
          zIndex: 1,
        }}
      >
        <div>Pitch: {viewState.pitch?.toFixed(1)}°</div>
        <div>Bearing: {viewState.bearing?.toFixed(1)}°</div>
        <div>Zoom: {viewState.zoom?.toFixed(2)}</div>
        <div style={{ marginTop: '4px', opacity: 0.6 }}>
          {isLoaded ? '✅ Tiles loaded' : '⏳ Loading...'}
        </div>
      </div>
    </div>
  );
}
