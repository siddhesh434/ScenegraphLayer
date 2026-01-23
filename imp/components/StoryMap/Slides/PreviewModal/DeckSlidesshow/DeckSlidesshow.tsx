'use client';

import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { IconLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ViewState } from '../../../Types/types';
import { RoutePoint } from '../../transitionUtils';
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

interface DeckSlideshowProps {
  viewState: ViewState;
  isAnimating: boolean;
  capturedViews: { index: number; viewState: ViewState }[];
  activeIndex: number;
  routeData: RoutePoint[] | null;
  showRoute: boolean;
  characterState?: CharacterState | null;
}

interface MarkerData {
  position: [number, number];
  index: number;
  isActive: boolean;
}

interface PathData {
  path: [number, number][];
}

interface CarData {
  position: [number, number];
  bearing: number;
}

export default function DeckSlideshow({
  viewState,
  isAnimating,
  capturedViews,
  activeIndex,
  routeData,
  showRoute,
  characterState,
}: DeckSlideshowProps) {
  const markerData: MarkerData[] = capturedViews.map((view, index) => ({
    position: [view.viewState.longitude, view.viewState.latitude],
    index: index + 1,
    isActive: index === activeIndex,
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

    new IconLayer<MarkerData>({
      id: 'markers',
      data: markerData,
      getPosition: (d) => d.position,
      getIcon: (d) => ({
        url:
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(
            `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="${d.isActive ? 14 : 11}" fill="${
              d.isActive ? '#8b5a2b' : '#666'
            }" stroke="#fff" stroke-width="2"/>
          </svg>`
          ),
        width: 32,
        height: 32,
        anchorY: 16,
      }),
      getSize: 32,
      billboard: true,
      updateTriggers: { getIcon: [activeIndex] },
    }),

    new TextLayer<MarkerData>({
      id: 'labels',
      data: markerData,
      getPosition: (d) => d.position,
      getText: (d) => String(d.index),
      getSize: 12,
      getColor: [255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      billboard: true,
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
    <DeckGL viewState={viewState} controller={false} layers={layers}>
      <Map mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
