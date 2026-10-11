export interface TiledObjectGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  gid?: number;
}

// Tiled rotates rectangles around their origin; tile objects use a bottom-left origin.
export function tiledObjectBounds(object: TiledObjectGeometry, defaultSize = 32) {
  const width = object.width || defaultSize;
  const height = object.height || defaultSize;
  const angle = (object.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const top = object.gid === undefined ? 0 : -height;
  const corners = [[0, top], [width, top], [0, top + height], [width, top + height]]
    .map(([x, y]) => ({ x: (object.x ?? 0) + x * cos - y * sin, y: (object.y ?? 0) + x * sin + y * cos }));
  const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
  return { x, y, width: Math.max(...corners.map(p => p.x)) - x, height: Math.max(...corners.map(p => p.y)) - y };
}
