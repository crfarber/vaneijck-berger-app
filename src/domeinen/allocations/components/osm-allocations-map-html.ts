/**
 * Leaflet + OpenStreetMap HTML shell for the Android allocations map WebView.
 * Colours are injected from the app theme; tiles require network (OSM fair use).
 */
export function buildOsmAllocationsMapHtml(options: {
  readonly standardFill: string;
  readonly pltrFill: string;
  readonly labelColor: string;
}): string {
  const { standardFill, pltrFill, labelColor } = options;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e8e8e8; }
    .ve-pin {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid ${labelColor};
      display: flex; align-items: center; justify-content: center;
      font: 700 12px Helvetica, Arial, sans-serif;
      color: ${labelColor};
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    .ve-pin-standard { background: ${standardFill}; }
    .ve-pin-pltr { background: ${pltrFill}; }
    .leaflet-container { font: 12px Helvetica, Arial, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      var markerLayer = L.layerGroup().addTo(map);
      var userMarker = null;
      var readySent = false;

      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function emitCamera() {
        var bounds = map.getBounds();
        post({
          type: 'cameraMove',
          latitudeDelta: bounds.getNorth() - bounds.getSouth()
        });
      }

      function pinIcon(sequence, kind) {
        var cls = kind === 'pltr' ? 've-pin-pltr' : 've-pin-standard';
        var label = String(sequence);
        if (sequence < 1) label = '1';
        if (sequence > 99) label = '99';
        return L.divIcon({
          className: '',
          html: '<div class="ve-pin ' + cls + '">' + label + '</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      }

      window.__veReceive = function (cmd) {
        if (!cmd || typeof cmd !== 'object') return;
        if (cmd.type === 'setCamera' && cmd.coordinates) {
          map.setView(
            [cmd.coordinates.latitude, cmd.coordinates.longitude],
            typeof cmd.zoom === 'number' ? cmd.zoom : map.getZoom(),
            { animate: true }
          );
          emitCamera();
          return;
        }
        if (cmd.type === 'setMarkers' && Array.isArray(cmd.markers)) {
          markerLayer.clearLayers();
          cmd.markers.forEach(function (m) {
            var marker = L.marker([m.latitude, m.longitude], {
              icon: pinIcon(m.sequence, m.kind),
              title: m.title || ''
            });
            marker.on('click', function () {
              post({ type: 'markerPress', allocationId: m.id });
            });
            markerLayer.addLayer(marker);
          });
          return;
        }
        if (cmd.type === 'setUserLocation') {
          if (cmd.coordinate == null) {
            if (userMarker) {
              map.removeLayer(userMarker);
              userMarker = null;
            }
            return;
          }
          var latlng = [cmd.coordinate.latitude, cmd.coordinate.longitude];
          if (userMarker) {
            userMarker.setLatLng(latlng);
          } else {
            userMarker = L.circleMarker(latlng, {
              radius: 8,
              color: '#ffffff',
              weight: 2,
              fillColor: '#1A76FF',
              fillOpacity: 1
            }).addTo(map);
            userMarker.on('click', function () {
              var pos = userMarker.getLatLng();
              post({
                type: 'mapPress',
                latitude: pos.lat,
                longitude: pos.lng
              });
            });
          }
        }
      };

      map.on('click', function (e) {
        post({ type: 'mapPress', latitude: e.latlng.lat, longitude: e.latlng.lng });
      });
      map.on('moveend', emitCamera);
      map.on('zoomend', emitCamera);

      map.setView([52.1326, 5.2913], 7);
      if (!readySent) {
        readySent = true;
        post({ type: 'ready' });
        emitCamera();
      }
    })();
  </script>
</body>
</html>`;
}
