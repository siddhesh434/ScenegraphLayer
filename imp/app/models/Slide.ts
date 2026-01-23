export class Slide {
  lat: number;
  lon: number;
  zoom: number;
  pitch: number;
  bearing: number;
  text: string;

  constructor({
    lat = 0,
    lon = 0,
    zoom = 0,
    pitch = 0,
    bearing = 0,
    text = 'Mumbai',
  }: Partial<Slide> = {}) {
    this.lat = lat;
    this.lon = lon;
    this.zoom = zoom;
    this.pitch = pitch;
    this.bearing = bearing;
    this.text = text;
  }
}
