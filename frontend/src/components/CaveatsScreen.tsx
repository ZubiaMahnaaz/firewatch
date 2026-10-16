import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const CaveatsScreen: React.FC = () => {
  const scenarios = [
    { score: '84.2', tier: 'Tier-1 Critical', bg: 'bg-[#3D1715]', border: 'border-[#F04438]/50', fg: 'text-[#F04438]', meta: 'FRP: 142 MW | Age: 42m | Pass: 3' },
    { score: '62.7', tier: 'Tier-2 Priority', bg: 'bg-[#38270F]', border: 'border-[#FFB547]/50', fg: 'text-[#FFB547]', meta: 'FRP: 68 MW | Age: 1.8h | Pass: 2' },
    { score: '38.4', tier: 'Tier-3 Advisory', bg: 'bg-[#103248]', border: 'border-[#68B5E8]/50', fg: 'text-[#68B5E8]', meta: 'FRP: 18 MW | Age: 3.4h | Pass: 1' },
    { score: '18.9', tier: 'Tier-4 Routine', bg: 'bg-[#1C2227]', border: 'border-[#323B43]', fg: 'text-[#9BA3AF]', meta: 'FRP: 6 MW | Age: 5.1h | Pass: 1' }
  ];
  const [scenarioIdx, setScenarioIdx] = useState(0);

  const curScenario = scenarios[scenarioIdx];

  const handleNextScenario = () => {
    setScenarioIdx((prev) => (prev + 1) % scenarios.length);
  };

  return (
    <div className="flex flex-col w-full space-y-3.5 px-3.5 pt-3 pb-24">
      {/* 1. Operational Directive & Non-Emergency Disclaimer */}
      <div className="rounded-lg p-3.5 bg-[#473812]/60 border border-[#E7B94F]/40 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#E7B94F]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-[#E7B94F]/20 border border-[#E7B94F]/50 text-[#E7B94F] flex-shrink-0 flex items-center justify-center mt-0.5">
            <AlertTriangle className="w-5 h-5 text-[#E7B94F]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-[14px] font-bold tracking-wide text-[#E7B94F] uppercase">
                Operational Directive
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#E7B94F] text-[#15191D] font-bold uppercase tracking-wider">
                Non-Tactical
              </span>
            </div>
            <p className="font-body text-[13px] text-[#F4F1E9]/95 mt-1.5 leading-snug">
              <span className="font-semibold text-[#E7B94F]">SYSTEM STATUS: ANALYST DECISION-SUPPORT HEURISTIC ONLY.</span>{' '}
              FireWatch is an academic research &amp; rapid-triage heuristic interface. It does <em className="text-[#E7B94F] not-italic underline font-medium">NOT</em> independently verify active wildfires, compute forward flame-front vectors, or substitute for official 911 dispatch, CalFire, or USFS incident command operations.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Scientific Integrity & Bias Matrix Header Card */}
      <div className="rounded-lg bg-[#252C32] border border-[#323B43] p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#68B5E8]" />
            <span className="font-headline text-[15px] font-bold text-[#F4F1E9]">Scientific Integrity &amp; Bias Matrix</span>
          </div>
          <span className="font-mono text-[10px] text-[#68B5E8] font-semibold bg-[#103248] border border-[#68B5E8]/30 px-2 py-0.5 rounded">
            NASA EOS-TR-44
          </span>
        </div>
        <p className="font-body text-[12px] text-[#9BA3AF] leading-relaxed">
          Mission-critical environmental intelligence demands transparent telemetry boundaries. Satellite radiometers provide synoptic observations subject to thermodynamic, spatial, and orbital constraints.
        </p>
      </div>

      {/* 3. Systematic Limitations Grid */}
      <div className="flex flex-col space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FFB547] text-[18px]">rule</span>
            <h2 className="font-headline text-[15px] font-bold text-[#F4F1E9]">Systematic Limitations</h2>
          </div>
          <span className="font-mono text-[10px] text-[#6C7684] uppercase tracking-wider">4 Intrinsic Phenomena</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Card 1: Cloud & Heavy Smoke Obscuration */}
          <div className="rounded-lg p-3 bg-[#252C32] border border-[#323B43] flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-[#15191D] border border-[#323B43] flex items-center justify-center text-[#68B5E8] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">cloud_off</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6C7684] uppercase font-semibold">Phenomenon 01</span>
                  <h3 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Cloud &amp; Heavy Smoke Obscuration</h3>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#F04438]/50 bg-[#3D1715] text-[#F04438] font-semibold tracking-wide">
                FN Risk: High
              </span>
            </div>
            <p className="font-body text-[12.5px] text-[#9BA3AF] leading-snug">
              Thick stratus cloud decks, maritime fog, and pyrocumulonimbus plumes completely attenuate mid-infrared (3.9µm / 4.0µm) radiant flux. Sub-canopy smoldering blanketed under dense aerosol columns may yield zero sensor signal (false negatives).
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-[#323B43]/60">
              <span className="font-mono text-[10.5px] text-[#6C7684]">Spectral Attenuation: 3.9–4.0µm MWIR</span>
              <span className="font-mono text-[10.5px] text-[#68B5E8] font-medium">MOD14/MYD14 §2.4</span>
            </div>
          </div>

          {/* Card 2: Orbit Timing & Scan Geometry */}
          <div className="rounded-lg p-3 bg-[#252C32] border border-[#323B43] flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-[#15191D] border border-[#323B43] flex items-center justify-center text-[#68B5E8] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6C7684] uppercase font-semibold">Phenomenon 02</span>
                  <h3 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Orbit Timing &amp; Scan Geometry</h3>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#FFB547]/40 bg-[#38270F] text-[#FFB547] font-semibold tracking-wide">
                Temporal Latency
              </span>
            </div>
            <p className="font-body text-[12.5px] text-[#9BA3AF] leading-snug">
              Polar-orbiting spacecraft (VIIRS on Suomi-NPP/NOAA-20/NOAA-21; MODIS on Terra/Aqua) achieve sun-synchronous nadir overpasses roughly 2 to 4 times per 24h diurnal cycle. Rapid diurnal ignitions occurring between orbital tracks remain undetected until subsequent transit.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-[#323B43]/60">
              <span className="font-mono text-[10.5px] text-[#6C7684]">Window Interval: 3–6 hrs between passes</span>
              <span className="font-mono text-[10.5px] text-[#68B5E8] font-medium">Suomi-NPP / NOAA-20</span>
            </div>
          </div>

          {/* Card 3: Pixel Footprint & Geolocation */}
          <div className="rounded-lg p-3 bg-[#252C32] border border-[#323B43] flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-[#15191D] border border-[#323B43] flex items-center justify-center text-[#68B5E8] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">crop_free</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6C7684] uppercase font-semibold">Phenomenon 03</span>
                  <h3 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Pixel Footprint &amp; Geolocation</h3>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#323B43] bg-[#15191D] text-[#9BA3AF] font-semibold tracking-wide">
                Nadir: 375m / 1000m
              </span>
            </div>
            <p className="font-body text-[12.5px] text-[#9BA3AF] leading-snug">
              VIIRS I-band offers 375m nadir resolution; MODIS is 1km. Off-nadir scans experience optical bow-tie distortion and pixel elongation. Coordinate pins signify geometric pixel centroid, never the sub-pixel flaming front perimeter or exact boundary line.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-[#323B43]/60">
              <span className="font-mono text-[10.5px] text-[#6C7684]">Spatial Error: ±187.5m (VIIRS) to ±500m</span>
              <span className="font-mono text-[10.5px] text-[#68B5E8] font-medium">Bow-tie Correction</span>
            </div>
          </div>

          {/* Card 4: Industrial Confounders & Refraction */}
          <div className="rounded-lg p-3 bg-[#252C32] border border-[#323B43] flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-[#15191D] border border-[#323B43] flex items-center justify-center text-[#68B5E8] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">factory</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6C7684] uppercase font-semibold">Phenomenon 04</span>
                  <h3 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Industrial Confounders &amp; Refraction</h3>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#F04438]/50 bg-[#3D1715] text-[#F04438] font-semibold tracking-wide">
                FP Risk: High
              </span>
            </div>
            <p className="font-body text-[12.5px] text-[#9BA3AF] leading-snug">
              Natural gas flaring, petrochemical catalytic crackers, scrap-metal foundries, and solar glare glinting from corrugated metal roofs frequently mimic thermal brightness signatures, triggering elevated Fire Radiative Power (FRP).
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-[#323B43]/60">
              <span className="font-mono text-[10.5px] text-[#6C7684]">Known Artifacts: Static Flare Inventory</span>
              <span className="font-mono text-[10.5px] text-[#68B5E8] font-medium">MODIS Thermal Mask</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sensor Footprint Comparison Diagram (Screen 1 faithful SVG) */}
      <div className="rounded-lg p-3.5 bg-[#252C32] border border-[#323B43] shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#68B5E8] text-[18px]">network_cell</span>
            <h3 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Sensor Footprint Comparison</h3>
          </div>
          <span className="font-mono text-[10px] text-[#9BA3AF]">Sub-pixel Resolution</span>
        </div>
        <div className="w-full bg-[#15191D] rounded border border-[#323B43] p-3">
          <svg className="w-full h-24" fill="none" viewBox="0 0 320 80">
            {/* MODIS 1000m box */}
            <rect className="fill-[#1A2026] stroke-[#6C7684]" height="64" rx="3" strokeDasharray="3 3" strokeWidth="1.2" width="64" x="8" y="8"></rect>
            <text className="fill-[#9BA3AF] font-mono text-[9px] font-semibold" textAnchor="middle" x="40" y="38">MODIS</text>
            <text className="fill-[#6C7684] font-mono text-[8px]" textAnchor="middle" x="40" y="50">1000m × 1000m</text>
            {/* Arrow */}
            <path className="stroke-[#6C7684]" d="M 80 40 L 98 40" strokeLinecap="round" strokeWidth="1.5"></path>
            <polyline className="stroke-[#6C7684]" fill="none" points="94,36 99,40 94,44" strokeWidth="1.5"></polyline>
            {/* VIIRS 375m box */}
            <rect className="fill-[#103248] stroke-[#68B5E8]" height="30" rx="2" strokeWidth="1.2" width="30" x="110" y="25"></rect>
            <text className="fill-[#68B5E8] font-mono text-[8px] font-bold" textAnchor="middle" x="125" y="41">VIIRS</text>
            <text className="fill-[#68B5E8] font-mono text-[6.5px]" textAnchor="middle" x="125" y="50">375m</text>
            {/* Centroid pinpoint */}
            <circle className="fill-[#F04438] animate-pulse" cx="195" cy="40" r="3.5"></circle>
            <circle className="stroke-[#F04438] fill-[#F04438]/10" cx="195" cy="40" r="13" strokeDasharray="2 2" strokeWidth="1"></circle>
            <text className="fill-[#F4F1E9] font-headline text-[11px] font-bold" x="218" y="37">Pixel Centroid (Lat/Lon)</text>
            <text className="fill-[#9BA3AF] font-body text-[9.5px]" x="218" y="50">Sub-pixel flaming perimeter</text>
          </svg>
        </div>
        <div className="mt-2 flex items-center justify-between text-[#9BA3AF] font-mono text-[10.5px]">
          <span>VIIRS offers ~7x areal reduction vs MODIS</span>
          <span className="text-[#68B5E8] font-medium">Bilinear Nadir</span>
        </div>
      </div>

      {/* 5. False-Positive Mitigation Pipeline (3 Stages) */}
      <div className="rounded-lg p-3.5 bg-[#252C32] border border-[#323B43] shadow-sm flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#68B5E8] text-[18px]">account_tree</span>
            <h2 className="font-headline text-[14px] font-bold text-[#F4F1E9]">False-Positive Mitigation Pipeline</h2>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#15191D] border border-[#323B43] text-[#68B5E8] font-semibold">
            STAGE 1-3
          </span>
        </div>
        <p className="font-body text-[12.5px] text-[#9BA3AF] leading-snug">
          Raw FIRMS thermal radiative vectors pass through a deterministic three-tiered heuristic filter to deprioritize industrial noise and non-wildfire radiative energy.
        </p>

        <div className="flex flex-col space-y-2">
          {/* Stage 1 */}
          <div className="flex items-start gap-2.5 p-2.5 rounded bg-[#15191D] border border-[#323B43]">
            <div className="w-5 h-5 rounded bg-[#103248] border border-[#68B5E8]/40 text-[#68B5E8] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div className="flex flex-col min-w-0 flex-grow">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-semibold text-[#F4F1E9]">Static Heat Signature Masking</span>
                <span className="font-mono text-[10px] text-[#68B5E8]">1.2km Excl.</span>
              </div>
              <p className="font-body text-[11.5px] text-[#9BA3AF] mt-0.5 leading-snug">
                Automated spatial join against the Global Gas Flare Catalog (GGFR) and NOAA persistent industrial thermal source database. Hits within 1,200m buffer are tagged <code className="text-[#FFB547] font-mono text-[10.5px]">CONF_FP_INDUSTRIAL</code> and downweighted.
              </p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="flex items-start gap-2.5 p-2.5 rounded bg-[#15191D] border border-[#323B43]">
            <div className="w-5 h-5 rounded bg-[#103248] border border-[#68B5E8]/40 text-[#68B5E8] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div className="flex flex-col min-w-0 flex-grow">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-semibold text-[#F4F1E9]">Land Cover Zoning Cross-Ref</span>
                <span className="font-mono text-[10px] text-[#68B5E8]">USGS NLCD</span>
              </div>
              <p className="font-body text-[11.5px] text-[#9BA3AF] mt-0.5 leading-snug">
                Cross-validation against USGS National Land Cover Database 30m rasters. Identifies agricultural crop clearing, controlled burn permits, and open-pit aggregate mines versus wildland-urban interface (WUI) canopy fuels.
              </p>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="flex items-start gap-2.5 p-2.5 rounded bg-[#15191D] border border-[#323B43]">
            <div className="w-5 h-5 rounded bg-[#103248] border border-[#68B5E8]/40 text-[#68B5E8] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div className="flex flex-col min-w-0 flex-grow">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-semibold text-[#F4F1E9]">Human Analyst Triage (Tier-1)</span>
                <span className="font-mono text-[10px] text-[#55B887]">Duty Desk</span>
              </div>
              <p className="font-body text-[11.5px] text-[#9BA3AF] mt-0.5 leading-snug">
                Manual geospatial review of GOES-16/18 ABI full-disk 5-minute cadence imagery, paired with near-ground automated weather stations (RAWS) wind vectors before priority escalation to emergency operations dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Explainable Scoring Heuristic Formulation & Interactive Demo */}
      <div className="rounded-lg p-3.5 bg-[#252C32] border border-[#323B43] shadow-sm flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FFB547] text-[18px]">functions</span>
            <h2 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Explainable Scoring Heuristic</h2>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#15191D] border border-[#323B43] text-[#FFB547] font-semibold">
            FORMULA SPEC
          </span>
        </div>

        {/* Formula Code Box */}
        <div className="p-2.5 rounded bg-[#15191D] border border-[#323B43] font-mono text-[11px] text-[#68B5E8] overflow-x-auto select-all">
          <code>Priority = w₁·Norm_FRP + w₂·Recency_Decay + w₃·Conf_Weight + w₄·Persistence</code>
        </div>

        {/* Weight Breakdown Table */}
        <div className="flex flex-col space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[#6C7684] font-mono text-[10px] pb-1 border-b border-[#323B43]">
            <span>PARAMETER</span>
            <span>WEIGHT</span>
            <span className="text-right">RATIONALE</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#15191D] border border-[#323B43] text-[#F4F1E9]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#F04438] flex-shrink-0"></span>
              <span className="font-mono text-[11px] font-medium truncate">Norm_FRP (w₁)</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-[#252C32] rounded border border-[#323B43] text-[#FFB547]">0.35</span>
            <span className="font-body text-[11px] text-[#9BA3AF] text-right truncate max-w-[140px]">Megawatt radiant intensity</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#15191D] border border-[#323B43] text-[#F4F1E9]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#FFB547] flex-shrink-0"></span>
              <span className="font-mono text-[11px] font-medium truncate">Recency_Decay (w₂)</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-[#252C32] rounded border border-[#323B43] text-[#FFB547]">0.25</span>
            <span className="font-body text-[11px] text-[#9BA3AF] text-right truncate max-w-[140px]">Exp. half-life (t₁/₂ = 6.0h)</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#15191D] border border-[#323B43] text-[#F4F1E9]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#68B5E8] flex-shrink-0"></span>
              <span className="font-mono text-[11px] font-medium truncate">Persistence (w₃)</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-[#252C32] rounded border border-[#323B43] text-[#FFB547]">0.20</span>
            <span className="font-body text-[11px] text-[#9BA3AF] text-right truncate max-w-[140px]">Multi-pass detections</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#15191D] border border-[#323B43] text-[#F4F1E9]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#55B887] flex-shrink-0"></span>
              <span className="font-mono text-[11px] font-medium truncate">Conf_Weight (w₄)</span>
            </div>
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-[#252C32] rounded border border-[#323B43] text-[#FFB547]">0.20</span>
            <span className="font-body text-[11px] text-[#9BA3AF] text-right truncate max-w-[140px]">Sensor confidence [0-1]</span>
          </div>
        </div>

        {/* Interactive Heuristic Simulation Card */}
        <div className="rounded border border-[#323B43] bg-[#15191D] p-2.5 mt-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#F4F1E9]">Normalizer Simulation</span>
            <button
              onClick={handleNextScenario}
              className="text-[#FFB547] hover:text-[#FBF0D1] transition-colors flex items-center gap-1 font-mono text-[10.5px]"
            >
              <span className="material-symbols-outlined text-[13px]">tune</span> Cycle Scenario ({scenarioIdx + 1}/4)
            </button>
          </div>
          <div className="flex items-center justify-between bg-[#1A2026] p-2 rounded border border-[#323B43]">
            <div>
              <span className="font-mono text-[10px] text-[#9BA3AF]">Heuristic Score:</span>
              <div className="font-headline text-[22px] font-bold text-[#FFB547]">
                {curScenario.score} <span className="font-mono text-[11px] font-normal text-[#6C7684]">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${curScenario.bg} ${curScenario.border} ${curScenario.fg}`}>
                {curScenario.tier}
              </span>
              <p className="font-mono text-[10px] text-[#9BA3AF] mt-1">
                {curScenario.meta}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Data Provenance & NASA FIRMS Attribution */}
      <div className="rounded-lg p-3.5 bg-[#252C32] border border-[#323B43] shadow-sm flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#68B5E8] text-[18px]">dataset</span>
            <h2 className="font-headline text-[14px] font-bold text-[#F4F1E9]">Data Provenance &amp; Attribution</h2>
          </div>
          <span className="font-mono text-[10px] text-[#68B5E8] font-semibold border border-[#68B5E8]/30 bg-[#103248] px-1.5 py-0.5 rounded">
            OPEN DATA
          </span>
        </div>
        <p className="font-body text-[12px] text-[#9BA3AF] leading-relaxed">
          We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA’s Earth Science Data and Information System (ESDIS) with funding provided by NASA/HQ.
        </p>

        {/* Source Specs */}
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
          <div className="p-2 rounded bg-[#15191D] border border-[#323B43] flex flex-col">
            <span className="text-[#6C7684] text-[9.5px]">SENSOR ARRAY</span>
            <span className="text-[#F4F1E9] font-semibold truncate">VIIRS &amp; MODIS</span>
          </div>
          <div className="p-2 rounded bg-[#15191D] border border-[#323B43] flex flex-col">
            <span className="text-[#6C7684] text-[9.5px]">PLATFORM INGESTION</span>
            <span className="text-[#F4F1E9] font-semibold truncate">NASA LANCE / FIRMS</span>
          </div>
          <div className="p-2 rounded bg-[#15191D] border border-[#323B43] flex flex-col">
            <span className="text-[#6C7684] text-[9.5px]">PIPELINE CORE</span>
            <span className="text-[#F4F1E9] font-semibold truncate">Python / GeoPandas / FastAPI</span>
          </div>
          <div className="p-2 rounded bg-[#15191D] border border-[#323B43] flex flex-col">
            <span className="text-[#6C7684] text-[9.5px]">SYSTEM BUILD</span>
            <span className="text-[#F4F1E9] font-semibold truncate">v1.2-alpha | 2026.1</span>
          </div>
        </div>

        {/* Citation Box */}
        <div className="p-2.5 rounded bg-[#15191D] border border-[#323B43] text-[#9BA3AF] font-mono text-[10.5px] leading-relaxed select-all">
          <p className="italic text-[#F4F1E9]/90">
            "NASA Earthdata. (2026). Near Real-Time Active Fire Data: VIIRS 375m / MODIS 1km. Earth Science Data and Information System (ESDIS) Project. Greenbelt, MD: NASA Goddard Space Flight Center."
          </p>
        </div>

        {/* Sign-off */}
        <div className="flex items-center justify-between pt-1 text-[#6C7684] font-mono text-[10px]">
          <span className="flex items-center gap-1 text-[#55B887]">
            <span className="material-symbols-outlined text-[13px]">policy</span>
            Complies with NASA Open Data Policy
          </span>
          <span className="text-[#6C7684]">FireWatch Academic</span>
        </div>
      </div>
    </div>
  );
};
