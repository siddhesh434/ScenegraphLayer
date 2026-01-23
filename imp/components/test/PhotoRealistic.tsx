'use client';

import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import DeckGL from '@deck.gl/react';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { IconLayer } from '@deck.gl/layers';
import { Tiles3DLoader } from '@loaders.gl/3d-tiles';

const GOOGLE_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your key

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface DeckMapProps {
  initialViewState?: ViewState;
  capturedViewState: ViewState | null;
  onChange: (viewState: ViewState) => void;
}

export interface DeckMapRef {
  captureScreenshot: () => Promise<string | null>;
}

const DEFAULT_VIEW_STATE: ViewState = {
  latitude: 1.2834,
  longitude: 103.8607,
  zoom: 15.5,
  pitch: 50,
  bearing: -20,
};

const PIN_ICON = {
  url: 'https://cdn-icons-png.flaticon.com/512/17096/17096217.png',
  width: 128,
  height: 128,
  anchorY: 128,
};

const DeckMap = forwardRef<DeckMapRef, DeckMapProps>(
  ({ initialViewState, capturedViewState, onChange }, ref) => {
    const deckRef = useRef<any>(null);

    const [viewState, setViewState] = useState<ViewState>(
      initialViewState || DEFAULT_VIEW_STATE
    );

    useEffect(() => {
      if (initialViewState) {
        setViewState(initialViewState);
      }
    }, [initialViewState]);

    useImperativeHandle(ref, () => ({
      captureScreenshot: (): Promise<string | null> => {
        return new Promise((resolve) => {
          const deck = deckRef.current?.deck;
          if (!deck) {
            resolve(null);
            return;
          }

          // With Google 3D tiles, everything renders on DeckGL's canvas
          const canvas = deck.canvas;
          if (!canvas) {
            resolve(null);
            return;
          }

          // Force a redraw and capture
          deck.redraw(true);

          // Small delay to ensure render completes
          requestAnimationFrame(() => {
            try {
              const dataUrl = canvas.toDataURL('image/png', 0.6);
              resolve(dataUrl);
            } catch (e) {
              console.error('Screenshot capture failed:', e);
              resolve(null);
            }
          });
        });
      },
    }));

    // Google Photorealistic 3D Tiles layer
    const tile3DLayer = new Tile3DLayer({
      id: 'google-3d-tiles',
      data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`,
      loadOptions: {
        fetch: {
          headers: {
            'X-GOOG-API-KEY': GOOGLE_API_KEY,
          },
        },
      },
      loader: Tiles3DLoader,
    });

    const livePinLayer = new IconLayer({
      id: 'live-pin',
      data: [{ position: [viewState.longitude, viewState.latitude] }],
      getPosition: (d) => d.position,
      getIcon: () => PIN_ICON,
      sizeScale: 10,
      getSize: 4,
      billboard: true,
    });

    const capturedPinLayer =
      capturedViewState &&
      new IconLayer({
        id: 'captured-pin',
        data: [
          {
            position: [capturedViewState.longitude, capturedViewState.latitude],
          },
        ],
        getPosition: (d) => d.position,
        getIcon: () => PIN_ICON,
        sizeScale: 10,
        getSize: 4,
        billboard: true,
      });

    const layers = [tile3DLayer, livePinLayer, capturedPinLayer].filter(
      Boolean
    );

    return (
      <div
        style={{ width: '100%', height: '100%', position: 'relative' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <DeckGL
          ref={deckRef}
          viewState={viewState}
          controller={true}
          onViewStateChange={({ viewState: vs }) => {
            setViewState(vs as ViewState);
            onChange(vs as ViewState);
          }}
          layers={layers}
          glOptions={{ preserveDrawingBuffer: true }}
        />
      </div>
    );
  }
);

DeckMap.displayName = 'DeckMap';

export default DeckMap;
