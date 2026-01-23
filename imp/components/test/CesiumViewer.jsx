'use client';

import { useEffect, useRef, useState } from 'react';

const LOCATIONS = {
  'Marina Bay Sands': { lon: 103.861, lat: 1.2847, height: 500 },
  'Orchard Road': { lon: 103.8318, lat: 1.3048, height: 400 },
  'Clarke Quay': { lon: 103.8465, lat: 1.2906, height: 300 },
  Chinatown: { lon: 103.8443, lat: 1.2839, height: 300 },
  'Gardens by the Bay': { lon: 103.8636, lat: 1.2816, height: 400 },
  Sentosa: { lon: 103.8275, lat: 1.2494, height: 500 },
};

export default function CesiumViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Marina Bay Sands');

  useEffect(() => {
    const initCesium = async () => {
      try {
        const Cesium = await import('cesium');
        cesiumRef.current = Cesium;

        window.CESIUM_BASE_URL = '/cesium';
        await import('cesium/Build/Cesium/Widgets/widgets.css');

        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
        const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (!containerRef.current || viewerRef.current) return;

        const viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false,
          animation: false,
          homeButton: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          geocoder: false,
          sceneModePicker: false,
          fullscreenButton: false,
        });
        viewerRef.current = viewer;

        // Configure camera controls for pitch and bearing
        const controller = viewer.scene.screenSpaceCameraController;

        // Enable tilt and rotation with left mouse button
        controller.tiltEventTypes = [
          Cesium.CameraEventType.LEFT_DRAG,
          Cesium.CameraEventType.MIDDLE_DRAG,
          {
            eventType: Cesium.CameraEventType.LEFT_DRAG,
            modifier: Cesium.KeyboardEventModifier.ALT,
          },
          {
            eventType: Cesium.CameraEventType.LEFT_DRAG,
            modifier: Cesium.KeyboardEventModifier.CTRL,
          },
        ];

        // Enable rotation/bearing with right drag or Shift+left drag
        controller.rotateEventTypes = [
          Cesium.CameraEventType.RIGHT_DRAG,
          {
            eventType: Cesium.CameraEventType.LEFT_DRAG,
            modifier: Cesium.KeyboardEventModifier.SHIFT,
          },
        ];

        // Zoom with scroll wheel or pinch
        controller.zoomEventTypes = [
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH,
          {
            eventType: Cesium.CameraEventType.LEFT_DRAG,
            modifier: Cesium.KeyboardEventModifier.CTRL,
          },
        ];

        // Pan with middle drag
        controller.translateEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG];

        // Enable smooth zooming
        controller.enableZoom = true;
        controller.enableRotate = true;
        controller.enableTilt = true;
        controller.enableLook = true;

        // Load Google 3D Tiles
        const tileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`
        );
        viewer.scene.primitives.add(tileset);

        // Fly to Marina Bay Sands (crowded iconic location)
        const loc = LOCATIONS['Marina Bay Sands'];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            loc.lon,
            loc.lat,
            loc.height
          ),
          orientation: {
            heading: Cesium.Math.toRadians(30),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0,
          },
          duration: 2,
        });

        setIsLoaded(true);
      } catch (err) {
        console.error('Cesium init error:', err);
        setError(err.message);
      }
    };

    initCesium();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  const flyTo = (locationName) => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    const loc = LOCATIONS[locationName];

    if (!Cesium || !viewer || !loc) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, loc.height),
      orientation: {
        heading: Cesium.Math.toRadians(30),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 2,
    });
    setCurrentLocation(locationName);
  };

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        Error loading Cesium: {error}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {isLoaded && (
        <>
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
            }}
          >
            <h3
              style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8 }}
            >
              Singapore Hotspots
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              {Object.keys(LOCATIONS).map((name) => (
                <button
                  key={name}
                  onClick={() => flyTo(name)}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    background:
                      currentLocation === name
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
            }}
          >
            <div
              style={{ fontWeight: 'bold', marginBottom: '8px', opacity: 0.9 }}
            >
              🎮 Camera Controls
            </div>
            <div style={{ lineHeight: '1.6', opacity: 0.8 }}>
              <div>
                <b>Tilt (pitch):</b> Left drag or Alt + drag
              </div>
              <div>
                <b>Rotate (bearing):</b> Right drag or Shift + drag
              </div>
              <div>
                <b>Zoom:</b> Scroll wheel or Ctrl + drag
              </div>
              <div>
                <b>Pan:</b> Middle drag
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
