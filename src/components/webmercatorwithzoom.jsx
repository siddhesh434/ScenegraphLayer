import { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { WebMercatorViewport } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const BASE_ZOOM = 15; // zoom level where scale = 1

export default function App() {
    const [viewState, setViewState] = useState({
        longitude: 103.835,
        latitude: 1.328,
        zoom: 15,
        pitch: 0,
        bearing: 0,
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const vp = new WebMercatorViewport(viewState);
    const [x, y] = vp.project([103.835, 1.328]);

    // Scale factor: doubles for each zoom level increase
    const scale = Math.pow(2, viewState.zoom - BASE_ZOOM);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState: vs }) => setViewState(vs)}
                controller
            >
                <Map mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" />
            </DeckGL>

            <div style={{
                color: 'black',
                position: 'absolute',
                left: x,
                top: y,
                background: 'white',
                padding: 8,
                zIndex: 1,
                transform: `scale(${scale})`,
                transformOrigin: 'top left', // anchor point for scaling
            }}>
                Hello world
            </div>
        </div>
    );
}