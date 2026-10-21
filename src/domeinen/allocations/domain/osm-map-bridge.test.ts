import { describe, expect, it } from 'vitest';
import { OSM_MAP_INBOUND, parseOsmMapInboundMessage } from './osm-map-bridge';

describe('parseOsmMapInboundMessage', () => {
  it('parses a ready signal', () => {
    expect(parseOsmMapInboundMessage(JSON.stringify({ type: 'ready' }))).toEqual({
      type: OSM_MAP_INBOUND.READY,
    });
  });

  it('parses a marker press with allocation id', () => {
    expect(
      parseOsmMapInboundMessage(JSON.stringify({ type: 'markerPress', allocationId: 'alloc-1' })),
    ).toEqual({
      type: OSM_MAP_INBOUND.MARKER_PRESS,
      allocationId: 'alloc-1',
    });
  });

  it('parses a map press into a coordinate', () => {
    expect(
      parseOsmMapInboundMessage(
        JSON.stringify({ type: 'mapPress', latitude: 52.1, longitude: 5.2 }),
      ),
    ).toEqual({
      type: OSM_MAP_INBOUND.MAP_PRESS,
      coordinate: { latitude: 52.1, longitude: 5.2 },
    });
  });

  it('parses a camera move with latitude delta', () => {
    expect(
      parseOsmMapInboundMessage(JSON.stringify({ type: 'cameraMove', latitudeDelta: 0.08 })),
    ).toEqual({
      type: OSM_MAP_INBOUND.CAMERA_MOVE,
      latitudeDelta: 0.08,
    });
  });

  it('rejects invalid JSON and unknown or incomplete payloads', () => {
    expect(parseOsmMapInboundMessage('not-json')).toBeNull();
    expect(parseOsmMapInboundMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
    expect(parseOsmMapInboundMessage(JSON.stringify({ type: 'markerPress' }))).toBeNull();
    expect(
      parseOsmMapInboundMessage(JSON.stringify({ type: 'markerPress', allocationId: '' })),
    ).toBeNull();
    expect(
      parseOsmMapInboundMessage(JSON.stringify({ type: 'mapPress', latitude: 'x', longitude: 1 })),
    ).toBeNull();
    expect(
      parseOsmMapInboundMessage(JSON.stringify({ type: 'cameraMove', latitudeDelta: NaN })),
    ).toBeNull();
  });
});
