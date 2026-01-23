// const CESIUM_TOKEN =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOWRlODJiMi05Y2M4LTQ3OWEtYTBjMi1mZTkzNTUzYmJiMWMiLCJpZCI6MzczNzEzLCJpYXQiOjE3NjcwOTAyMjB9._O69EF4BHV3ls5-vENl8aTSIhkcEHqyfigzzpqxLkCU";
// const GOOGLE_API_KEY = "AIzaSyB-Ph_aiUqi_PuudYfIcfEvsHKrSimE94w";

// import React, { useEffect, useRef, useState } from "react";
// import { Deck, _GlobeView as GlobeView } from "@deck.gl/core";
// import { GeoJsonLayer } from "@deck.gl/layers";
// import * as Cesium from "cesium";
// import "cesium/Build/Cesium/Widgets/widgets.css";

// // ============ CONFIGURATION ============
// const CESIUM_TOKEN =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOWRlODJiMi05Y2M4LTQ3OWEtYTBjMi1mZTkzNTUzYmJiMWMiLCJpZCI6MzczNzEzLCJpYXQiOjE3NjcwOTAyMjB9._O69EF4BHV3ls5-vENl8aTSIhkcEHqyfigzzpqxLkCU";

// // Singapore coordinates
// const INITIAL_LOCATION = {
//   longitude: 103.8198,
//   latitude: 1.3521,
//   height: 1000,
// };

// // Red square GeoJSON centered on Singapore
// const squareSize = 0.005;
// const GEOJSON_DATA = {
//   type: "FeatureCollection",
//   features: [
//     {
//       type: "Feature",
//       properties: { name: "Red Square" },
//       geometry: {
//         type: "Polygon",
//         coordinates: [
//           [
//             [INITIAL_LOCATION.longitude - squareSize, INITIAL_LOCATION.latitude - squareSize],
//             [INITIAL_LOCATION.longitude + squareSize, INITIAL_LOCATION.latitude - squareSize],
//             [INITIAL_LOCATION.longitude + squareSize, INITIAL_LOCATION.latitude + squareSize],
//             [INITIAL_LOCATION.longitude - squareSize, INITIAL_LOCATION.latitude + squareSize],
//             [INITIAL_LOCATION.longitude - squareSize, INITIAL_LOCATION.latitude - squareSize],
//           ],
//         ],
//       },
//     },
//   ],
// };

// // ============ STYLES ============
// const styles = {
//   container: {
//     position: "relative",
//     width: "100%",
//     height: "100vh",
//     overflow: "hidden",
//   },
//   cesiumContainer: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     width: "100%",
//     height: "100%",
//   },
//   deckCanvas: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     width: "100%",
//     height: "100%",
//     pointerEvents: "none",
//   },
//   panelBase: {
//     position: "absolute",
//     top: 20,
//     background: "rgba(0,0,0,0.85)",
//     padding: 16,
//     borderRadius: 8,
//     color: "white",
//     zIndex: 1000,
//     fontSize: 13,
//     fontFamily: "monospace",
//     minWidth: 220,
//     backdropFilter: "blur(8px)",
//     border: "1px solid rgba(255,255,255,0.1)",
//   },
//   leftPanel: {
//     left: 20,
//   },
//   rightPanel: {
//     right: 20,
//   },
//   panelTitle: {
//     fontSize: 14,
//     fontWeight: "bold",
//     marginBottom: 12,
//     paddingBottom: 8,
//     borderBottom: "1px solid rgba(255,255,255,0.2)",
//     display: "flex",
//     alignItems: "center",
//     gap: 8,
//   },
//   row: {
//     display: "flex",
//     justifyContent: "space-between",
//     marginBottom: 6,
//     padding: "4px 0",
//   },
//   label: {
//     color: "rgba(255,255,255,0.7)",
//   },
//   value: {
//     fontWeight: "bold",
//   },
//   deckColor: {
//     color: "#4ade80",
//   },
//   cesiumColor: {
//     color: "#60a5fa",
//   },
//   status: {
//     position: "absolute",
//     bottom: 20,
//     left: "50%",
//     transform: "translateX(-50%)",
//     background: "rgba(0,0,0,0.8)",
//     padding: "10px 20px",
//     borderRadius: 8,
//     color: "white",
//     zIndex: 1000,
//     fontSize: 12,
//     textAlign: "center",
//   },
// };

