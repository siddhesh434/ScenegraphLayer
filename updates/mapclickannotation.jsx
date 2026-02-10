import React, { useState, useRef, useEffect } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAPTILER_KEY = "UNHj0GK3Cp5YNQK00xcf";
const MAP_STYLE = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;
const PLACEHOLDER = "data:image/jpeg;base64,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";

export default function AnnotationMap() {
  const [annotations, setAnnotations] = useState([]);
  const [pending, setPending] = useState(null);
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (pending) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  }, [pending]);

  const handleMapClick = (e) => {
    if (pending) return;
    const { lng, lat } = e.lngLat;
    setPending({ position: [lng, lat] });
    setText("");
  };

  const handleGenerate = () => {
    if (!text.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      { id: Date.now(), position: pending.position, prompt: text, image: PLACEHOLDER }
    ]);
    setPending(null);
    setText("");
  };

  const handleCancel = () => {
    setPending(null);
    setText("");
  };

  const handleDragEnd = (id, e) => {
    const { lng, lat } = e.lngLat;
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, position: [lng, lat] } : a))
    );
  };

  return (
    <Map
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: "100%", height: "100vh" }}
      mapStyle={MAP_STYLE}
      onClick={handleMapClick}
    >
      {pending && (
        <Marker longitude={pending.position[0]} latitude={pending.position[1]} anchor="bottom">
          <div
            style={{
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              width: 200,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe animation..."
              style={{ width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleCancel} style={{ flex: 1, padding: 8, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                style={{ flex: 1, padding: 8, background: "#007bff", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Generate
              </button>
            </div>
          </div>
        </Marker>
      )}

      {annotations.map((a) => (
        <Marker
          key={a.id}
          longitude={a.position[0]}
          latitude={a.position[1]}
          anchor="bottom"
          draggable={true}
          onDragEnd={(e) => handleDragEnd(a.id, e)}
        >
          <img
            src={a.image}
            alt={a.prompt}
            style={{ width: 48, cursor: "grab" }}
          />
        </Marker>
      ))}
    </Map>
  );
}