import { useRef, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Using Maptiler's free tier which has 3D building data
// Sign up at https://www.maptiler.com/ for a free API key
const MAPTILER_KEY = 'get_your_free_key_from_maptiler'; // Replace with your key

const MAP_STYLE = `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`;

// Alternative: Use OpenFreeMap (completely free, no API key needed)
const FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface DeckMapProps {
  initialViewState?: ViewState;
  onChange: (viewState: ViewState) => void;
}

const DEFAULT_VIEW_STATE: ViewState = {
  latitude: 40.7128, // New York City - better 3D building coverage
  longitude: -74.006,
  zoom: 16,
  pitch: 60,
  bearing: -17,
};

export default function DeckMap({ initialViewState, onChange }: DeckMapProps) {
  const deckRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  const [viewState, setViewState] = useState<ViewState>(
    initialViewState || DEFAULT_VIEW_STATE
  );

  useEffect(() => {
    if (initialViewState) {
      setViewState(initialViewState);
    }
  }, [initialViewState]);

  const onMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Wait for style to be fully loaded
    if (!map.isStyleLoaded()) {
      map.once('styledata', () => add3DBuildings(map));
    } else {
      add3DBuildings(map);
    }
  };

  const add3DBuildings = (map: any) => {
    // Check if layer already exists
    if (map.getLayer('3d-buildings')) return;

    const layers = map.getStyle()?.layers;
    if (!layers) return;

    // Find the first symbol layer to insert buildings below labels
    const labelLayerId = layers.find(
      (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
    )?.id;

    // Check for available building sources
    const sources = map.getStyle()?.sources;
    const sourceId = Object.keys(sources || {}).find((key) =>
      ['openmaptiles', 'maptiler_planet', 'carto', 'composite'].includes(key)
    );

    if (!sourceId) {
      console.log('No compatible building source found');
      return;
    }

    try {
      map.addLayer(
        {
          id: '3d-buildings',
          source: sourceId,
          'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0,
              '#e0e0e0',
              50,
              '#b0b0b0',
              100,
              '#909090',
              200,
              '#707070',
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              14.5,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              14.5,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.85,
          },
        },
        labelLayerId
      );

      console.log('3D buildings layer added successfully');
    } catch (error) {
      console.error('Error adding 3D buildings:', error);
    }
  };

  return (
    <div
      id="deck-container"
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => {
          setViewState(newViewState as ViewState);
          onChange(newViewState as ViewState);
        }}
        controller={true}
        layers={[]}
      >
        <Map ref={mapRef} mapStyle={FREE_MAP_STYLE} onLoad={onMapLoad} />
      </DeckGL>

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: 8,
          fontSize: 12,
          maxWidth: 250,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
          3D Buildings Map
        </div>
        <div>Zoom: {viewState.zoom.toFixed(1)}</div>
        <div>Pitch: {viewState.pitch.toFixed(0)}°</div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>
          💡 Zoom in to level 15+ to see 3D buildings
        </div>
      </div>
    </div>
  );
}
