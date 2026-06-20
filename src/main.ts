import "./styles.css";

type ScenarioName = "noAc" | "dayAc";

type Inputs = {
  startLow: number;
  startHigh: number;
  endLow: number;
  endHigh: number;
  buildingCoverage: number;
  floorCount: number;
  facadeThermalMass: number;
  outdoorThermalMass: number;
  thermalMass: number;
  exteriorConductance: number;
  outdoorConductance: number;
  envelopeConductance: number;
  roofEnvelopeConductance: number;
  openWindowConductance: number;
  cityAirDepth: number;
  cityAirExchange: number;
  roofThermalMass: number;
  roofConductance: number;
  peakSolar: number;
  wallSunAngle: number;
  indoorSolarFraction: number;
  skyDepression: number;
  internalGain: number;
  acDaySetpoint: number;
  acNightSetpoint: number;
  acCapacity: number;
  acCop: number;
  acStart: number;
  acEnd: number;
  dayVentilation: number;
  nightVentilation: number;
};

type Point = {
  hour: number;
  weather: number;
  noAcOutdoor: number;
  dayAcOutdoor: number;
  noAcCityAir: number;
  dayAcCityAir: number;
  noAcFacade: number;
  dayAcFacade: number;
  noAcFacadeShade: number;
  dayAcFacadeShade: number;
  noAcRoof: number;
  dayAcRoof: number;
  noAcFabric: number;
  dayAcFabric: number;
  noAcMass: number;
  dayAcMass: number;
  noAcFlux: number;
  dayAcFlux: number;
  noAcWindowFlux: number;
  dayAcWindowFlux: number;
  dayAcWaste: number;
  noAcFabricFlux: number;
  dayAcFabricFlux: number;
};

const neighborhoodPitchWidth = 24;
const floorHeight = 3;
// Linearized net-longwave coefficient 4*emissivity*sigma*T^3 at ~300 K, in W/m2/K.
const longwaveCoefficient = 5.5;
const minAreaIndex = 1e-6;

const controls: Array<{
  key: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  help: string;
}> = [
  {
    key: "startLow",
    label: "Start low",
    min: 5,
    max: 30,
    step: 0.5,
    unit: "C",
    help: "Neutral weather low on day 1. Mild nights might be 15-20 C; hot urban heat-wave nights can stay above 22 C."
  },
  {
    key: "startHigh",
    label: "Start high",
    min: 10,
    max: 38,
    step: 0.5,
    unit: "C",
    help: "Neutral weather peak on day 1. Warm summer days are often 25-32 C; severe heat waves can exceed 35 C."
  },
  {
    key: "endLow",
    label: "End low",
    min: 10,
    max: 32,
    step: 0.5,
    unit: "C",
    help: "Neutral weather low by day 7. Raise this to model accumulated regional heat and poor nighttime relief."
  },
  {
    key: "endHigh",
    label: "End high",
    min: 20,
    max: 48,
    step: 0.5,
    unit: "C",
    help: "Neutral weather peak by day 7. Paris-scale heat waves can push the neutral peak toward 35-40 C."
  },
  {
    key: "peakSolar",
    label: "Peak solar",
    min: 0,
    max: 1000,
    step: 25,
    unit: "W/m2",
    help: "Fixed absorbed shortwave budget per m2 land at solar noon. 500-800 is a useful clear-summer range after albedo and geometry simplifications."
  },
  {
    key: "wallSunAngle",
    label: "Wall sun angle",
    min: 5,
    max: 85,
    step: 1,
    unit: "deg",
    help: "Solar altitude for splitting fixed sun between horizontal roof/street and vertical walls. Low values favor walls; high values favor roofs and streets."
  },
  {
    key: "skyDepression",
    label: "Clear-sky depression",
    min: 2,
    max: 20,
    step: 1,
    unit: "K",
    help: "Effective sky temperature below neutral air. 4-8 K suits humid/cloudy nights; 10-15 K suits clearer dry nights."
  },
  {
    key: "buildingCoverage",
    label: "Building coverage",
    min: 0.2,
    max: 0.9,
    step: 0.01,
    unit: "",
    help: "Share of land occupied by roofs/building footprint. Paris-like dense blocks with courtyards are roughly 0.45-0.65 in this simplified pitch model; 0.9 is near-solid fabric."
  },
  {
    key: "floorCount",
    label: "Floor count",
    min: 1,
    max: 40,
    step: 1,
    unit: "",
    help: "Typical above-ground floors. Paris mid-rise fabric is often about 5-7 floors; towers or low-rise suburbs should move away from that range."
  },
  {
    key: "thermalMass",
    label: "Indoor thermal mass",
    min: 20,
    max: 150,
    step: 5,
    unit: "Wh/m2K",
    help: "Indoor contents and inner slab faces per m2 floor. Keep below structural mass to avoid double counting: ~30 light, ~60 medium, ~100 heavy."
  },
  {
    key: "facadeThermalMass",
    label: "Facade thermal mass",
    min: 30,
    max: 160,
    step: 5,
    unit: "Wh/m2K",
    help: "Participating outer-wall capacity per m2 wall. ~50 light cladding, ~80 masonry, 110-160 heavy stone or thick historic fabric."
  },
  {
    key: "roofThermalMass",
    label: "Roof thermal mass",
    min: 20,
    max: 200,
    step: 5,
    unit: "Wh/m2K",
    help: "Participating roof capacity per m2 roof. ~40 light deck, ~80 typical roof, 150+ heavy concrete or green roof."
  },
  {
    key: "outdoorThermalMass",
    label: "Street thermal mass",
    min: 25,
    max: 200,
    step: 5,
    unit: "Wh/m2K",
    help: "Participating paving/ground capacity per m2 street. ~60 thin/dry asphalt, ~100 typical paving, 150-200 deep stone or damp ground."
  },
  {
    key: "envelopeConductance",
    label: "Wall-indoor leakiness",
    min: 0.1,
    max: 8,
    step: 0.05,
    unit: "W/m2K",
    help: "Wall-to-indoor conductance per m2 wall, including leakage. ~0.2 very insulated, ~1-2 older masonry, 3-8 leaky or single-glazed."
  },
  {
    key: "roofEnvelopeConductance",
    label: "Roof-indoor leakiness",
    min: 0.02,
    max: 4,
    step: 0.02,
    unit: "W/m2K",
    help: "Roof-to-indoor conductance per m2 roof. Usually lower than wall leakiness in this aggregate model because it mainly couples to the top-floor ceiling."
  },
  {
    key: "openWindowConductance",
    label: "Open-window exchange",
    min: 0,
    max: 12,
    step: 0.25,
    unit: "W/m2K",
    help: "Direct indoor-canyon exchange when canyon air is cooler and AC is off. 0 means sealed; 3-8 represents useful night ventilation."
  },
  {
    key: "indoorSolarFraction",
    label: "Indoor solar share",
    min: 0,
    max: 0.25,
    step: 0.01,
    unit: "",
    help: "Share of wall-incident solar transmitted indoors. 0.05-0.2 is plausible after window fraction, glass, blinds, and orientation; the rest heats sunlit walls."
  },
  {
    key: "exteriorConductance",
    label: "Canyon-wall exchange",
    min: 1,
    max: 20,
    step: 0.5,
    unit: "W/m2K",
    help: "Wall-to-canyon heat exchange. ~5-12 is a useful calm-to-breezy urban range; higher values make wall heat reach canyon air faster."
  },
  {
    key: "outdoorConductance",
    label: "Street-fabric exchange",
    min: 1,
    max: 30,
    step: 0.5,
    unit: "W/m2K",
    help: "Street-air to paving exchange. ~6-15 typical, up to 25-30 with strong wind or exposed surfaces."
  },
  {
    key: "roofConductance",
    label: "Roof-city exchange",
    min: 2,
    max: 40,
    step: 1,
    unit: "W/m2K",
    help: "Roof-to-city-air exchange above the canyon. Roofs are exposed, so 10-25 is a reasonable starting range."
  },
  {
    key: "nightVentilation",
    label: "Night canyon-city exchange",
    min: 1,
    max: 150,
    step: 0.5,
    unit: "W/m2K",
    help: "Canyon-to-city-air exchange overnight and near dawn. Low values trap released wall/street heat in the canyon."
  },
  {
    key: "dayVentilation",
    label: "Day canyon-city exchange",
    min: 1,
    max: 200,
    step: 1,
    unit: "W/m2K",
    help: "Canyon-to-city-air exchange under sunny mixing. Usually greater than night; a 1-3x day/night ratio is a useful sensitivity range."
  },
  {
    key: "cityAirDepth",
    label: "City air depth",
    min: 50,
    max: 800,
    step: 25,
    unit: "m",
    help: "Effective mixed urban air depth receiving canyon and roof heat. 100-300 m is a compact urban boundary-layer scale; deeper dilutes heat more."
  },
  {
    key: "cityAirExchange",
    label: "City air flushing",
    min: 2,
    max: 80,
    step: 1,
    unit: "W/m2K",
    help: "Exchange from city air back to neutral weather. Low values model stagnant heat waves; high values flush the urban background quickly."
  },
  {
    key: "internalGain",
    label: "Internal gain",
    min: 0,
    max: 10,
    step: 0.25,
    unit: "W/m2",
    help: "People, appliances, lights, and equipment per m2 floor. Residential averages are often a few W/m2; offices can be higher."
  },
  {
    key: "acDaySetpoint",
    label: "AC day setpoint",
    min: 20,
    max: 29,
    step: 0.25,
    unit: "C",
    help: "Cooling target during solar hours when AC is scheduled on. 24-26 C is a common comfort-policy range."
  },
  {
    key: "acNightSetpoint",
    label: "AC night setpoint",
    min: 18,
    max: 28,
    step: 0.25,
    unit: "C",
    help: "Cooling target outside solar hours when AC is scheduled on. Lower values increase comfort but reject heat into the night canyon."
  },
  {
    key: "acCapacity",
    label: "AC capacity",
    min: 5,
    max: 80,
    step: 2.5,
    unit: "W/m2",
    help: "Cooling extraction cap per m2 floor. Treat as realized load capacity, not nameplate. 20-40 moderate, 60-80 strong."
  },
  {
    key: "acCop",
    label: "AC COP",
    min: 2,
    max: 7,
    step: 0.1,
    unit: "",
    help: "Coefficient of performance. Older or stressed systems may be 2-3; efficient systems often land around 4-6."
  },
  {
    key: "acStart",
    label: "AC starts",
    min: 0,
    max: 23,
    step: 1,
    unit: ":00",
    help: "Hour when scheduled cooling begins. Use 0 with AC ends 24 for full-day operation."
  },
  {
    key: "acEnd",
    label: "AC ends",
    min: 1,
    max: 24,
    step: 1,
    unit: ":00",
    help: "Hour when scheduled cooling stops. Values earlier than start represent overnight schedules."
  }
];

