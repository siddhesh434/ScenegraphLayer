'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type PreviewMode = 'slideshow' | 'docked' | 'floating';
type EditorPosition = 'left' | 'right';

interface PreviewModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: PreviewMode, position: EditorPosition) => void;
}

const modes: {
  id: PreviewMode;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    id: 'slideshow',
    icon: '🎬',
    label: 'Slideshow',
    description: 'Full-screen presentation with click navigation',
  },
  {
    id: 'docked',
    icon: '📜',
    label: 'Docked',
    description: 'Scrollable content panel beside the map',
  },
  {
    id: 'floating',
    icon: '💬',
    label: 'Floating',
    description: 'Overlay cards that float above the map',
  },
];

export default function PreviewModeSelector({
  isOpen,
  onClose,
  onSelect,
}: PreviewModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PreviewMode>('slideshow');
  const [selectedPosition, setSelectedPosition] =
    useState<EditorPosition>('left');

  if (!isOpen) return null;

  const handleLaunch = () => {
    onSelect(selectedMode, selectedPosition);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: 560,
          maxWidth: '90vw',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Choose Preview Mode
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#888',
            }}
          >
            ×
          </button>
        </div>

        {/* Mode Cards */}
        <div
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {modes.map((mode) => (
            <div
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              style={{
                padding: 16,
                borderRadius: 12,
                border:
                  selectedMode === mode.id
                    ? '2px solid #007bff'
                    : '2px solid #eee',
                background: selectedMode === mode.id ? '#f0f7ff' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}
            >
              {/* Visual Preview */}
              <div
                style={{
                  width: 80,
                  height: 50,
                  borderRadius: 6,
                  background: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {mode.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {mode.label}
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {mode.description}
                </div>
              </div>

              {/* Selection indicator */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border:
                    selectedMode === mode.id
                      ? '6px solid #007bff'
                      : '2px solid #ccc',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          ))}
        </div>

        {/* Position Selector */}
        <div style={{ padding: '0 24px 24px' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 12,
              color: '#555',
            }}
          >
            Editor Position
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['left', 'right'] as EditorPosition[]).map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border:
                    selectedPosition === pos
                      ? '2px solid #007bff'
                      : '2px solid #eee',
                  background: selectedPosition === pos ? '#f0f7ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pos === 'left' ? '⬅️' : '➡️'}</span>
                <span style={{ textTransform: 'capitalize' }}>{pos}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleLaunch}>Launch Preview</Button>
        </div>
      </div>
    </div>
  );
}
