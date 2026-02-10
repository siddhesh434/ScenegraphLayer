/* ═══════════════════════════════════════════════════
   geoHelpers.js — Geometry generation for drawings
   ═══════════════════════════════════════════════════
   All functions return GeoJSON-compatible coordinate arrays.
   Coordinates are [longitude, latitude].
*/

/**
 * Create rectangle polygon coords from two corner points.
 * @param {[number,number]} p1 - [lng, lat] of first corner
 * @param {[number,number]} p2 - [lng, lat] of opposite corner
 * @returns {Array} GeoJSON Polygon coordinate ring
 */
export function rectangleCoords(p1, p2) {
    return [[
        [p1[0], p1[1]],
        [p2[0], p1[1]],
        [p2[0], p2[1]],
        [p1[0], p2[1]],
        [p1[0], p1[1]], // close ring
    ]];
}

/**
 * Create circle polygon coords (64-vertex approximation).
 * @param {[number,number]} center - [lng, lat]
 * @param {[number,number]} edgePoint - [lng, lat] on the circle edge
 * @returns {Array} GeoJSON Polygon coordinate ring
 */
export function circleCoords(center, edgePoint) {
    const SEGMENTS = 64;
    const dLng = edgePoint[0] - center[0];
    const dLat = edgePoint[1] - center[1];
    const radius = Math.sqrt(dLng * dLng + dLat * dLat);

    const ring = [];
    for (let i = 0; i <= SEGMENTS; i++) {
        const angle = (i / SEGMENTS) * 2 * Math.PI;
        ring.push([
            center[0] + radius * Math.cos(angle),
            center[1] + radius * Math.sin(angle),
        ]);
    }
    return [ring];
}

/**
 * Create arrowhead polygon coords at the end of a line.
 * @param {[number,number]} from - second-to-last point [lng, lat]
 * @param {[number,number]} to   - last point (tip) [lng, lat]
 * @param {number} size - arrowhead size relative to the line
 * @returns {Array} GeoJSON Polygon coordinate ring
 */
export function arrowheadCoords(from, to, size = 0.0008) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len; // unit direction
    const uy = dy / len;

    // Scale arrowhead: at least `size`, but proportional for longer lines
    const s = Math.max(size, len * 0.15);

    // Two points forming the arrowhead wings
    const wing1 = [to[0] - s * ux + s * 0.4 * uy, to[1] - s * uy - s * 0.4 * ux];
    const wing2 = [to[0] - s * ux - s * 0.4 * uy, to[1] - s * uy + s * 0.4 * ux];

    return [[to, wing1, wing2, to]]; // closed ring
}

/**
 * Build a complete GeoJSON Feature from drawing data.
 * @param {string} drawType - one of: freehand, line, rectangle, circle, polygon, arrow
 * @param {Array} points - array of [lng, lat] points
 * @param {Object} style - { strokeColor, strokeWidth, fillColor, fillOpacity, opacity }
 * @param {string} id - unique feature id
 * @returns {Object} GeoJSON Feature
 */
export function buildFeature(drawType, points, style, id) {
    let geometry;

    switch (drawType) {
        case 'freehand':
            geometry = { type: 'LineString', coordinates: points };
            break;

        case 'line':
            geometry = { type: 'LineString', coordinates: [points[0], points[points.length - 1]] };
            break;

        case 'arrow':
            geometry = { type: 'LineString', coordinates: [points[0], points[points.length - 1]] };
            break;

        case 'rectangle':
            geometry = { type: 'Polygon', coordinates: rectangleCoords(points[0], points[points.length - 1]) };
            break;

        case 'circle':
            geometry = { type: 'Polygon', coordinates: circleCoords(points[0], points[points.length - 1]) };
            break;

        case 'polygon':
            // Close the ring
            geometry = {
                type: 'Polygon',
                coordinates: [[...points, points[0]]],
            };
            break;

        default:
            geometry = { type: 'LineString', coordinates: points };
    }

    return {
        type: 'Feature',
        geometry,
        properties: { id, drawType, ...style },
    };
}

/**
 * Build arrowhead Feature companion for an arrow drawing.
 * @param {Object} arrowFeature - the arrow LineString feature
 * @returns {Object|null} GeoJSON Feature for the arrowhead polygon, or null
 */
export function buildArrowhead(arrowFeature) {
    const coords = arrowFeature.geometry.coordinates;
    if (coords.length < 2) return null;

    const from = coords[coords.length - 2];
    const to = coords[coords.length - 1];

    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: arrowheadCoords(from, to) },
        properties: {
            id: arrowFeature.properties.id + '_head',
            drawType: 'arrowhead',
            fillColor: arrowFeature.properties.strokeColor,
            fillOpacity: 1,
            strokeColor: arrowFeature.properties.strokeColor,
            strokeWidth: 1,
            opacity: arrowFeature.properties.opacity,
        },
    };
}

/**
 * Build preview GeoJSON for the current drawing-in-progress.
 * @param {string} mode - current drawing mode
 * @param {Array} points - collected points so far
 * @param {[number,number]} cursor - current cursor position [lng, lat]
 * @param {Object} style - drawing style
 * @returns {Object|null} GeoJSON FeatureCollection for preview, or null
 */
export function buildPreview(mode, points, cursor, style) {
    if (!points.length || !cursor) return null;

    const allPoints = [...points, cursor];
    const features = [];

    switch (mode) {
        case 'freehand':
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: allPoints },
                properties: { ...style, drawType: 'freehand' },
            });
            break;

        case 'line':
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [points[0], cursor] },
                properties: { ...style, drawType: 'line' },
            });
            break;

        case 'arrow': {
            const lineFeature = {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [points[0], cursor] },
                properties: { ...style, drawType: 'arrow' },
            };
            features.push(lineFeature);
            const head = buildArrowhead(lineFeature);
            if (head) features.push(head);
            break;
        }

        case 'rectangle':
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: rectangleCoords(points[0], cursor) },
                properties: { ...style, drawType: 'rectangle' },
            });
            break;

        case 'circle':
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: circleCoords(points[0], cursor) },
                properties: { ...style, drawType: 'circle' },
            });
            break;

        case 'polygon':
            if (allPoints.length >= 3) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [[...allPoints, allPoints[0]]] },
                    properties: { ...style, drawType: 'polygon' },
                });
            } else {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: allPoints },
                    properties: { ...style, drawType: 'polygon' },
                });
            }
            break;

        default:
            return null;
    }

    return { type: 'FeatureCollection', features };
}