const defaults: Inputs = {
  startLow: 18,
  startHigh: 30,
  endLow: 20,
  endHigh: 40,
  buildingCoverage: 0.55,
  floorCount: 6,
  facadeThermalMass: 80,
  outdoorThermalMass: 80,
  thermalMass: 60,
  exteriorConductance: 12,
  outdoorConductance: 12,
  envelopeConductance: 1.5,
  roofEnvelopeConductance: 0.25,
  openWindowConductance: 6,
  cityAirDepth: 250,
  cityAirExchange: 80,
  roofThermalMass: 80,
  roofConductance: 15,
  peakSolar: 700,
  wallSunAngle: 45,
  indoorSolarFraction: 0.2,
  skyDepression: 12,
  internalGain: 4,
  acDaySetpoint: 25,
  acNightSetpoint: 22,
  acCapacity: 80,
  acCop: 3.5,
  acStart: 0,
  acEnd: 24,
  dayVentilation: 80,
  nightVentilation: 60
};

const simulationHours = 24 * 7;
const heatRampHours = 24 * 4;
const dtHours = 1 / 60;
const windowResponseHours = 0.5;
// AC engagement ramps in/out over this horizon at schedule boundaries instead of
// switching instantly, standing in for staggered unit startup and a cooling load that
// builds over the morning. Without it the rejected heat steps into the low-capacity
// canyon air and produces an unphysical jump when the schedule flips on.
const acRampHours = 0.5;
// Thermostat response time: the AC pulls the indoor node toward setpoint over this
// horizon rather than snapping to it in a single step, so realized load can modulate
// below the capacity cap and depends on the actual gains and thermal mass.
const acResponseHours = 1;
const gradientHeatTransferReference = 10;
const maxGradientConductanceMultiplier = 1.8;
const state: Inputs = { ...defaults };

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing app root");
}

