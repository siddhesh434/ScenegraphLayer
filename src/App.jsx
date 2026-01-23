'use client';

import { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'UNHj0GK3Cp5YNQK00xcf';
const MAP_STYLE = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;
const BUILDING_MODEL_URL = 'https://storage.googleapis.com/nika-3d-models/model2.glb?v=' + Date.now();

const INITIAL_VIEW = {
  longitude: 103.8353,
  latitude: 1.3287,
  zoom: 17,
  pitch: 60,
  bearing: 0,
};

// Preset colors that work well with satellite basemaps
const COLOR_PRESETS = [
  { name: 'Original', color: [255, 255, 255] },
  { name: 'Gray', color: [180, 180, 180] },
  { name: 'Sandstone', color: [200, 190, 170] },
  { name: 'Blue-Gray', color: [150, 170, 180] },
  { name: 'Warm', color: [220, 200, 180] },
  { name: 'Cool', color: [180, 190, 210] },
  { name: 'Terracotta', color: [205, 155, 130] },
  { name: 'Slate', color: [120, 130, 140] },
];

// Colors for GeoJSON layers
const GEO_COLORS = [
  [255, 0, 0, 150],
  [0, 255, 0, 150],
  [0, 0, 255, 150],
  [255, 165, 0, 150],
  [128, 0, 128, 150],
  [0, 255, 255, 150],
  [255, 105, 180, 150],
  [50, 205, 50, 150],
];

// Helper to convert RGB array to hex
const rgbToHex = (rgb) => {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
};

// Helper to convert hex to RGB array
const hexToRgb = (hex) => {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
};

export default function CarMap() {
  const [position, setPosition] = useState({ lng: 103.8353, lat: 1.3287 });
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0, roll: 90 });
  const [manualMode, setManualMode] = useState(false);
  const [carScale, setCarScale] = useState(157);
  const [elevation, setElevation] = useState(48);
  const [buildingColor, setBuildingColor] = useState([255, 255, 255]);

  // Lighting controls
  const [ambientIntensity, setAmbientIntensity] = useState(2.0);
  const [directionalIntensity, setDirectionalIntensity] = useState(3.0);
  const [lightDirection, setLightDirection] = useState({ x: -1, y: -2, z: -3 });

  // GeoJSON layers state
  const [geoDataList, setGeoDataList] = useState([]);

  // Create lighting effect with memoization to prevent unnecessary re-renders
  const lightingEffect = useMemo(() => {
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: ambientIntensity,
    });

    const directionalLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: directionalIntensity,
      direction: [lightDirection.x, lightDirection.y, lightDirection.z],
    });

    // Optional: Add a second directional light for fill lighting
    const fillLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: directionalIntensity * 0.5,
      direction: [lightDirection.x * -1, lightDirection.y * -0.5, lightDirection.z],
    });

    return new LightingEffect({ ambientLight, directionalLight, fillLight });
  }, [ambientIntensity, directionalIntensity, lightDirection]);

  // Drag and drop handlers
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.name.endsWith('.geojson') && !file?.name.endsWith('.json')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setGeoDataList(prev => [...prev, { id: Date.now(), name: file.name, data }]);
      } catch (err) {
        console.error('Invalid GeoJSON:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleMapClick = (info) => {
    if (manualMode && info.coordinate) {
      setPosition({ lng: info.coordinate[0], lat: info.coordinate[1] });
    }
  };

  // Building layer
  const buildingLayer = new ScenegraphLayer({
    id: 'car',
    data: [{ position: [position.lng, position.lat, elevation] }],
    scenegraph: BUILDING_MODEL_URL,
    getPosition: (d) => d.position,
    getOrientation: () => [rotation.pitch, rotation.yaw, rotation.roll],
    sizeScale: carScale,
    _lighting: 'pbr',
    getColor: () => buildingColor,
  });

  // GeoJSON layers
  const geoLayers = geoDataList.map((item, i) =>
    new GeoJsonLayer({
      id: `geojson-${item.id}`,
      data: item.data,
      filled: true,
      stroked: true,
      getFillColor: GEO_COLORS[i % GEO_COLORS.length],
      getLineColor: [255, 255, 255],
      getLineWidth: 2,
      getPointRadius: 50,
      pointRadiusMinPixels: 5,
    })
  );

  const buttonStyle = {
    padding: '4px 8px',
    background: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  };

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100vh' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={!manualMode}
        layers={[...geoLayers, buildingLayer]}
        effects={[lightingEffect]}
        onClick={handleMapClick}
        getCursor={() => manualMode ? 'crosshair' : 'grab'}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* GeoJSON Layers Panel */}
      {geoDataList.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          zIndex: 1000,
          minWidth: 200,
        }}>
          <strong>📁 GeoJSON Layers ({geoDataList.length})</strong>
          {geoDataList.map((item, i) => (
            <div key={item.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                flexShrink: 0,
                background: `rgba(${GEO_COLORS[i % GEO_COLORS.length].join(',')})`,
                border: '1px solid rgba(255,255,255,0.3)',
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <button
                onClick={() => setGeoDataList(prev => prev.filter(g => g.id !== item.id))}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '2px 8px',
                  fontSize: 12,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setGeoDataList([])}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px',
              background: '#6b7280',
              border: 'none',
              color: 'white',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Drag indicator when no files loaded */}
      {geoDataList.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'rgba(255, 255, 255, 0.7)',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12,
          zIndex: 1000,
          border: '1px dashed rgba(255,255,255,0.3)',
        }}>
          📁 Drag & drop GeoJSON files here
        </div>
      )}

      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 16,
        borderRadius: 8,
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 1000,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
      }}>
        <button
          onClick={() => setManualMode(!manualMode)}
          style={{
            padding: '8px 16px',
            marginBottom: 8,
            background: manualMode ? '#22c55e' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {manualMode ? '✓ Manual Mode ON' : 'Enable Manual Mode'}
        </button>

        {/* Lighting Controls Section */}
        <div style={{
          background: 'rgba(255, 200, 0, 0.15)',
          padding: 12,
          borderRadius: 6,
          marginBottom: 4,
          border: '1px solid rgba(255, 200, 0, 0.3)'
        }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#fcd34d' }}>
            💡 Lighting
          </label>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Ambient Intensity</span>
              <span>{ambientIntensity.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={ambientIntensity}
              onChange={(e) => setAmbientIntensity(+e.target.value)}
              style={{ width: '100%', accentColor: '#fcd34d' }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>Directional Intensity</span>
              <span>{directionalIntensity.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={directionalIntensity}
              onChange={(e) => setDirectionalIntensity(+e.target.value)}
              style={{ width: '100%', accentColor: '#fcd34d' }}
            />
          </div>

          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <label style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, display: 'block' }}>
              Light Direction
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>X: {lightDirection.x}</label>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={lightDirection.x}
                  onChange={(e) => setLightDirection({ ...lightDirection, x: +e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Y: {lightDirection.y}</label>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={lightDirection.y}
                  onChange={(e) => setLightDirection({ ...lightDirection, y: +e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Z: {lightDirection.z}</label>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={lightDirection.z}
                  onChange={(e) => setLightDirection({ ...lightDirection, z: +e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Lighting Presets */}
          <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setAmbientIntensity(2.0);
                setDirectionalIntensity(3.0);
                setLightDirection({ x: -1, y: -2, z: -3 });
              }}
              style={{ ...buttonStyle, fontSize: 10, background: '#6b7280' }}
            >
              Default
            </button>
            <button
              onClick={() => {
                setAmbientIntensity(3.5);
                setDirectionalIntensity(4.0);
                setLightDirection({ x: 0, y: -1, z: -2 });
              }}
              style={{ ...buttonStyle, fontSize: 10, background: '#f59e0b' }}
            >
              Bright
            </button>
            <button
              onClick={() => {
                setAmbientIntensity(1.0);
                setDirectionalIntensity(2.0);
                setLightDirection({ x: -2, y: -1, z: -1 });
              }}
              style={{ ...buttonStyle, fontSize: 10, background: '#3b82f6' }}
            >
              Soft
            </button>
            <button
              onClick={() => {
                setAmbientIntensity(0.5);
                setDirectionalIntensity(4.5);
                setLightDirection({ x: -3, y: -0.5, z: -1 });
              }}
              style={{ ...buttonStyle, fontSize: 10, background: '#ef4444' }}
            >
              Dramatic
            </button>
          </div>
        </div>

        {/* Building Color Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: 12,
          borderRadius: 6,
          marginBottom: 4
        }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Building Color
          </label>

          {/* Color Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="color"
              value={rgbToHex(buildingColor)}
              onChange={(e) => setBuildingColor(hexToRgb(e.target.value))}
              style={{
                width: 48,
                height: 32,
                cursor: 'pointer',
                border: 'none',
                borderRadius: 4,
                padding: 0,
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              RGB({buildingColor.join(', ')})
            </span>
          </div>

          {/* Color Presets */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4
          }}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setBuildingColor(preset.color)}
                style={{
                  ...buttonStyle,
                  background: rgbToHex(preset.color),
                  color: preset.color.reduce((a, b) => a + b, 0) > 400 ? '#000' : '#fff',
                  padding: '6px 4px',
                  fontSize: 10,
                  border: buildingColor.join(',') === preset.color.join(',')
                    ? '2px solid #22c55e'
                    : '2px solid transparent',
                }}
                title={`RGB(${preset.color.join(', ')})`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Individual RGB Sliders */}
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f87171' }}>Red</span>
                <span>{buildingColor[0]}</span>
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={buildingColor[0]}
                onChange={(e) => setBuildingColor([+e.target.value, buildingColor[1], buildingColor[2]])}
                style={{ width: '100%', accentColor: '#f87171' }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4ade80' }}>Green</span>
                <span>{buildingColor[1]}</span>
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={buildingColor[1]}
                onChange={(e) => setBuildingColor([buildingColor[0], +e.target.value, buildingColor[2]])}
                style={{ width: '100%', accentColor: '#4ade80' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#60a5fa' }}>Blue</span>
                <span>{buildingColor[2]}</span>
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={buildingColor[2]}
                onChange={(e) => setBuildingColor([buildingColor[0], buildingColor[1], +e.target.value])}
                style={{ width: '100%', accentColor: '#60a5fa' }}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Size: {carScale}</label>
          <input
            type="range"
            min={1}
            max={500}
            value={carScale}
            onChange={(e) => setCarScale(+e.target.value)}
            style={{ width: 192 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Elevation: {elevation}m</label>
          <input
            type="range"
            min={0}
            max={500}
            value={elevation}
            onChange={(e) => setElevation(+e.target.value)}
            style={{ width: 192 }}
          />
        </div>
        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.3)', margin: '4px 0' }} />
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Longitude: {position.lng.toFixed(4)}</label>
          <input
            type="range"
            min={103.826}
            max={103.846}
            step={0.0001}
            value={position.lng}
            onChange={(e) => setPosition({ ...position, lng: +e.target.value })}
            style={{ width: 192 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Latitude: {position.lat.toFixed(4)}</label>
          <input
            type="range"
            min={1.319}
            max={1.339}
            step={0.0001}
            value={position.lat}
            onChange={(e) => setPosition({ ...position, lat: +e.target.value })}
            style={{ width: 192 }}
          />
        </div>
        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.3)', margin: '4px 0' }} />
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Yaw (heading): {rotation.yaw}°</label>
          <input
            type="range"
            min={0}
            max={360}
            value={rotation.yaw}
            onChange={(e) => setRotation({ ...rotation, yaw: +e.target.value })}
            style={{ width: 192 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Pitch (tilt): {rotation.pitch}°</label>
          <input
            type="range"
            min={-90}
            max={90}
            value={rotation.pitch}
            onChange={(e) => setRotation({ ...rotation, pitch: +e.target.value })}
            style={{ width: 192 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Roll: {rotation.roll}°</label>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation.roll}
            onChange={(e) => setRotation({ ...rotation, roll: +e.target.value })}
            style={{ width: 192 }}
          />
        </div>
      </div>
    </div>
  );
}