// // ============ MAIN COMPONENT ============
// export default function CesiumDeckGL() {
//   const cesiumContainerRef = useRef(null);
//   const deckCanvasRef = useRef(null);
//   const viewerRef = useRef(null);
//   const deckRef = useRef(null);

//   const [status, setStatus] = useState("Loading...");

//   // Cesium coordinates state
//   const [cesiumCoords, setCesiumCoords] = useState({
//     longitude: 0,
//     latitude: 0,
//     height: 0,
//     heading: 0,
//     pitch: 0,
//     roll: 0,
//   });

//   // Deck.gl coordinates state
//   const [deckCoords, setDeckCoords] = useState({
//     longitude: 0,
//     latitude: 0,
//     zoom: 0,
//     pitch: 0,
//     bearing: 0,
//   });

//   useEffect(() => {
//     if (!cesiumContainerRef.current || !deckCanvasRef.current) return;

//     Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

//     // Initialize Cesium
//     const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
//       baseLayerPicker: false,
//       geocoder: false,
//       homeButton: false,
//       sceneModePicker: false,
//       selectionIndicator: false,
//       timeline: false,
//       animation: false,
//       navigationHelpButton: false,
//       fullscreenButton: false,
//       vrButton: false,
//       infoBox: false,
//       creditContainer: document.createElement("div"),
//     });
//     viewerRef.current = viewer;

//     // Set camera to Singapore
//     viewer.camera.setView({
//       destination: Cesium.Cartesian3.fromDegrees(
//         INITIAL_LOCATION.longitude,
//         INITIAL_LOCATION.latitude,
//         INITIAL_LOCATION.height
//       ),
//       orientation: {
//         heading: 0,
//         pitch: Cesium.Math.toRadians(-45),
//         roll: 0,
//       },
//     });

//     // Initialize deck.gl with GlobeView for proper globe projection
//     const deck = new Deck({
//       canvas: deckCanvasRef.current,
//       width: cesiumContainerRef.current.clientWidth,
//       height: cesiumContainerRef.current.clientHeight,
//       controller: false,
//       views: new GlobeView({ id: "globe", resolution: 10 }),
//       layers: [
//         new GeoJsonLayer({
//           id: "red-square",
//           data: GEOJSON_DATA,
//           filled: true,
//           getFillColor: [255, 0, 0, 180],
//           getLineColor: [255, 255, 255],
//           getLineWidth: 2,
//           lineWidthMinPixels: 2,
//         }),
//       ],
//     });
//     deckRef.current = deck;

//     // Sync Cesium camera to deck.gl GlobeView
//     const syncCameras = () => {
//       if (viewer.isDestroyed()) return;

//       const camera = viewer.camera;
//       const carto = camera.positionCartographic;
//       if (!carto) return;

//       const longitude = Cesium.Math.toDegrees(carto.longitude);
//       const latitude = Cesium.Math.toDegrees(carto.latitude);
//       const height = carto.height;
//       const heading = Cesium.Math.toDegrees(camera.heading);
//       const cesiumPitch = Cesium.Math.toDegrees(camera.pitch);
//       const roll = Cesium.Math.toDegrees(camera.roll);

//       // Update Cesium coordinates state
//       setCesiumCoords({
//         longitude,
//         latitude,
//         height,
//         heading,
//         pitch: cesiumPitch,
//         roll,
//       });

//       // For GlobeView, zoom is calculated based on altitude
//       const zoom = Math.log2(40075016.686 / (height * 2)) - 1;

//       // Cesium pitch: 0 = horizontal, -90 = looking down
//       // deck.gl pitch: 0 = looking down, 90 = horizontal
//       const deckPitch = 90 + cesiumPitch;
//       const bearing = heading;

