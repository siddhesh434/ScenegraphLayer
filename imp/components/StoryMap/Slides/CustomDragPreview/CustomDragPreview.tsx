'use client';

import { Slide } from '../../Types/types';

interface CustomDragPreviewProps {
  position: { x: number; y: number };
  selectedSlides: string[];
  slides: Slide[];
  thumbnails: Record<string, string>;
}

export default function CustomDragPreview({
  position,
  selectedSlides,
  slides,
  thumbnails,
}: CustomDragPreviewProps) {
  // Get the selected slides in order
  const selectedInOrder = slides.filter((s) => selectedSlides.includes(s.key));

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y + 10,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      {selectedInOrder.slice(0, 3).map((slide, index) => (
        <div
          key={slide.key}
          style={{
            position: 'absolute',
            left: index * 8,
            top: index * 8,
            width: 120, // Thumbnail width
            height: 54, // Thumbnail height (maintains 20:9 ratio)
            border: '2px solid #007bff',
            borderRadius: 4,
            overflow: 'hidden',
            background: '#f5f5f5',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {thumbnails[slide.key] ? (
            <img
              src={thumbnails[slide.key]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#999',
              }}
            >
              No preview
            </div>
          )}
        </div>
      ))}
      {selectedSlides.length > 3 && (
        <div
          style={{
            position: 'absolute',
            left: 3 * 8 + 60,
            top: 3 * 8 + 20,
            background: '#007bff',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          +{selectedSlides.length - 3}
        </div>
      )}
    </div>
  );
}