app.innerHTML = `
  <section class="hero">
    <div>
      <p class="eyebrow">Interactive urban heat model</p>
      <h1>How much does AC heat up cities?</h1>
      <p class="lede">
        Compare a no-AC city block with an air-conditioned block during a heat wave. The model tracks
        indoor comfort, waste heat, stored heat, and how much of it reaches the street canyon and city air.
      </p>
    </div>
  </section>
  <section class="workspace">
    <form class="controls" id="controls" aria-label="Simulation controls"></form>
    <section class="results">
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2>Indoor and canyon, with and without AC</h2>
            <p>The clean comparison: indoor air and street-canyon air for both scenarios.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i>No AC canyon</span>
            <span><i class="dayAc"></i>AC canyon</span>
            <span><i class="noAcMass"></i>No AC indoor</span>
            <span><i class="dayAcMass"></i>AC indoor</span>
          </div>
        </div>
        <svg id="cleanChart" viewBox="0 0 980 360" role="img" aria-label="Indoor and canyon temperature comparison line chart"></svg>
      </div>
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2>Building and canyon temperatures</h2>
            <p>Full week. Neutral air ramps to the end low/high over the first 4 days, then holds.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i>No AC canyon</span>
            <span><i class="noAcCityAir"></i>No AC city air</span>
            <span><i class="noAcFacade"></i>No AC facade (sun)</span>
            <span><i class="noAcRoof"></i>No AC roof</span>
            <span><i class="noAcFabric"></i>No AC street</span>
            <span><i class="noAcMass"></i>No AC indoor</span>
            <span><i class="dayAc"></i>AC canyon</span>
            <span><i class="dayAcCityAir"></i>AC city air</span>
            <span><i class="dayAcFacade"></i>AC facade (sun)</span>
            <span><i class="dayAcRoof"></i>AC roof</span>
            <span><i class="dayAcFabric"></i>AC street</span>
            <span><i class="dayAcMass"></i>AC indoor</span>
            <span><i class="weather"></i>Neutral air</span>
          </div>
        </div>
        <svg id="tempChart" viewBox="0 0 980 430" role="img" aria-label="Building and canyon temperature line chart"></svg>
      </div>
      <div class="metricGrid" id="metrics"></div>
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2>Heat released to street air</h2>
            <p>Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i>No AC facade</span>
            <span><i class="noAcFabric"></i>No AC street</span>
            <span><i class="noAcWindow"></i>No AC windows</span>
            <span><i class="dayAc"></i>AC facade</span>
            <span><i class="dayAcFabric"></i>AC street</span>
            <span><i class="dayAcWindow"></i>AC windows</span>
            <span><i class="waste"></i>AC rejection</span>
          </div>
        </div>
        <svg id="fluxChart" viewBox="0 0 980 300" role="img" aria-label="Heat flux line chart"></svg>
      </div>
      <section class="notes">
        <h2>What drives the warming?</h2>
        <p>
          The city impact depends on when AC runs, how efficiently it rejects heat, how strongly the canyon mixes,
          and whether cooled buildings avoid storing heat that would otherwise be released later.
        </p>
        <p>
          This is an energy-balance sketch, not a full urban canopy model. Use it to compare directions and
          parameter sensitivity before moving to a coupled building-energy and urban-meteorology model.
        </p>
      </section>
    </section>
  </section>
`;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing UI node: ${selector}`);
  }
  return element;
}

const controlsEl = requiredElement<HTMLFormElement>("#controls");
const metricsEl = requiredElement<HTMLElement>("#metrics");
const cleanChart = requiredElement<SVGSVGElement>("#cleanChart");
const tempChart = requiredElement<SVGSVGElement>("#tempChart");
const fluxChart = requiredElement<SVGSVGElement>("#fluxChart");

for (const control of controls) {
  const id = `control-${control.key}`;
  const field = document.createElement("label");
  field.className = "control";
  field.htmlFor = id;
  field.innerHTML = `
    <span>
      <strong>${control.label}</strong>
      <small>${control.help}</small>
    </span>
    <output id="${id}-value"></output>
    <input id="${id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${state[control.key]}" />
  `;
  const input = field.querySelector<HTMLInputElement>("input");
  input?.addEventListener("input", () => {
    state[control.key] = Number(input.value);
    render();
  });
  controlsEl.append(field);
}

function dailyTemperature(hour: number, low: number, high: number): number {
  const local = hour % 24;
  const mean = (low + high) / 2;
  const amplitude = (high - low) / 2;
  const daily = Math.sin(((local - 9) / 24) * Math.PI * 2);
  return mean + amplitude * daily;
}

function weatherTemp(hour: number, inputs: Inputs): number {
  const progress = Math.min(1, hour / heatRampHours);
  const low = inputs.startLow + (inputs.endLow - inputs.startLow) * progress;
  const high = inputs.startHigh + (inputs.endHigh - inputs.startHigh) * progress;
  return dailyTemperature(hour, low, high);
}

function sunShape(hour: number): number {
  const local = hour % 24;
  if (local < 6 || local > 20) return 0;
  return Math.sin(((local - 6) / 14) * Math.PI);
}

function acSetpointForHour(hour: number, inputs: Inputs): number {
  return sunShape(hour) > 0 ? inputs.acDaySetpoint : inputs.acNightSetpoint;
}

function canyonCityConductance(hour: number, inputs: Inputs): number {
  const sun = sunShape(hour);
  const smoothSun = sun * sun * (3 - 2 * sun);
  return inputs.nightVentilation + (inputs.dayVentilation - inputs.nightVentilation) * smoothSun;
}

function isAcOn(hour: number, inputs: Inputs): boolean {
  const local = hour % 24;
  if (inputs.acStart === 0 && inputs.acEnd === 24) {
    return true;
  }
  if (inputs.acEnd > inputs.acStart) {
    return local >= inputs.acStart && local < inputs.acEnd;
  }
  return local >= inputs.acStart || local < inputs.acEnd;
}

function buildingHeightFromFloors(inputs: Inputs): number {
  return inputs.floorCount * floorHeight;
}

function streetWidthFromCoverage(inputs: Inputs): number {
  return neighborhoodPitchWidth * (1 - inputs.buildingCoverage);
}

function canyonAspectRatio(inputs: Inputs): number {
  return buildingHeightFromFloors(inputs) / streetWidthFromCoverage(inputs);
}

function canyonDepthFromFloors(inputs: Inputs): number {
  return buildingHeightFromFloors(inputs);
}

function floorAreaRatio(inputs: Inputs): number {
  return inputs.buildingCoverage * inputs.floorCount;
}

function canyonExchangeFactor(inputs: Inputs): number {
  return 1 / canyonAspectRatio(inputs);
}

// Geometric sky-view factors for an infinitely long street canyon (r = H/W).
// Deeper canyons see less sky, so they shed less longwave and trap more heat.
function skyViewFactors(inputs: Inputs): { road: number; wall: number; roof: number } {
  const r = canyonAspectRatio(inputs);
  const road = Math.sqrt(1 + r * r) - r;
  const wall = (0.5 * (1 + r - Math.sqrt(1 + r * r))) / r;
  return { road, wall, roof: 1 };
}

function sunAngleComponents(inputs: Inputs): { horizontal: number; vertical: number } {
  const angleRadians = (inputs.wallSunAngle * Math.PI) / 180;
  return {
    horizontal: Math.max(0.01, Math.sin(angleRadians)),
    vertical: Math.max(0.01, Math.cos(angleRadians))
  };
}

function solarSplit(inputs: Inputs): { roof: number; street: number; wallExterior: number; indoor: number } {
  const { road: roadSkyView } = skyViewFactors(inputs);
  const { horizontal, vertical } = sunAngleComponents(inputs);
  const roofWeight = inputs.buildingCoverage * horizontal;
  const canyonOpeningWeight = 1 - inputs.buildingCoverage;
  const streetWeight = canyonOpeningWeight * roadSkyView * horizontal;
  const wallWeight = canyonOpeningWeight * (1 - roadSkyView) * vertical;
  const totalWeight = Math.max(minAreaIndex, roofWeight + streetWeight + wallWeight);
  const roof = inputs.peakSolar * (roofWeight / totalWeight);
  const street = inputs.peakSolar * (streetWeight / totalWeight);
  const wallIncident = inputs.peakSolar * (wallWeight / totalWeight);
  const indoor = wallIncident * inputs.indoorSolarFraction;
  const wallExterior = wallIncident - indoor;
  return {
    roof,
    street,
    wallExterior,
    indoor
  };
}

function sunlitWallFraction(inputs: Inputs): number {
  const { horizontal, vertical } = sunAngleComponents(inputs);
  const sunlitHeightFraction = Math.min(1, horizontal / (vertical * canyonAspectRatio(inputs)));
  return 0.5 * sunlitHeightFraction;
}

function gradientAdjustedConductance(baseConductance: number, deltaC: number): number {
  const multiplier = Math.pow(1 + Math.abs(deltaC) / gradientHeatTransferReference, 1 / 3);
  return baseConductance * Math.min(maxGradientConductanceMultiplier, multiplier);
}

function simulateScenario(inputs: Inputs, scenario: ScenarioName): Omit<Point, "hour" | "weather">[] {
  const steps = Math.round((simulationHours / dtHours));
  const canyonDepth = canyonDepthFromFloors(inputs);
  const canyonHeatCapacity = 0.335 * canyonDepth;
  const cityAirCapacity = 0.335 * inputs.cityAirDepth;
  const far = floorAreaRatio(inputs);
  const indoorCapacity = inputs.thermalMass * far;
  const facadeAreaIndex = far * (0.55 + inputs.buildingCoverage * 0.75);
  const streetAreaIndex = Math.max(minAreaIndex, 1 - inputs.buildingCoverage);
  const outdoorCapacity = inputs.outdoorThermalMass * streetAreaIndex;
  const outdoorConductance = inputs.outdoorConductance * streetAreaIndex;
  const { road: roadSkyView, wall: wallSkyView, roof: roofSkyView } = skyViewFactors(inputs);
  const streetRadConductance = longwaveCoefficient * roadSkyView * streetAreaIndex;
  // Exterior fabric is walls plus a separate roof. The walls face the canyon and are split
  // by solar altitude into a sunlit patch (absorbs beam solar, runs hot) and shaded wall.
  // The roof is its own node: it faces the city air above the canopy, not the street.
  const roofAreaIndex = Math.max(minAreaIndex, inputs.buildingCoverage);
  const wallAreaIndex = Math.max(0, facadeAreaIndex - roofAreaIndex);
  const sunlitWallIndex = Math.max(minAreaIndex, sunlitWallFraction(inputs) * wallAreaIndex);
  const shadedWallIndex = Math.max(minAreaIndex, wallAreaIndex - sunlitWallIndex);
  const sunlitCapacity = inputs.facadeThermalMass * sunlitWallIndex;
  const shadedCapacity = inputs.facadeThermalMass * shadedWallIndex;
  const sunlitExteriorConductance = inputs.exteriorConductance * sunlitWallIndex;
  const shadedExteriorConductance = inputs.exteriorConductance * shadedWallIndex;
  const sunlitEnvelopeConductance = inputs.envelopeConductance * sunlitWallIndex;
  const shadedEnvelopeConductance = inputs.envelopeConductance * shadedWallIndex;
  const sunlitRadConductance = longwaveCoefficient * sunlitWallIndex * wallSkyView;
  const shadedRadConductance = longwaveCoefficient * shadedWallIndex * wallSkyView;
  const roofCapacity = inputs.roofThermalMass * roofAreaIndex;
  const roofCityConductance = inputs.roofConductance * roofAreaIndex;
  const roofIndoorConductance = inputs.roofEnvelopeConductance * roofAreaIndex;
  const roofRadConductance = longwaveCoefficient * roofAreaIndex * roofSkyView;
  const peakSolarSplit = solarSplit(inputs);
  let indoorTemp = (inputs.startLow + inputs.startHigh) / 2;
  let facadeSunlitTemp = weatherTemp(0, inputs) + 0.7;
  let facadeShadedTemp = facadeSunlitTemp;
  let roofTemp = facadeSunlitTemp;
  let canyonTemp = facadeSunlitTemp;
  let cityAirTemp = weatherTemp(0, inputs);
  let fabricTemp = facadeSunlitTemp;
  let windowOpening = 0;
  let acEngagement = 0;
  const rows: Omit<Point, "hour" | "weather">[] = [];

  const step = (hour: number, weather: number): Omit<Point, "hour" | "weather"> => {
    const canyonCityExchange = canyonCityConductance(hour, inputs) * canyonExchangeFactor(inputs);
    const sunlitToCanyon = gradientAdjustedConductance(sunlitExteriorConductance, facadeSunlitTemp - canyonTemp) * (facadeSunlitTemp - canyonTemp);
    const shadedToCanyon = gradientAdjustedConductance(shadedExteriorConductance, facadeShadedTemp - canyonTemp) * (facadeShadedTemp - canyonTemp);
    const passiveFlux = sunlitToCanyon + shadedToCanyon;
    const fabricFlux = gradientAdjustedConductance(outdoorConductance, fabricTemp - canyonTemp) * (fabricTemp - canyonTemp);
    const sunlitToIndoor = gradientAdjustedConductance(sunlitEnvelopeConductance, facadeSunlitTemp - indoorTemp) * (facadeSunlitTemp - indoorTemp);
    const shadedToIndoor = gradientAdjustedConductance(shadedEnvelopeConductance, facadeShadedTemp - indoorTemp) * (facadeShadedTemp - indoorTemp);
    const roofToIndoor = gradientAdjustedConductance(roofIndoorConductance, roofTemp - indoorTemp) * (roofTemp - indoorTemp);
    const envelopeFlux = sunlitToIndoor + shadedToIndoor + roofToIndoor;
    const roofToCity = gradientAdjustedConductance(roofCityConductance, roofTemp - cityAirTemp) * (roofTemp - cityAirTemp);
    const acScheduled = scenario === "dayAc" && isAcOn(hour, inputs);
    acEngagement += ((acScheduled ? 1 : 0) - acEngagement) * (1 - Math.exp(-dtHours / acRampHours));
    const targetWindowOpening = !acScheduled && canyonTemp < indoorTemp ? 1 : 0;
    const windowResponse = 1 - Math.exp(-dtHours / windowResponseHours);
    windowOpening += (targetWindowOpening - windowOpening) * windowResponse;
    const windowHeatToIndoor = windowOpening * inputs.openWindowConductance * far * Math.min(0, canyonTemp - indoorTemp);
    const windowHeatToCanyon = -windowHeatToIndoor;
    const sun = sunShape(hour);
    const indoorSolarGains = peakSolarSplit.indoor * sun;
    const exteriorSolarGains = peakSolarSplit.wallExterior * sun;
    const streetSolarGains = peakSolarSplit.street * sun;
    const roofSolarGains = peakSolarSplit.roof * sun;
    const skyTemp = weather - inputs.skyDepression;
    const sunlitRadLoss = sunlitRadConductance * (facadeSunlitTemp - skyTemp);
    const shadedRadLoss = shadedRadConductance * (facadeShadedTemp - skyTemp);
    const roofRadLoss = roofRadConductance * (roofTemp - skyTemp);
    const fabricRadLoss = streetRadConductance * (fabricTemp - skyTemp);
    const internalGains = inputs.internalGain * far;
    let cooling = 0;
    let waste = 0;

    const acSetpoint = acSetpointForHour(hour, inputs);
    if (acEngagement > 0 && indoorTemp > acSetpoint) {
      const needed = (indoorTemp - acSetpoint) * indoorCapacity / acResponseHours;
      const maxCapacity = inputs.acCapacity * far;
      cooling = Math.min(needed, maxCapacity) * acEngagement;
      waste = cooling * (1 + 1 / inputs.acCop);
    }

    // AC condensers reject heat into the canyon air; the street fabric only warms
    // indirectly, by convection from that warmed air.
    const canyonFlux = passiveFlux + fabricFlux + windowHeatToCanyon + waste;
    // All absorbed solar lands on the sunlit set; the shaded set only loses heat.
    const sunlitFlux = exteriorSolarGains - sunlitToCanyon - sunlitToIndoor - sunlitRadLoss;
    const shadedFlux = -shadedToCanyon - shadedToIndoor - shadedRadLoss;
    const roofFlux = roofSolarGains - roofToCity - roofToIndoor - roofRadLoss;
    const fabricNetFlux = streetSolarGains - fabricFlux - fabricRadLoss;
    const indoorFlux = internalGains + indoorSolarGains + envelopeFlux + windowHeatToIndoor - cooling;
    const canyonToCityFlux = canyonCityExchange * (canyonTemp - cityAirTemp);
    const cityToWeatherFlux = inputs.cityAirExchange * (cityAirTemp - weather);
    facadeSunlitTemp += (sunlitFlux * dtHours) / sunlitCapacity;
    facadeShadedTemp += (shadedFlux * dtHours) / shadedCapacity;
    roofTemp += (roofFlux * dtHours) / roofCapacity;
    fabricTemp += (fabricNetFlux * dtHours) / outdoorCapacity;
    indoorTemp += (indoorFlux * dtHours) / indoorCapacity;
    canyonTemp += ((canyonFlux - canyonToCityFlux) * dtHours) / canyonHeatCapacity;
    cityAirTemp += ((canyonToCityFlux + roofToCity - cityToWeatherFlux) * dtHours) / cityAirCapacity;

    return {
      noAcOutdoor: scenario === "noAc" ? canyonTemp : 0,
      dayAcOutdoor: scenario === "dayAc" ? canyonTemp : 0,
      noAcCityAir: scenario === "noAc" ? cityAirTemp : 0,
      dayAcCityAir: scenario === "dayAc" ? cityAirTemp : 0,
      noAcFacade: scenario === "noAc" ? facadeSunlitTemp : 0,
      dayAcFacade: scenario === "dayAc" ? facadeSunlitTemp : 0,
      noAcFacadeShade: scenario === "noAc" ? facadeShadedTemp : 0,
      dayAcFacadeShade: scenario === "dayAc" ? facadeShadedTemp : 0,
      noAcRoof: scenario === "noAc" ? roofTemp : 0,
      dayAcRoof: scenario === "dayAc" ? roofTemp : 0,
      noAcFabric: scenario === "noAc" ? fabricTemp : 0,
      dayAcFabric: scenario === "dayAc" ? fabricTemp : 0,
      noAcMass: scenario === "noAc" ? indoorTemp : 0,
      dayAcMass: scenario === "dayAc" ? indoorTemp : 0,
      noAcFlux: scenario === "noAc" ? passiveFlux : 0,
      dayAcFlux: scenario === "dayAc" ? passiveFlux : 0,
      noAcWindowFlux: scenario === "noAc" ? windowHeatToCanyon : 0,
      dayAcWindowFlux: scenario === "dayAc" ? windowHeatToCanyon : 0,
      dayAcWaste: waste,
      noAcFabricFlux: scenario === "noAc" ? fabricFlux : 0,
      dayAcFabricFlux: scenario === "dayAc" ? fabricFlux : 0
    };
  };

  for (let i = 0; i <= steps; i += 1) {
    const hour = i * dtHours;
    rows.push(step(hour, weatherTemp(hour, inputs)));
  }

  return rows;
}

function simulate(inputs: Inputs): Point[] {
  const noAc = simulateScenario(inputs, "noAc");
  const dayAc = simulateScenario(inputs, "dayAc");
  return noAc.map((row, index) => {
    const hour = index * dtHours;
    return {
      hour,
      weather: weatherTemp(hour, inputs),
      noAcOutdoor: row.noAcOutdoor,
      dayAcOutdoor: dayAc[index].dayAcOutdoor,
      noAcCityAir: row.noAcCityAir,
      dayAcCityAir: dayAc[index].dayAcCityAir,
      noAcFacade: row.noAcFacade,
      dayAcFacade: dayAc[index].dayAcFacade,
      noAcFacadeShade: row.noAcFacadeShade,
      dayAcFacadeShade: dayAc[index].dayAcFacadeShade,
      noAcRoof: row.noAcRoof,
      dayAcRoof: dayAc[index].dayAcRoof,
      noAcFabric: row.noAcFabric,
      dayAcFabric: dayAc[index].dayAcFabric,
      noAcMass: row.noAcMass,
      dayAcMass: dayAc[index].dayAcMass,
      noAcFlux: row.noAcFlux,
      dayAcFlux: dayAc[index].dayAcFlux,
      noAcWindowFlux: row.noAcWindowFlux,
      dayAcWindowFlux: dayAc[index].dayAcWindowFlux,
      dayAcWaste: dayAc[index].dayAcWaste,
      noAcFabricFlux: row.noAcFabricFlux,
      dayAcFabricFlux: dayAc[index].dayAcFabricFlux
    };
  });
}

function summarize(points: Point[]) {
  const night = points.filter((point) => {
    const local = point.hour % 24;
    return local >= 21 || local <= 6;
  });
  const day = points.filter((point) => {
    return isAcOn(point.hour, state);
  });
  const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const max = (values: number[]) => Math.max(...values);
  const nightDelta = avg(night.map((point) => point.dayAcOutdoor - point.noAcOutdoor));
  const worstNightDelta = max(night.map((point) => point.dayAcOutdoor - point.noAcOutdoor));
  const dayDelta = avg(day.map((point) => point.dayAcOutdoor - point.noAcOutdoor));
  const nightMassDelta = avg(night.map((point) => point.dayAcMass - point.noAcMass));
  const wasteHeat = avg(day.map((point) => point.dayAcWaste));
  const sunlitFacadePeak = max(points.map((point) => point.noAcFacade));
  const shadedFacadePeak = max(points.map((point) => point.noAcFacadeShade));
  const roofPeak = max(points.map((point) => point.noAcRoof));
  const noAcWindowHeat = avg(points.map((point) => point.noAcWindowFlux));
  const dayAcWindowHeat = avg(points.map((point) => point.dayAcWindowFlux));
  const canyonDepth = canyonDepthFromFloors(state);
  const buildingHeight = buildingHeightFromFloors(state);
  const streetWidth = streetWidthFromCoverage(state);
  const derivedCanyonAspectRatio = canyonAspectRatio(state);
  const far = floorAreaRatio(state);
  const canyonHeatCapacity = 0.335 * canyonDepth;
  const cityAirCapacity = 0.335 * state.cityAirDepth;
  const indoorCapacity = state.thermalMass * far;
  const streetAreaIndex = Math.max(minAreaIndex, 1 - state.buildingCoverage);
  const outdoorCapacity = state.outdoorThermalMass * streetAreaIndex;
  const facadeAreaIndex = far * (0.55 + state.buildingCoverage * 0.75);
  const roofAreaIndex = Math.max(minAreaIndex, state.buildingCoverage);
  const wallAreaIndex = Math.max(minAreaIndex, facadeAreaIndex - roofAreaIndex);
  const facadeCapacity = state.facadeThermalMass * wallAreaIndex;
  const roofCapacity = state.roofThermalMass * roofAreaIndex;
  const envelopeConductance = state.envelopeConductance * wallAreaIndex + state.roofEnvelopeConductance * roofAreaIndex;
  const exteriorConductance = state.exteriorConductance * wallAreaIndex;
  const roofConductance = state.roofConductance * roofAreaIndex;
  const indoorCapacityRatio = indoorCapacity / canyonHeatCapacity;
  const facadeCapacityRatio = facadeCapacity / canyonHeatCapacity;
  const roofCapacityRatio = roofCapacity / canyonHeatCapacity;
  const outdoorCapacityRatio = outdoorCapacity / canyonHeatCapacity;
  const cityAirCapacityRatio = cityAirCapacity / canyonHeatCapacity;
  const indoorTimeConstant = indoorCapacity / envelopeConductance;
  const facadeTimeConstant = facadeCapacity / exteriorConductance;
  const roofTimeConstant = roofCapacity / roofConductance;
  const outdoorTimeConstant = outdoorCapacity / (state.outdoorConductance * streetAreaIndex);
  const dayCanyonCityTimeConstant = canyonHeatCapacity / (state.dayVentilation * canyonExchangeFactor(state));
  const nightCanyonCityTimeConstant = canyonHeatCapacity / (state.nightVentilation * canyonExchangeFactor(state));
  const cityAirTimeConstant = cityAirCapacity / state.cityAirExchange;
  const mixingRatio = state.dayVentilation / state.nightVentilation;
  const acCapacityLand = state.acCapacity * far;
  const acMaxRejection = acCapacityLand * (1 + 1 / state.acCop);
  const { road: roadSkyView, wall: wallSkyView, roof: roofSkyView } = skyViewFactors(state);
  const wallNetLongwave = longwaveCoefficient * wallSkyView * state.skyDepression;
  const roofNetLongwave = longwaveCoefficient * roofSkyView * state.skyDepression;
  const streetNetLongwave = longwaveCoefficient * roadSkyView * state.skyDepression;
  const peakSolarSplit = solarSplit(state);
  const splitSolarTotal = peakSolarSplit.roof + peakSolarSplit.street + peakSolarSplit.wallExterior + peakSolarSplit.indoor;
  const sunlitWallShare = sunlitWallFraction(state);
  const sunlitWallAreaIndex = Math.max(minAreaIndex, sunlitWallShare * wallAreaIndex);
  return {
    nightDelta,
    worstNightDelta,
    dayDelta,
    nightMassDelta,
    wasteHeat,
    noAcWindowHeat,
    dayAcWindowHeat,
    floorAreaRatio: far,
    canyonDepth,
    buildingHeight,
    streetWidth,
    derivedCanyonAspectRatio,
    indoorCapacityRatio,
    facadeCapacityRatio,
    roofCapacityRatio,
    outdoorCapacityRatio,
    cityAirCapacityRatio,
    indoorTimeConstant,
    facadeTimeConstant,
    roofTimeConstant,
    outdoorTimeConstant,
    dayCanyonCityTimeConstant,
    nightCanyonCityTimeConstant,
    cityAirTimeConstant,
    mixingRatio,
    acCapacityLand,
    acMaxRejection,
    sunlitFacadePeak,
    shadedFacadePeak,
    roofPeak,
    wallSkyView,
    roofSkyView,
    roadSkyView,
    wallNetLongwave,
    roofNetLongwave,
    streetNetLongwave,
    peakRoofSolar: peakSolarSplit.roof,
    peakWallSolar: peakSolarSplit.wallExterior,
    peakStreetSolar: peakSolarSplit.street,
    peakIndoorSolar: peakSolarSplit.indoor,
    peakRoofSolarPerArea: peakSolarSplit.roof / roofAreaIndex,
    peakWallSolarPerArea: peakSolarSplit.wallExterior / sunlitWallAreaIndex,
    peakStreetSolarPerArea: peakSolarSplit.street / streetAreaIndex,
    splitSolarTotal,
    sunlitWallShare
  };
}

function renderLineChart(svg: SVGSVGElement, points: Point[], series: Array<{ key: keyof Point; className: string }>, yLabel: string) {
  const width = 980;
  const height = svg.viewBox.baseVal.height;
  const pad = { top: 28, right: 28, bottom: 42, left: 62 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const firstHour = points[0]?.hour ?? 0;
  const lastHour = points.at(-1)?.hour ?? simulationHours;
  const duration = Math.max(1, lastHour - firstHour);
  const yValues = series.flatMap((item) => points.map((point) => Number(point[item.key])));
  const yMin = Math.floor(Math.min(...yValues) - 1);
  const yMax = Math.ceil(Math.max(...yValues) + 1);
  const xScale = (hour: number) => pad.left + ((hour - firstHour) / duration) * plotWidth;
  const yScale = (value: number) => pad.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const grid = Array.from({ length: 6 }, (_, index) => yMin + ((yMax - yMin) * index) / 5);
  const xTicks = Array.from({ length: 8 }, (_, index) => index * 24);

  svg.innerHTML = `
    <rect class="chartBg" x="0" y="0" width="${width}" height="${height}" />
    ${grid
      .map(
        (tick) => `
      <line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${yScale(tick)}" y2="${yScale(tick)}" />
      <text class="axisText" x="${pad.left - 12}" y="${yScale(tick) + 4}" text-anchor="end">${tick.toFixed(0)}</text>`
      )
      .join("")}
    ${xTicks
      .map(
        (tick) => `
      <line class="grid vertical" x1="${xScale(tick)}" x2="${xScale(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" />
      <text class="axisText" x="${xScale(tick)}" y="${height - 16}" text-anchor="middle">${tick === simulationHours ? "End" : `D${Math.floor(tick / 24) + 1}`}</text>`
      )
      .join("")}
    <text class="axisLabel" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})">${yLabel}</text>
    ${series
      .map((item) => {
        const d = points
          .map((point, index) => {
            const command = index === 0 ? "M" : "L";
            return `${command}${xScale(point.hour).toFixed(1)},${yScale(Number(point[item.key])).toFixed(1)}`;
          })
          .join(" ");
        return `<path class="line ${item.className}" d="${d}" />`;
      })
      .join("")}
  `;
}

function renderMetrics(summary: ReturnType<typeof summarize>) {
  const signedNight = `${summary.nightDelta >= 0 ? "+" : ""}${summary.nightDelta.toFixed(2)} C`;
  metricsEl.innerHTML = [
    ["Night average delta", signedNight, "AC scenario minus no-AC scenario for street-canyon air."],
    ["Worst night delta", `${summary.worstNightDelta >= 0 ? "+" : ""}${summary.worstNightDelta.toFixed(2)} C`, "Peak nighttime penalty or benefit."],
    ["AC-hour outdoor delta", `${summary.dayDelta >= 0 ? "+" : ""}${summary.dayDelta.toFixed(2)} C`, "Expected heat rejection cost while AC runs."],
    ["Night indoor delta", `${summary.nightMassDelta >= 0 ? "+" : ""}${summary.nightMassDelta.toFixed(2)} C`, "How much cooler the indoor/operative node remains."],
    ["Mean AC waste heat", `${summary.wasteHeat.toFixed(0)} W/m2`, "Rejected cooling load plus compressor power per land area."],
    ["Sunlit facade peak", `${summary.sunlitFacadePeak.toFixed(1)} C`, "Hottest sunlit wall surface, no-AC case."],
    ["Shaded facade peak", `${summary.shadedFacadePeak.toFixed(1)} C`, "Shaded walls stay cooler and can sink canyon heat, no-AC case."],
    ["Roof peak", `${summary.roofPeak.toFixed(1)} C`, "Roof surface temperature in the no-AC case; it exchanges with city air, not canyon air."],
    ["No-AC window heat", `${summary.noAcWindowHeat.toFixed(0)} W/m2`, "Mean direct indoor heat release through open windows."],
    ["AC-case window heat", `${summary.dayAcWindowHeat.toFixed(0)} W/m2`, "Mean window release during hours when AC is off."],
    ["Max AC extraction", `${summary.acCapacityLand.toFixed(0)} W/m2`, "Cooling capacity converted from floor area to land area."],
    ["Max AC rejection", `${summary.acMaxRejection.toFixed(0)} W/m2`, "Outdoor heat at full load, including compressor energy."],
    ["Roof noon solar", `${summary.peakRoofSolar.toFixed(0)} W/m2`, "Peak roof shortwave per land area after the fixed solar budget split."],
    ["Wall noon solar", `${summary.peakWallSolar.toFixed(0)} W/m2`, "Peak sunlit-wall absorbed shortwave per land area, after indoor transmission."],
    ["Street noon solar", `${summary.peakStreetSolar.toFixed(0)} W/m2`, "Peak street shortwave per land area after canyon shading."],
    ["Indoor noon solar", `${summary.peakIndoorSolar.toFixed(0)} W/m2`, "Peak transmitted solar gain per land area."],
    ["Roof surface solar", `${summary.peakRoofSolarPerArea.toFixed(0)} W/m2`, "Peak roof shortwave per square meter of roof."],
    ["Wall surface solar", `${summary.peakWallSolarPerArea.toFixed(0)} W/m2`, "Peak absorbed shortwave per square meter of sunlit wall."],
    ["Street surface solar", `${summary.peakStreetSolarPerArea.toFixed(0)} W/m2`, "Peak shortwave per square meter of street surface."],
    ["Solar split total", `${summary.splitSolarTotal.toFixed(0)} W/m2`, "Roof + wall + street + indoor equals the fixed peak solar input."],
    ["Sunlit wall area", `${(summary.sunlitWallShare * 100).toFixed(0)}%`, "Share of total wall area lit at the selected wall sun angle."],
    ["Wall sky view", `${summary.wallSkyView.toFixed(2)}`, "Wall view of sky; lower in deeper canyons."],
    ["Roof sky view", `${summary.roofSkyView.toFixed(2)}`, "Roof view of sky; roofs are exposed above the canopy."],
    ["Street sky view", `${summary.roadSkyView.toFixed(2)}`, "Street-floor view of sky; collapses toward 0 in deep canyons."],
    ["Wall net longwave", `${summary.wallNetLongwave.toFixed(0)} W/m2`, "Clear-night wall radiative loss per exposed surface at the set sky depression."],
    ["Roof net longwave", `${summary.roofNetLongwave.toFixed(0)} W/m2`, "Clear-night roof radiative loss per exposed surface at the set sky depression."],
    ["Street net longwave", `${summary.streetNetLongwave.toFixed(0)} W/m2`, "Street-floor radiative loss per exposed surface at the set sky depression."],
    ["Implied FAR", `${summary.floorAreaRatio.toFixed(1)}`, "Building coverage times floor count."],
    ["Building height", `${summary.buildingHeight.toFixed(0)} m`, "Floor count times 3 m per floor."],
    ["Street width", `${summary.streetWidth.toFixed(1)} m`, "Representative pitch width times the unbuilt street/open fraction."],
    ["Derived H/W", `${summary.derivedCanyonAspectRatio.toFixed(2)}`, "Building height divided by derived street width."],
    ["Canyon air depth", `${summary.canyonDepth.toFixed(0)} m`, "Canopy depth, set by building height; sets canyon air heat capacity."],
    ["Indoor / canyon capacity", `${summary.indoorCapacityRatio.toFixed(0)}x`, "Indoor heat capacity relative to the modeled canyon air."],
    ["Facade / canyon capacity", `${summary.facadeCapacityRatio.toFixed(0)}x`, "Wall heat capacity relative to the modeled canyon air."],
    ["Roof / canyon capacity", `${summary.roofCapacityRatio.toFixed(0)}x`, "Roof heat capacity relative to the modeled canyon air."],
    ["Street / canyon capacity", `${summary.outdoorCapacityRatio.toFixed(0)}x`, "Outdoor fabric storage relative to the modeled canyon air."],
    ["City air / canyon capacity", `${summary.cityAirCapacityRatio.toFixed(0)}x`, "Broader mixed air reservoir relative to canyon air."],
    ["Indoor time constant", `${summary.indoorTimeConstant.toFixed(1)} h`, "Near-equilibrium indoor-to-facade exchange timescale."],
    ["Facade time constant", `${summary.facadeTimeConstant.toFixed(1)} h`, "Near-equilibrium wall-to-canyon exchange timescale."],
    ["Roof time constant", `${summary.roofTimeConstant.toFixed(1)} h`, "Near-equilibrium roof-to-city-air exchange timescale."],
    ["Street time constant", `${summary.outdoorTimeConstant.toFixed(1)} h`, "Street fabric-to-canyon exchange timescale."],
    ["Day canyon exchange", `${summary.dayCanyonCityTimeConstant.toFixed(1)} h`, "Daytime canyon air exchange timescale to city air."],
    ["Night canyon exchange", `${summary.nightCanyonCityTimeConstant.toFixed(1)} h`, "Nighttime canyon air exchange timescale to city air."],
    ["City flushing time", `${summary.cityAirTimeConstant.toFixed(1)} h`, "Broader city air exchange timescale to neutral weather."],
    ["Day / night exchange", `${summary.mixingRatio.toFixed(1)}x`, "Strength of the canyon-city exchange contrast."]
  ]
    .map(
      ([label, value, note]) => `
      <article class="metric">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </article>`
    )
    .join("");
}

function renderControlValues() {
  for (const control of controls) {
    const output = document.querySelector<HTMLOutputElement>(`#control-${control.key}-value`);
    const input = document.querySelector<HTMLInputElement>(`#control-${control.key}`);
    if (!output || !input) continue;
    input.value = String(state[control.key]);
    if (control.key === "acStart" || control.key === "acEnd") {
      output.textContent = `${state[control.key]}:00`;
      continue;
    }
    output.textContent = `${Number(state[control.key]).toLocaleString("en-US", {
      maximumFractionDigits: control.step < 1 ? 2 : 0
    })}${control.unit}`;
  }
}

