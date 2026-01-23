'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Block } from '@blocknote/core';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd';
import DeckMap, { DeckMapRef } from './DeckMap/DeckMap';
import Editor from './Editor/Editor';
import CustomDragPreview from './CustomDragPreview/CustomDragPreview';
import SlideshowModal from './PreviewModal/SlideshowModal';
import DockedModal from './PreviewModal/DockedModal';
import FloatingModal from './PreviewModal/FloatingModal';
import {
  ViewState,
  Slide,
  DEFAULT_VIEW_STATE,
  createSlide,
} from '../Types/types';
import { Button } from '@/components/ui/button';
import LoadingSlide from './LoadingSlide/LoadingSlide';
import PreviewModeSelector from './PreviewModeSelector/PreviewModeSelector';

const SLIDE_BAR_HEIGHT = 120;
const THUMBNAIL_HEIGHT = SLIDE_BAR_HEIGHT - 24;
const THUMBNAIL_WIDTH = THUMBNAIL_HEIGHT * (20 / 9);

type PreviewMode = 'slideshow' | 'docked' | 'floating';

// ============ PROPS INTERFACE ============
interface SlidesProps {
  slides: Slide[];
  onSlidesChange: (slides: Slide[]) => void;
  onClose: () => void;
}

export default function Slides({
  slides,
  onSlidesChange,
  onClose,
}: SlidesProps) {
  // Local UI state (not persisted to parent)
  const [currentKey, setCurrentKey] = useState(slides[0]?.key || '');
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    key: string;
  } | null>(null);
  const [liveViewState, setLiveViewState] =
    useState<ViewState>(DEFAULT_VIEW_STATE);
  const [selected, setSelected] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('slideshow');
  const [editorWidth, setEditorWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [previewEditorPosition, setPreviewEditorPosition] = useState<
    'left' | 'right'
  >('left');
  const [showModeSelector, setShowModeSelector] = useState(false);

  const mapRef = useRef<DeckMapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============ REF TO ALWAYS HAVE LATEST SLIDES ============
  // This fixes stale closure issues in async callbacks (like setTimeout)
  const slidesRef = useRef(slides);

  // Keep slidesRef updated whenever slides changes
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const activeSlide = slides.find((s) => s.key === currentKey);

  // ============ HELPER: Update a single slide's thumbnail ============
  const updateThumbnail = useCallback(
    (key: string, thumbnail: string) => {
      // Use slidesRef to get the LATEST slides, not stale closure value
      const currentSlides = slidesRef.current;
      const newSlides = currentSlides.map((s) =>
        s.key === key ? { ...s, thumbnail } : s
      );
      onSlidesChange(newSlides);
    },
    [onSlidesChange]
  );

  // ============ EFFECTS ============

  // Keep currentKey in sync if slides change externally
  useEffect(() => {
    if (slides.length > 0 && !slides.find((s) => s.key === currentKey)) {
      setCurrentKey(slides[0].key);
    }
  }, [slides, currentKey]);

  // Resizer logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.min(80, Math.max(20, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Capture initial thumbnail for slides that don't have one
  useEffect(() => {
    const captureInitialThumbnail = async () => {
      // Wait for map to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Use slidesRef to get latest slides after the timeout
      const currentSlides = slidesRef.current;

      if (mapRef.current && currentSlides[0] && !currentSlides[0].thumbnail) {
        const screenshot = await mapRef.current.captureScreenshot();
        if (screenshot) {
          updateThumbnail(currentSlides[0].key, screenshot);
        }
      }
    };

    captureInitialThumbnail();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag position tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) setDragPosition({ x: e.clientX, y: e.clientY });
    };
    if (isDragging) window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // ============ EVENT HANDLERS ============

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const toggleSelect = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) =>
        prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
      );
    } else {
      setSelected([key]);
    }
  };

  const onDragStart = (start: DragStart) => {
    const draggedKey = slides[start.source.index].key;
    if (!selected.includes(draggedKey)) setSelected([draggedKey]);
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    setDragPosition(null);
    if (!result.destination) return;

    const { source, destination } = result;
    const draggedKey = slides[source.index].key;
    const toMove = selected.includes(draggedKey) ? selected : [draggedKey];
    const remaining = slides.filter((s) => !toMove.includes(s.key));
    const ordered = toMove
      .map((key) => slides.find((s) => s.key === key)!)
      .sort((a, b) => slides.indexOf(a) - slides.indexOf(b));
    remaining.splice(destination.index, 0, ...ordered);

    onSlidesChange(remaining);
  };

  // ============ SLIDE OPERATIONS (notify parent) ============

  const updateBlocks = useCallback(
    (key: string, blocks: Block[]) => {
      const currentSlides = slidesRef.current;
      const newSlides = currentSlides.map((s) =>
        s.key === key ? { ...s, blocks } : s
      );
      onSlidesChange(newSlides);
    },
    [onSlidesChange]
  );

  const captureViewState = useCallback(async () => {
    if (!activeSlide || !mapRef.current) return;

    const screenshot = await mapRef.current.captureScreenshot();

    // Use slidesRef to get latest slides
    const currentSlides = slidesRef.current;
    const newSlides = currentSlides.map((s) =>
      s.key === activeSlide.key
        ? {
            ...s,
            viewState: { ...liveViewState },
            thumbnail: screenshot || s.thumbnail,
          }
        : s
    );
    onSlidesChange(newSlides);
  }, [activeSlide, liveViewState, onSlidesChange]);

  const addSlide = useCallback(async () => {
    const newSlide = createSlide();

    // Use slidesRef to get latest slides
    const currentSlides = slidesRef.current;
    onSlidesChange([...currentSlides, newSlide]);
    setCurrentKey(newSlide.key);

    // Capture thumbnail for the new slide after map renders
    setTimeout(async () => {
      if (mapRef.current) {
        const screenshot = await mapRef.current.captureScreenshot();
        if (screenshot) {
          // Use slidesRef again to get the LATEST slides at execution time
          const latestSlides = slidesRef.current;
          const updatedSlides = latestSlides.map((s) =>
            s.key === newSlide.key ? { ...s, thumbnail: screenshot } : s
          );
          onSlidesChange(updatedSlides);
        }
      }
    }, 500);
  }, [onSlidesChange]);

  const deleteSlide = useCallback(
    (key: string) => {
      const currentSlides = slidesRef.current;
      const index = currentSlides.findIndex((s) => s.key === key);
      if (index === -1) return;

      if (currentSlides.length === 1) {
        const newSlide = createSlide();
        onSlidesChange([newSlide]);
        setCurrentKey(newSlide.key);
      } else {
        const newSlides = currentSlides.filter((s) => s.key !== key);
        if (key === currentKey) {
          setCurrentKey(newSlides[index === 0 ? 0 : index - 1].key);
        }
        onSlidesChange(newSlides);
      }

      setMenu(null);
      setSelected((prev) => prev.filter((s) => s !== key));
    },
    [currentKey, onSlidesChange]
  );

  const handleMapChange = (vs: ViewState) => {
    setLiveViewState(vs);
  };

  // ============ HELPER: Build thumbnails object for CustomDragPreview ============
  const thumbnailsMap = slides.reduce((acc, slide) => {
    if (slide.thumbnail) {
      acc[slide.key] = slide.thumbnail;
    }
    return acc;
  }, {} as Record<string, string>);

  // ============ RENDER ============

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 16px',
          gap: 8,
        }}
      >
        <Button variant="outline" size="sm" onClick={captureViewState}>
          📍 Capture Current
        </Button>
        <Button variant="outline" onClick={() => setShowModeSelector(true)}>
          Preview
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      {/* Main content */}
      {activeSlide && (
        <div
          ref={containerRef}
          style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
        >
          {/* Editor Panel */}
          <div
            style={{
              width: `${editorWidth}%`,
              borderRight: '1px solid #ddd',
              overflow: 'auto',
              padding: 16,
            }}
          >
            <Editor
              key={activeSlide.key}
              initialContent={activeSlide.blocks}
              onChange={(blocks) => updateBlocks(activeSlide.key, blocks)}
            />
          </div>

          {/* Resizer */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: 6,
              cursor: 'col-resize',
              background: isResizing ? '#007bff' : 'transparent',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.currentTarget.style.background = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.currentTarget.style.background = 'transparent';
            }}
          />

          {/* Map Panel */}
          <div style={{ width: `${100 - editorWidth}%`, position: 'relative' }}>
            <DeckMap
              ref={mapRef}
              initialViewState={activeSlide?.viewState || DEFAULT_VIEW_STATE}
              capturedViewState={activeSlide?.viewState || null}
              onChange={handleMapChange}
            />
          </div>
        </div>
      )}

      {/* Slide bar */}
      <div
        style={{
          height: SLIDE_BAR_HEIGHT,
          borderTop: '1px solid #ddd',
          display: 'flex',
          overflowX: 'auto',
          padding: 12,
          gap: 12,
        }}
      >
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Droppable droppableId="slides" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'flex', gap: 12 }}
              >
                {slides.map((slide, index) => (
                  <Draggable
                    key={slide.key}
                    draggableId={slide.key}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={(e) => {
                          toggleSelect(slide.key, e);
                          setCurrentKey(slide.key);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setMenu({
                            x: e.clientX,
                            y: e.clientY,
                            key: slide.key,
                          });
                        }}
                        style={{
                          width: THUMBNAIL_WIDTH,
                          height: THUMBNAIL_HEIGHT,
                          border: selected.includes(slide.key)
                            ? '2px solid green'
                            : slide.key === currentKey
                            ? '2px solid blue'
                            : '1px solid #ddd',
                          opacity:
                            isDragging && selected.includes(slide.key)
                              ? 0.3
                              : 1,
                          ...(snapshot.isDragging && selected.length > 1
                            ? {
                                visibility: 'hidden' as const,
                                height: 0,
                                width: 0,
                              }
                            : {}),
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#f5f5f5',
                          ...provided.draggableProps.style,
                        }}
                      >
                        {slide.thumbnail ? (
                          <img
                            src={slide.thumbnail}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <LoadingSlide />
                        )}
                        {slide.viewState && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              fontSize: 10,
                            }}
                          >
                            📍
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {menu && (
          <div
            style={{
              position: 'fixed',
              cursor: 'pointer',
              top: menu.y,
              left: menu.x,
              background: '#fff',
              border: '1px solid #ddd',
              padding: 8,
              zIndex: 10000,
            }}
            onClick={() => deleteSlide(menu.key)}
          >
            Delete
          </div>
        )}

        <Button
          variant="outline"
          onClick={addSlide}
          style={{
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            border: '2px dashed #ccc',
            flexShrink: 0,
          }}
        >
          + Add
        </Button>
      </div>

      {/* Modals */}
      <SlideshowModal
        isOpen={isPreviewOpen && previewMode === 'slideshow'}
        onClose={() => setIsPreviewOpen(false)}
        slides={slides}
        editorWidth={editorWidth}
        editorPosition={previewEditorPosition}
      />

      <DockedModal
        isOpen={isPreviewOpen && previewMode === 'docked'}
        onClose={() => setIsPreviewOpen(false)}
        slides={slides}
        editorWidth={editorWidth}
        editorPosition={previewEditorPosition}
      />

      <FloatingModal
        isOpen={isPreviewOpen && previewMode === 'floating'}
        onClose={() => setIsPreviewOpen(false)}
        slides={slides}
        editorWidth={editorWidth}
        editorPosition={previewEditorPosition}
      />

      {isDragging && selected.length > 1 && dragPosition && (
        <CustomDragPreview
          position={dragPosition}
          selectedSlides={selected}
          slides={slides}
          thumbnails={thumbnailsMap}
        />
      )}

      <PreviewModeSelector
        isOpen={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onSelect={(mode, position) => {
          setPreviewMode(mode);
          setPreviewEditorPosition(position);
          setIsPreviewOpen(true);
        }}
      />
    </div>
  );
}