//       const clampedZoom = Math.max(0, zoom);
//       const clampedPitch = Math.max(0, Math.min(89, deckPitch));

//       // Update deck.gl coordinates state
//       setDeckCoords({
//         longitude,
//         latitude,
//         zoom: clampedZoom,
//         pitch: clampedPitch,
//         bearing,
//       });

//       deck.setProps({
//         viewState: {
//           longitude,
//           latitude,
//           zoom: clampedZoom,
//           pitch: clampedPitch,
//           bearing,
//         },
//       });
//     };

//     viewer.scene.preRender.addEventListener(syncCameras);

//     // Handle resize
//     const handleResize = () => {
//       if (deck && cesiumContainerRef.current) {
//         deck.setProps({
//           width: cesiumContainerRef.current.clientWidth,
//           height: cesiumContainerRef.current.clientHeight,
//         });
//       }
//     };
//     window.addEventListener("resize", handleResize);

//     setStatus("✅ Cesium + deck.gl (GlobeView) synced. Move the camera to see coordinates update.");

//     // Cleanup
//     return () => {
//       window.removeEventListener("resize", handleResize);
//       if (!viewer.isDestroyed()) {
//         viewer.scene.preRender.removeEventListener(syncCameras);
//         viewer.destroy();
//       }
//       deck.finalize();
//     };
//   }, []);

//   const formatNumber = (num, decimals = 4) => {
//     return typeof num === "number" ? num.toFixed(decimals) : "N/A";
//   };

//   const formatHeight = (num) => {
//     if (typeof num !== "number") return "N/A";
//     if (num >= 1000) return `${(num / 1000).toFixed(2)} km`;
//     return `${num.toFixed(1)} m`;
//   };

//   return (
//     <div style={styles.container}>
//       <div ref={cesiumContainerRef} style={styles.cesiumContainer} />
//       <canvas ref={deckCanvasRef} style={styles.deckCanvas} />

//       {/* Left Panel - Deck.gl Coordinates */}
//       <div style={{ ...styles.panelBase, ...styles.leftPanel }}>
//         <div style={{ ...styles.panelTitle, ...styles.deckColor }}>
//           <span>🗺️</span>
//           <span>Deck.gl (GlobeView)</span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Longitude:</span>
//           <span style={{ ...styles.value, ...styles.deckColor }}>
//             {formatNumber(deckCoords.longitude)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Latitude:</span>
//           <span style={{ ...styles.value, ...styles.deckColor }}>
//             {formatNumber(deckCoords.latitude)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Zoom:</span>
//           <span style={{ ...styles.value, ...styles.deckColor }}>
//             {formatNumber(deckCoords.zoom, 2)}
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Pitch:</span>
//           <span style={{ ...styles.value, ...styles.deckColor }}>
//             {formatNumber(deckCoords.pitch, 1)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Bearing:</span>
//           <span style={{ ...styles.value, ...styles.deckColor }}>
//             {formatNumber(deckCoords.bearing, 1)}°
//           </span>
//         </div>
//       </div>

//       {/* Right Panel - Cesium Coordinates */}
//       <div style={{ ...styles.panelBase, ...styles.rightPanel }}>
//         <div style={{ ...styles.panelTitle, ...styles.cesiumColor }}>
//           <span>🌐</span>
//           <span>Cesium Camera</span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Longitude:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatNumber(cesiumCoords.longitude)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Latitude:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatNumber(cesiumCoords.latitude)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Height:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatHeight(cesiumCoords.height)}
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Heading:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatNumber(cesiumCoords.heading, 1)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Pitch:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatNumber(cesiumCoords.pitch, 1)}°
//           </span>
//         </div>
//         <div style={styles.row}>
//           <span style={styles.label}>Roll:</span>
//           <span style={{ ...styles.value, ...styles.cesiumColor }}>
//             {formatNumber(cesiumCoords.roll, 1)}°
//           </span>
//         </div>
//       </div>

//       {/* Status Bar */}
//       <div style={styles.status}>{status}</div>
//     </div>
//   );
// }