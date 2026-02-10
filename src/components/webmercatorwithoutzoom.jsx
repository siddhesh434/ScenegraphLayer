import { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { WebMercatorViewport } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function App() {
    const [viewState, setViewState] = useState({
        longitude: 103.835,
        latitude: 1.328,
        zoom: 15,
        pitch: 0,
        bearing: 0,
    });

    const [boxSize, setBoxSize] = useState({ width: 120, height: 60 });
    const [boxOffset, setBoxOffset] = useState({ x: 0, y: 0 });
    const resizeRef = useRef(null);

    const handleResize = (edge) => (e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startSize = { ...boxSize };
        const startOffset = { ...boxOffset };

        const onMouseMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            setBoxSize(prev => ({
                width: Math.max(50, edge.includes('e') ? startSize.width + dx : edge.includes('w') ? startSize.width - dx : prev.width),
                height: Math.max(30, edge.includes('s') ? startSize.height + dy : edge.includes('n') ? startSize.height - dy : prev.height),
            }));

            setBoxOffset({
                x: edge.includes('w') ? startOffset.x + dx : startOffset.x,
                y: edge.includes('n') ? startOffset.y + dy : startOffset.y,
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const vp = new WebMercatorViewport(viewState);
    const [x, y] = vp.project([103.835, 1.328]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                controller
            >
                <Map mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" />
            </DeckGL>

            <div style={{
                position: 'absolute',
                left: x + boxOffset.x,
                top: y + boxOffset.y,
                width: boxSize.width,
                height: boxSize.height,
                background: 'white',
                border: '1px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
            }}>
                Hello world
                {/* Resize handles */}
                {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(edge => (
                    <div key={edge} onMouseDown={handleResize(edge)} style={{
                        position: 'absolute',
                        background: '#4a90d9',
                        ...(edge.length === 1 ? {
                            [edge === 'n' ? 'top' : edge === 's' ? 'bottom' : edge === 'e' ? 'right' : 'left']: -4,
                            ...(edge === 'n' || edge === 's'
                                ? { left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, cursor: 'ns-resize' }
                                : { top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, cursor: 'ew-resize' }),
                        } : {
                            width: 8, height: 8,
                            [edge.includes('n') ? 'top' : 'bottom']: -4,
                            [edge.includes('e') ? 'right' : 'left']: -4,
                            cursor: edge === 'ne' || edge === 'sw' ? 'nesw-resize' : 'nwse-resize',
                        }),
                    }} />
                ))}
            </div>
        </div>
    );
}