import { Block } from '@blocknote/core';

// View state for the map
export interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export const DEFAULT_VIEW_STATE: ViewState = {
  latitude: 1.2834, // Marina Bay / CBD
  longitude: 103.8607,
  zoom: 15.5, // dense high-rise area
  pitch: 50, // strong 3D effect
  bearing: -20, // slight angle looks better
};

// Individual slide within a story
export interface Slide {
  key: string;
  blocks: Block[];
  viewState: ViewState | null;
  thumbnail: string | null; // Base64 screenshot of the map
}

// Story containing multiple slides
export interface Story {
  id: string;
  name: string;
  description: string;
  slides: Slide[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper to create a new slide
export const createSlide = (): Slide => ({
  key: crypto.randomUUID(),
  blocks: [],
  viewState: { ...DEFAULT_VIEW_STATE },
  thumbnail: null,
});

// Helper to create a new story
export const createStory = (name: string, description: string = ''): Story => ({
  id: crypto.randomUUID(),
  name,
  description,
  slides: [createSlide()], // Start with one empty slide
  createdAt: new Date(),
  updatedAt: new Date(),
});
