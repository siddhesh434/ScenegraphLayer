'use client';

import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { IconLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ViewState } from '../StoryMap/Types/types';
import { RoutePoint } from '../StoryMap/Slides/transitionUtils';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { Layer } from '@deck.gl/core';

const MAPTILER_KEY = 'UNHj0GK3Cp5YNQK00xcf';
const MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;
const CAR_MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb';

interface CharacterState {
  position: { lat: number; lng: number };
  bearing: number;
}

interface DeckModalProps {
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  isAnimating: boolean;
  capturedViews: { index: number; viewState: ViewState }[];
  routeData: RoutePoint[] | null;
  showRoute: boolean;
  characterState?: CharacterState | null;
}

interface PinData {
  position: [number, number];
  label: string;
}

interface PathData {
  path: [number, number][];
}

interface CarData {
  position: [number, number];
  bearing: number;
}

export default function DeckModal({
  viewState,
  onViewStateChange,
  isAnimating,
  capturedViews,
  routeData,
  showRoute,
  characterState,
}: DeckModalProps) {
  const pinData: PinData[] = capturedViews.map((v, i) => ({
    position: [v.viewState.longitude, v.viewState.latitude],
    label:
      i === 0
        ? 'Start'
        : i === capturedViews.length - 1
        ? 'End'
        : String(i + 1),
  }));

  const pathData: PathData[] =
    showRoute && routeData
      ? [{ path: routeData.map((p) => [p.lng, p.lat] as [number, number]) }]
      : [];

  const carData: CarData[] = characterState
    ? [
        {
          position: [characterState.position.lng, characterState.position.lat],
          bearing: characterState.bearing,
        },
      ]
    : [];

  const layers: Layer[] = [
    // Route path
    new PathLayer<PathData>({
      id: 'route-layer',
      data: pathData,
      getPath: (d) => d.path,
      getColor: [66, 133, 244],
      getWidth: 6,
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
    }),

    // Pins
    new IconLayer<PinData>({
      id: 'pin-layer',
      data: pinData,
      getPosition: (d) => d.position,
      getIcon: () => 'marker',
      iconAtlas:
        'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
      iconMapping: {
        marker: {
          x: 0,
          y: 0,
          width: 128,
          height: 128,
          anchorY: 128,
          mask: true,
        },
      },
      getSize: 40,
      getColor: [220, 50, 50],
      pickable: true,
    }),

    // Labels
    new TextLayer<PinData>({
      id: 'text-layer',
      data: pinData,
      getPosition: (d) => d.position,
      getText: (d) => d.label,
      getSize: 14,
      getColor: [255, 255, 255],
      getPixelOffset: [0, -25],
      background: true,
      getBackgroundColor: [220, 50, 50],
      backgroundPadding: [4, 2],
    }),
  ];

  if (showRoute && characterState) {
    layers.push(
      new ScenegraphLayer<CarData>({
        id: 'car-layer-3d',
        data: carData,
        scenegraph: CAR_MODEL_URL,
        getPosition: (d) => [d.position[0], d.position[1], 0],
        getOrientation: (d) => [0, 180 - d.bearing, 90],
        sizeScale: 3,
        _lighting: 'pbr',
      })
    );
  }

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => {
        if (!isAnimating) {
          onViewStateChange(vs as ViewState);
        }
      }}
      controller={!isAnimating}
      layers={layers}
    >
      <Map mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
