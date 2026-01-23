'use client';

import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IconLayer } from '@deck.gl/layers';

const MAPTILER_KEY = 'UNHj0GK3Cp5YNQK00xcf';
const MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;

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
    const mapRef = useRef<any>(null);

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
          const map = mapRef.current?.getMap();
          if (!map) {
            resolve(null);
            return;
          }

          map.once('render', () => {
            const mapCanvas = map.getCanvas();
            const deckCanvas = deckRef.current?.deck?.canvas;

            const composite = document.createElement('canvas');
            composite.width = mapCanvas.width;
            composite.height = mapCanvas.height;
            const ctx = composite.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }

            ctx.drawImage(mapCanvas, 0, 0);
            if (deckCanvas) {
              ctx.drawImage(deckCanvas, 0, 0);
            }

            resolve(composite.toDataURL('image/png', 0.6));
          });

          map.triggerRepaint();
        });
      },
    }));

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
          layers={
            capturedPinLayer ? [livePinLayer, capturedPinLayer] : [livePinLayer]
          }
        >
          <Map ref={mapRef} mapStyle={MAP_STYLE} />
        </DeckGL>
      </div>
    );
  }
);

DeckMap.displayName = 'DeckMap';

export default DeckMap;