function render() {
  renderControlValues();
  const points = simulate(state);
  const summary = summarize(points);
  renderMetrics(summary);
  renderLineChart(
    cleanChart,
    points,
    [
      { key: "noAcOutdoor", className: "noAc" },
      { key: "dayAcOutdoor", className: "dayAc" },
      { key: "noAcMass", className: "noAcMass" },
      { key: "dayAcMass", className: "dayAcMass" }
    ],
    "C"
  );
  renderLineChart(
    tempChart,
    points,
    [
      { key: "noAcOutdoor", className: "noAc" },
      { key: "noAcCityAir", className: "noAcCityAir" },
      { key: "noAcFacade", className: "noAcFacade" },
      { key: "noAcRoof", className: "noAcRoof" },
      { key: "noAcFabric", className: "noAcFabric" },
      { key: "noAcMass", className: "noAcMass" },
      { key: "dayAcOutdoor", className: "dayAc" },
      { key: "dayAcCityAir", className: "dayAcCityAir" },
      { key: "dayAcFacade", className: "dayAcFacade" },
      { key: "dayAcRoof", className: "dayAcRoof" },
      { key: "dayAcFabric", className: "dayAcFabric" },
      { key: "dayAcMass", className: "dayAcMass" },
      { key: "weather", className: "weather" }
    ],
    "C"
  );
  renderLineChart(
    fluxChart,
    points,
    [
      { key: "noAcFlux", className: "noAc" },
      { key: "noAcFabricFlux", className: "noAcFabric" },
      { key: "noAcWindowFlux", className: "noAcWindow" },
      { key: "dayAcFlux", className: "dayAc" },
      { key: "dayAcFabricFlux", className: "dayAcFabric" },
      { key: "dayAcWindowFlux", className: "dayAcWindow" },
      { key: "dayAcWaste", className: "waste" }
    ],
    "W/m2"
  );
}

render();
