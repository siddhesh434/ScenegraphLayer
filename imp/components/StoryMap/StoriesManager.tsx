'use client';

import { useState, useCallback } from 'react';
import { Story, Slide, createStory } from './Types/types';
import Slides from './Slides/Slides';
import { Button } from '@/components/ui/button';

export default function StoriesManager() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStoryName, setNewStoryName] = useState('');
  const [newStoryDescription, setNewStoryDescription] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const activeStory = stories.find((s) => s.id === activeStoryId) || null;

  const handleCreateStory = useCallback(() => {
    if (!newStoryName.trim()) return;
    const story = createStory(newStoryName.trim(), newStoryDescription.trim());
    setStories((prev) => [...prev, story]);
    setNewStoryName('');
    setNewStoryDescription('');
    setIsCreating(false);
  }, [newStoryName, newStoryDescription]);

  const handleDeleteStory = useCallback(
    (storyId: string) => {
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      if (activeStoryId === storyId) setActiveStoryId(null);
    },
    [activeStoryId]
  );

  const handleSlidesChange = useCallback(
    (storyId: string, newSlides: Slide[]) => {
      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? { ...story, slides: newSlides, updatedAt: new Date() }
            : story
        )
      );
    },
    []
  );

  if (activeStory) {
    return (
      <div
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <Slides
          slides={activeStory.slides}
          onSlidesChange={(newSlides) =>
            handleSlidesChange(activeStory.id, newSlides)
          }
          onClose={() => setActiveStoryId(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111' }}>
          My Stories
        </h1>
        <Button onClick={() => setIsCreating(true)}>New Story</Button>
      </header>

      {isCreating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setIsCreating(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: 20,
                color: '#111',
              }}
            >
              Create New Story
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={newStoryName}
                onChange={(e) => setNewStoryName(e.target.value)}
                placeholder="Story name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Description
              </label>
              <textarea
                value={newStoryDescription}
                onChange={(e) => setNewStoryDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  minHeight: 80,
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                marginTop: 24,
              }}
            >
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateStory}
                disabled={!newStoryName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {stories.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            border: '1px dashed #d1d5db',
            borderRadius: 8,
            color: '#6b7280',
          }}
        >
          <p style={{ marginBottom: 16 }}>No stories yet</p>
          <Button onClick={() => setIsCreating(true)}>
            Create your first story
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {stories.map((story) => (
            <div
              key={story.id}
              style={{
                position: 'relative',
                background: '#fff',
                border: `1px solid ${
                  hoveredCard === story.id ? '#d1d5db' : '#e5e7eb'
                }`,
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onClick={() => setActiveStoryId(story.id)}
              onMouseEnter={() => setHoveredCard(story.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div
                style={{
                  height: 140,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                }}
              >
                {story.slides[0]?.thumbnail ? (
                  <img
                    src={story.slides[0].thumbnail}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span>{story.slides.length} slides</span>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#111',
                    marginBottom: 4,
                  }}
                >
                  {story.name}
                </h3>
                {story.description && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      marginBottom: 8,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {story.description}
                  </p>
                )}
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Updated {story.updatedAt.toLocaleDateString()}
                </span>
              </div>
              {hoveredCard === story.id && (
                <button
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 4,
                    fontSize: '1.25rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this story?'))
                      handleDeleteStory(story.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
