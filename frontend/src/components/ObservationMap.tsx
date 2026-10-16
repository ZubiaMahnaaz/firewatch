import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Observation } from '../types';

interface ObservationMapProps {
  observations: Observation[];
  selectedObservation: Observation | null;
  onSelectObservation: (obs: Observation) => void;
  onOpenDetailModal?: (obs: Observation) => void;
  heightClass?: string;
}

type BasemapType = 'osm-dark' | 'osm-standard' | 'satellite';

interface BasemapConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  className?: string;
}

const BASEMAP_CONFIGS: Record<BasemapType, BasemapConfig> = {
  'osm-dark': {
    name: 'Dark OSM',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: 'dark-osm-tiles',
  },
  'osm-standard': {
    name: 'OSM Daylight',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  'satellite': {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; USGS, USDA, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    maxZoom: 18,
  },
};


export const ObservationMap: React.FC<ObservationMapProps> = ({
  observations,
  selectedObservation,
  onSelectObservation,
  onOpenDetailModal,
  heightClass = 'h-80 sm:h-96'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);

  // Keep latest callbacks/data in refs to avoid recreating the map
  const observationsRef = useRef<Observation[]>(observations);
  observationsRef.current = observations;
  const onOpenDetailModalRef = useRef(onOpenDetailModal);
  onOpenDetailModalRef.current = onOpenDetailModal;

  const [basemapType, setBasemapType] = useState<BasemapType>('osm-dark');
  const [mapFilter, setMapFilter] = useState<'all' | 'critical' | 'repeats'>('all');
  const [tileError, setTileError] = useState(false);
  const [tilesLoadedCount, setTilesLoadedCount] = useState(0);

  // Helper to attach a tile layer to the map
  const applyTileLayer = (map: L.Map, type: BasemapType) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const config = BASEMAP_CONFIGS[type];
    let failedCount = 0;

    const layer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc',
      attribution: config.attribution,
      className: config.className || '',
    });

    layer.on('tileerror', (e) => {
      console.warn('Map tile failed to load:', e);
      failedCount += 1;
      if (failedCount >= 3) {
        setTileError(true);
      }
    });

    layer.on('tileload', () => {
      setTilesLoadedCount(c => c + 1);
      setTileError(false);
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  };

  // 1. Initialize Leaflet Map Instance ONCE on component mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default regional focus: California / Sierra Nevada
    const initialCenter: [number, number] = [39.8241, -121.4429];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 6,
      zoomControl: false,
      attributionControl: true
    });

    if (map.attributionControl) {
      map.attributionControl.setPrefix(
        '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>'
      );
    }

    // Immediately attach the default OpenStreetMap tile layer
    applyTileLayer(map, 'osm-dark');

    // Create markers layer group
    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    // Handle popup inspect button clicks
    map.on('popupopen', (e) => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;
      const btn = popupNode.querySelector('.map-inspect-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const obsId = btn.getAttribute('data-obs-id');
          const target = observationsRef.current.find(o => o.obs_id === obsId);
          if (target && onOpenDetailModalRef.current) {
            onOpenDetailModalRef.current(target);
          }
        });
      }
    });

    // Invalidate map size after initial render and when container resizes
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // 2. Handle Basemap Switcher changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    applyTileLayer(map, basemapType);
  }, [basemapType]);

  // 3. Monitor Online/Offline state
  useEffect(() => {
    const handleOffline = () => setTileError(true);
    const handleOnline = () => {
      setTileError(false);
      if (tileLayerRef.current) {
        tileLayerRef.current.redraw();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetryTiles = () => {
    setTileError(false);
    if (tileLayerRef.current) {
      tileLayerRef.current.redraw();
    }
    mapInstanceRef.current?.invalidateSize();
  };

  // 4. Update Hotspot Markers and Fit Bounds when observations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // Filter observations
    let filtered = observations;
    if (mapFilter === 'critical') {
      filtered = observations.filter(o => o.priority_score >= 80);
    } else if (mapFilter === 'repeats') {
      filtered = observations.filter(o => o.is_repeat === 1);
    }

    // Auto-fit bounds on first non-empty observations arrival
    if (filtered.length > 0 && !hasInitialFitRef.current) {
      const validCoords = filtered
        .filter(o => typeof o.latitude === 'number' && typeof o.longitude === 'number' && !isNaN(o.latitude) && !isNaN(o.longitude))
        .map(o => [o.latitude, o.longitude] as [number, number]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 8 });
        hasInitialFitRef.current = true;
      }
    }

    // Render up to 300 observation markers for smooth rendering
    const renderSubset = filtered.slice(0, 300);

    renderSubset.forEach((obs) => {
      const isSelected = selectedObservation?.obs_id === obs.obs_id;
      const isCrit = obs.priority_score >= 80;
      const isMod = obs.priority_score >= 50 && obs.priority_score < 80;

      let colorClass = 'bg-[#6C7684]';
      if (isCrit) colorClass = 'bg-[#F04438]';
      else if (isMod) colorClass = 'bg-[#FFB547]';

      const customIcon = L.divIcon({
        className: 'custom-fire-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group" style="width: 24px; height: 24px;">
            ${isCrit ? '<span class="absolute w-6 h-6 rounded-full bg-[#F04438]/25 animate-ping"></span>' : ''}
            ${obs.is_repeat ? '<span class="absolute w-5 h-5 rounded-full border border-[#FFB547]/50"></span>' : ''}
            ${isSelected ? '<span class="absolute w-7 h-7 rounded-full border-2 border-[#FFB547] animate-pulse"></span>' : ''}
            <div class="w-3 h-3 rounded-full ${colorClass} ring-2 ring-[#15191D] shadow-sm"></div>
            <div class="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1C2227] border border-[#323B43] text-[#F4F1E9] px-2 py-0.5 rounded font-mono text-[9px] whitespace-nowrap shadow-md pointer-events-none z-30">
              ${obs.obs_id} • ${obs.frp} MW • ${obs.source_type === 'nasa_firms' ? 'LIVE' : obs.source_type === 'csv_upload' ? 'CSV' : 'DEMO'}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([obs.latitude, obs.longitude], { icon: customIcon });

      marker.on('click', () => {
        onSelectObservation(obs);
      });

      const provBadge = obs.source_type === 'nasa_firms'
        ? '<span style="color:#55B887; background:#112F21; padding:1px 4px; border-radius:2px; font-size:9px;">LIVE FIRMS</span>'
        : obs.source_type === 'csv_upload'
        ? '<span style="color:#68B5E8; background:#103248; padding:1px 4px; border-radius:2px; font-size:9px;">CSV IMPORT</span>'
        : '<span style="color:#FFB547; background:#38270F; padding:1px 4px; border-radius:2px; font-size:9px;">DEMO FIXTURE</span>';

      const anomBadge = obs.anomaly_flags
        ? `<div style="margin-top:4px; color:#FFB547; font-size:9px; background:#2A2315; padding:2px 4px; border-radius:2px; border:1px solid #FFB547/40;">
            ⚠️ Anomaly: ${obs.anomaly_flags.replace('_', ' ')}
           </div>`
        : '';

      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.4; padding: 4px; min-width: 170px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <strong style="color: ${isCrit ? '#F04438' : '#FFB547'};">${obs.obs_id}</strong>
            ${provBadge}
          </div>
          <div style="color: #9BA3AF; font-size: 10px;">${obs.region}</div>
          <div style="margin-top: 4px; display: flex; justify-content: space-between; border-top: 1px solid #323B43; padding-top: 4px;">
            <span>FRP: <strong style="color: #F4F1E9;">${obs.frp} MW</strong></span>
            <span>Score: <strong style="color: ${isCrit ? '#F04438' : '#FFB547'};">${obs.priority_score}</strong></span>
          </div>
          <div style="margin-top: 2px; color: #9BA3AF; font-size: 10px;">
            ${obs.satellite} • ${obs.acq_time} UTC • ${obs.is_repeat ? `${obs.repeat_count} passes` : '1 pass'}
          </div>
          ${anomBadge}
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #323B43; text-align: center;">
            <button class="map-inspect-btn" data-obs-id="${obs.obs_id}" style="width: 100%; background: #FFB547; color: #15191D; border: none; border-radius: 3px; font-weight: bold; font-size: 10px; padding: 3px 6px; cursor: pointer;">
              Inspect Full Details →
            </button>
          </div>
        </div>
      `, { offset: [0, -6] });

      marker.addTo(markersLayer);
    });
  }, [observations, selectedObservation, onSelectObservation, mapFilter]);

  // 5. Pan to selected observation
  useEffect(() => {
    if (!selectedObservation || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo([selectedObservation.latitude, selectedObservation.longitude], {
      animate: true,
      duration: 0.8
    });
  }, [selectedObservation]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const validCoords = observations
      .filter(o => typeof o.latitude === 'number' && typeof o.longitude === 'number' && !isNaN(o.latitude) && !isNaN(o.longitude))
      .map(o => [o.latitude, o.longitude] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 8 });
    } else {
      map.setView([39.8241, -121.4429], 6);
    }
  };

  return (
    <div className={`relative w-full rounded border border-[#323B43] overflow-hidden bg-[#0F1316] ${heightClass}`}>
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* GIS Navigation Controls (Top Left) */}
      <div className="absolute top-2.5 left-2.5 z-[400] flex flex-col gap-0.5 bg-[#252C32]/95 border border-[#323B43] backdrop-blur-md rounded p-0.5 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded text-[#F4F1E9] hover:bg-[#1C2227] transition-colors"
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <div className="w-full h-px bg-[#323B43]"></div>
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded text-[#F4F1E9] hover:bg-[#1C2227] transition-colors"
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <div className="w-full h-px bg-[#323B43]"></div>
        <button
          onClick={handleResetView}
          className="w-7 h-7 flex items-center justify-center rounded text-[#68B5E8] hover:bg-[#1C2227] transition-colors"
          title="Reset to Regional Overview"
        >
          <span className="material-symbols-outlined text-[16px]">my_location</span>
        </button>
      </div>

      {/* Top Right Controls: Basemap Layer Switcher & Filters */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col items-end gap-1.5 font-mono text-[10px]">
        {/* Basemap Layer Selector */}
        <div className="flex items-center gap-1 bg-[#252C32]/95 border border-[#323B43] backdrop-blur-md p-1 rounded shadow-md">
          <span className="text-[#9BA3AF] px-1 text-[9px] uppercase tracking-wider font-semibold">Basemap:</span>
          <button
            onClick={() => setBasemapType('osm-dark')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              basemapType === 'osm-dark'
                ? 'bg-[#FFB547] text-[#15191D] font-bold shadow-sm'
                : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
            title="OpenStreetMap Dark Tactical (Inverted)"
          >
            Dark OSM
          </button>
          <button
            onClick={() => setBasemapType('osm-standard')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              basemapType === 'osm-standard'
                ? 'bg-[#F4F1E9] text-[#15191D] font-bold shadow-sm'
                : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
            title="OpenStreetMap Standard Light"
          >
            OSM Light
          </button>
          <button
            onClick={() => setBasemapType('satellite')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              basemapType === 'satellite'
                ? 'bg-[#68B5E8] text-[#15191D] font-bold shadow-sm'
                : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
            title="Esri World Imagery (Public Satellite)"
          >
            Satellite
          </button>
        </div>


        {/* Observation Filters */}
        <div className="flex items-center gap-1 bg-[#252C32]/95 border border-[#323B43] backdrop-blur-md p-1 rounded shadow-md">
          <button
            onClick={() => setMapFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors ${
              mapFilter === 'all' ? 'bg-[#FFB547] text-[#15191D] font-bold' : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
          >
            All ({observations.length})
          </button>
          <button
            onClick={() => setMapFilter('critical')}
            className={`px-2 py-0.5 rounded transition-colors ${
              mapFilter === 'critical' ? 'bg-[#F04438] text-white font-bold' : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setMapFilter('repeats')}
            className={`px-2 py-0.5 rounded transition-colors ${
              mapFilter === 'repeats' ? 'bg-[#FFB547]/30 text-[#FFB547] border border-[#FFB547]/50 font-bold' : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
            }`}
          >
            Repeats
          </button>
        </div>

        <div className="bg-[#252C32]/90 border border-[#323B43] backdrop-blur-md px-2 py-0.5 rounded text-[#9BA3AF] flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${tilesLoadedCount > 0 ? 'bg-[#55B887]' : 'bg-[#FFB547]'}`}></span>
          <span>VIIRS 375m • {tilesLoadedCount > 0 ? `Tiles Active (${tilesLoadedCount})` : 'Initializing Basemap...'}</span>
        </div>
      </div>

      {/* Tile Loading Error Fallback Notification */}
      {tileError && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[500] max-w-lg w-[92%] bg-[#1F1715]/95 border border-[#F04438]/70 backdrop-blur-md rounded-md p-3 shadow-2xl font-mono text-xs">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#F04438] text-[20px] shrink-0 mt-0.5">warning</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[#F4F1E9] font-bold text-xs tracking-wide">Basemap Tile Notice</span>
                <span className="text-[10px] text-[#F04438] bg-[#F04438]/15 px-1.5 py-0.5 rounded border border-[#F04438]/30 font-bold">
                  Connection Error
                </span>
              </div>
              <p className="text-[#D08680] text-[11px] mt-1 leading-relaxed">
                Unable to load map tiles from the current tile server. Hotspot observation telemetry, priority scoring, coordinates, and markers remain fully interactive.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-[#323B43]">
                <button
                  onClick={handleRetryTiles}
                  className="px-2.5 py-1 bg-[#F04438]/20 hover:bg-[#F04438]/30 border border-[#F04438]/50 text-[#F4F1E9] rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">refresh</span>
                  Retry Basemap
                </button>
                <button
                  onClick={() => {
                    setBasemapType(basemapType === 'satellite' ? 'osm-standard' : 'satellite');
                    setTileError(false);
                  }}
                  className="px-2.5 py-1 bg-[#1C2227] hover:bg-[#252C32] border border-[#323B43] text-[#68B5E8] rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">layers</span>
                  Switch Basemap Layer
                </button>
                <button
                  onClick={() => setTileError(false)}
                  className="px-2 py-1 text-[#9BA3AF] hover:text-[#F4F1E9] text-[10px] ml-auto transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Legend & Scale Bar (Bottom Overlay) */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] flex items-end justify-between pointer-events-none">
        {/* Crisp GIS Legend */}
        <div className="bg-[#252C32]/95 border border-[#323B43] backdrop-blur-md px-2.5 py-1.5 rounded shadow pointer-events-auto flex flex-col gap-1 font-mono text-[10px] text-[#F4F1E9]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F04438]"></span>
            <span>Critical (&gt;80 score)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFB547]"></span>
            <span>Moderate (50-79)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6C7684]"></span>
            <span>Low / Flare (&lt;50)</span>
          </div>
        </div>

        {/* GIS Scale Indicator */}
        <div className="bg-[#252C32]/95 border border-[#323B43] backdrop-blur-md px-2 py-1 rounded shadow text-right font-mono text-[10px] text-[#9BA3AF] flex flex-col items-end">
          <div className="w-16 h-1 bg-[#323B43] mb-1 relative border border-[#45505B]">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[#F4F1E9]"></div>
          </div>
          <span>50 km • WGS 84</span>
        </div>
      </div>
    </div>
  );
};
