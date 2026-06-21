import "./styles.css";

import { type Inputs, type Point, defaults, simulationHours, simulate, summarize } from "./model";
import { languageNames, t, formatNumber, getLanguage, setLanguage, initLanguage } from "./i18n";
import { schematicMarkup } from "./schematic";

type ThemeMode = "system" | "light" | "dark";

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
        help: "Neutral weather low on day 1. Mild nights might be 15-20 C; hot urban heat-wave nights can stay above 22 C.",
    },
    {
        key: "startHigh",
        label: "Start high",
        min: 10,
        max: 38,
        step: 0.5,
        unit: "C",
        help: "Neutral weather peak on day 1. Warm summer days are often 25-32 C; severe heat waves can exceed 35 C.",
    },
    {
        key: "endLow",
        label: "End low",
        min: 10,
        max: 32,
        step: 0.5,
        unit: "C",
        help: "Neutral weather low by day 7. Raise this to model accumulated regional heat and poor nighttime relief.",
    },
    {
        key: "endHigh",
        label: "End high",
        min: 20,
        max: 48,
        step: 0.5,
        unit: "C",
        help: "Neutral weather peak by day 7. Paris-scale heat waves can push the neutral peak toward 35-40 C.",
    },
    {
        key: "latitude",
        label: "Latitude",
        min: 0,
        max: 65,
        step: 0.05,
        unit: "deg N",
        help: "Site latitude. Sets the sun's seasonal path: solar elevation, day length, and sunrise/sunset. Paris is 48.85.",
    },
    {
        key: "dayOfYear",
        label: "Day of year",
        min: 1,
        max: 365,
        step: 1,
        unit: "",
        help: "Date as day-of-year. Summer solstice is ~172 (Jun 21); Aug 1 is ~213. Drives solar declination, so day length and noon sun height.",
    },
    {
        key: "clearSkyClarity",
        label: "Sky clarity",
        min: 0.5,
        max: 0.82,
        step: 0.01,
        unit: "",
        help: "Bulk atmospheric transmittance for clear-sky beam solar. ~0.75 is a clear summer day; lower is hazier/more humid. Replaces the old fixed solar budget.",
    },
    {
        key: "skyDepression",
        label: "Clear-sky depression",
        min: 2,
        max: 20,
        step: 1,
        unit: "K",
        help: "Effective sky temperature below neutral air. 4-8 K suits humid/cloudy nights; 10-15 K suits clearer dry nights.",
    },
    {
        key: "buildingCoverage",
        label: "Building coverage",
        min: 0.2,
        max: 0.9,
        step: 0.01,
        unit: "",
        help: "Share of land occupied by roofs/building footprint. Paris-like dense blocks with courtyards are roughly 0.45-0.65 in this simplified pitch model; 0.9 is near-solid fabric.",
    },
    {
        key: "floorCount",
        label: "Floor count",
        min: 1,
        max: 40,
        step: 1,
        unit: "",
        help: "Typical above-ground floors. Paris mid-rise fabric is often about 5-7 floors; towers or low-rise suburbs should move away from that range.",
    },
    {
        key: "thermalMass",
        label: "Indoor thermal mass",
        min: 20,
        max: 150,
        step: 5,
        unit: "Wh/m2K",
        help: "Indoor contents and inner slab faces per m2 floor. Keep below structural mass to avoid double counting: ~30 light, ~60 medium, ~100 heavy.",
    },
    {
        key: "facadeThermalMass",
        label: "Facade thermal mass",
        min: 30,
        max: 160,
        step: 5,
        unit: "Wh/m2K",
        help: "Participating outer-wall capacity per m2 wall. ~50 light cladding, ~80 masonry, 110-160 heavy stone or thick historic fabric.",
    },
    {
        key: "roofThermalMass",
        label: "Roof thermal mass",
        min: 20,
        max: 200,
        step: 5,
        unit: "Wh/m2K",
        help: "Participating roof capacity per m2 roof. ~40 light deck, ~80 typical roof, 150+ heavy concrete or green roof.",
    },
    {
        key: "outdoorThermalMass",
        label: "Street thermal mass",
        min: 25,
        max: 200,
        step: 5,
        unit: "Wh/m2K",
        help: "Participating paving/ground capacity per m2 street. ~60 thin/dry asphalt, ~100 typical paving, 150-200 deep stone or damp ground.",
    },
    {
        key: "envelopeConductance",
        label: "Wall-indoor leakiness",
        min: 0.1,
        max: 8,
        step: 0.05,
        unit: "W/m2K",
        help: "Wall-to-indoor conductance per m2 wall, including leakage. ~0.2 very insulated, ~1-2 older masonry, 3-8 leaky or single-glazed.",
    },
    {
        key: "roofEnvelopeConductance",
        label: "Roof-indoor leakiness",
        min: 0.02,
        max: 4,
        step: 0.02,
        unit: "W/m2K",
        help: "Roof-to-indoor conductance per m2 roof. Usually lower than wall leakiness in this aggregate model because it mainly couples to the top-floor ceiling.",
    },
    {
        key: "openWindowConductance",
        label: "Open-window exchange",
        min: 0,
        max: 12,
        step: 0.25,
        unit: "W/m2K",
        help: "Direct indoor-canyon exchange when canyon air is cooler and AC is off. 0 means sealed; 3-8 represents useful night ventilation.",
    },
    {
        key: "indoorSolarFraction",
        label: "Indoor solar share",
        min: 0,
        max: 0.25,
        step: 0.01,
        unit: "",
        help: "Share of wall-incident solar transmitted indoors. 0.05-0.2 is plausible after window fraction, glass, blinds, and orientation; the rest heats sunlit walls.",
    },
    {
        key: "exteriorConductance",
        label: "Canyon-wall exchange",
        min: 1,
        max: 20,
        step: 0.5,
        unit: "W/m2K",
        help: "Wall-to-canyon heat exchange. ~5-12 is a useful calm-to-breezy urban range; higher values make wall heat reach canyon air faster.",
    },
    {
        key: "outdoorConductance",
        label: "Street-fabric exchange",
        min: 1,
        max: 30,
        step: 0.5,
        unit: "W/m2K",
        help: "Street-air to paving exchange. ~6-15 typical, up to 25-30 with strong wind or exposed surfaces.",
    },
    {
        key: "roofConductance",
        label: "Roof-city exchange",
        min: 2,
        max: 40,
        step: 1,
        unit: "W/m2K",
        help: "Roof-to-city-air exchange above the canyon. Roofs are exposed, so 10-25 is a reasonable starting range.",
    },
    {
        key: "nightVentilation",
        label: "Night canyon-city exchange",
        min: 1,
        max: 150,
        step: 0.5,
        unit: "W/m2K",
        help: "Canyon-to-city-air exchange overnight and near dawn. Low values trap released wall/street heat in the canyon.",
    },
    {
        key: "dayVentilation",
        label: "Day canyon-city exchange",
        min: 1,
        max: 200,
        step: 1,
        unit: "W/m2K",
        help: "Canyon-to-city-air exchange under sunny mixing. Usually greater than night; a 1-3x day/night ratio is a useful sensitivity range.",
    },
    {
        key: "cityAirDepth",
        label: "City air depth",
        min: 50,
        max: 800,
        step: 25,
        unit: "m",
        help: "Effective mixed urban air depth receiving canyon and roof heat. 100-300 m is a compact urban boundary-layer scale; deeper dilutes heat more.",
    },
    {
        key: "cityAirExchange",
        label: "City air flushing",
        min: 2,
        max: 80,
        step: 1,
        unit: "W/m2K",
        help: "Exchange from city air back to neutral weather. Low values model stagnant heat waves; high values flush the urban background quickly.",
    },
    {
        key: "internalGain",
        label: "Internal gain",
        min: 0,
        max: 10,
        step: 0.25,
        unit: "W/m2",
        help: "People, appliances, lights, and equipment per m2 floor. Residential averages are often a few W/m2; offices can be higher.",
    },
    {
        key: "acDaySetpoint",
        label: "AC day setpoint",
        min: 20,
        max: 29,
        step: 0.25,
        unit: "C",
        help: "Cooling target during solar hours when AC is scheduled on. 24-26 C is a common comfort-policy range.",
    },
    {
        key: "acNightSetpoint",
        label: "AC night setpoint",
        min: 18,
        max: 28,
        step: 0.25,
        unit: "C",
        help: "Cooling target outside solar hours when AC is scheduled on. Lower values increase comfort but reject heat into the night canyon.",
    },
    {
        key: "acCapacity",
        label: "AC capacity",
        min: 5,
        max: 80,
        step: 2.5,
        unit: "W/m2",
        help: "Cooling extraction cap per m2 floor. Treat as realized load capacity, not nameplate. 20-40 moderate, 60-80 strong.",
    },
    {
        key: "acCop",
        label: "AC COP",
        min: 2,
        max: 7,
        step: 0.1,
        unit: "",
        help: "Coefficient of performance. Older or stressed systems may be 2-3; efficient systems often land around 4-6.",
    },
    {
        key: "acRemoteRejectionShare",
        label: "District cooling share",
        min: 0,
        max: 1,
        step: 0.01,
        unit: "%",
        help: "Share of cooling served by a district network or remote rejection, so its heat leaves the local canyon instead of warming canyon air. 0% means local condensers; 100% means all AC rejection is outside the modeled street.",
    },
    {
        key: "acStart",
        label: "AC starts",
        min: 0,
        max: 23,
        step: 1,
        unit: ":00",
        help: "Hour when scheduled cooling begins. Use 0 with AC ends 24 for full-day operation.",
    },
    {
        key: "acEnd",
        label: "AC ends",
        min: 1,
        max: 24,
        step: 1,
        unit: ":00",
        help: "Hour when scheduled cooling stops. Values earlier than start represent overnight schedules.",
    },
];

const state: Inputs = { ...defaults };
const themeStorageKey = "clim-theme";
const urlParams = new URLSearchParams(window.location.search);
initLanguage(urlParams);

const readTheme = (): ThemeMode => {
    const paramTheme = urlParams.get("theme");
    if (paramTheme === "system" || paramTheme === "dark" || paramTheme === "light") return paramTheme;
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === "system" || storedTheme === "dark" || storedTheme === "light") return storedTheme;
    return "system";
};
let themeMode: ThemeMode = readTheme();
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme() {
    const effectiveTheme = themeMode === "system" ? (systemDarkQuery.matches ? "dark" : "light") : themeMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
}

function relativeStateUrl(): string {
    const params = new URLSearchParams();
    if (getLanguage() !== "fr") params.set("lang", getLanguage());
    if (themeMode !== "system") params.set("theme", themeMode);
    for (const control of controls) {
        const value = state[control.key];
        if (value !== defaults[control.key]) params.set(control.key, String(value));
    }
    const query = params.toString();
    return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

function updateUrlParams() {
    window.history.replaceState(null, "", relativeStateUrl());
}

function readStateFromUrl() {
    for (const control of controls) {
        const rawValue = urlParams.get(control.key);
        if (rawValue === null) continue;
        const value = Number(rawValue);
        if (!Number.isFinite(value)) continue;
        state[control.key] = Math.min(control.max, Math.max(control.min, value));
    }
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
    throw new Error("Missing app root");
}

readStateFromUrl();

app.innerHTML = `
  <section class="hero">
    <div class="topbar" aria-label="Display preferences">
      <button class="toggleButton" id="languageToggle" type="button"></button>
      <button class="toggleButton" id="themeToggle" type="button"></button>
    </div>
    <div>
      <p class="eyebrow" data-i18n="Interactive urban heat model">Interactive urban heat model</p>
      <h1 data-i18n="How much does AC heat up cities?">How much does AC heat up cities?</h1>
      <p class="lede" data-i18n="Compare a no-AC city block with an air-conditioned block during a heat wave. The model tracks indoor comfort, waste heat, stored heat, and how much of it reaches the street canyon and city air.">
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
            <h2 data-i18n="Building and canyon temperatures">Building and canyon temperatures</h2>
            <p data-i18n="Click a legend entry to show or hide that line. Canyon, indoor, and neutral air are shown by default; surface temperatures can be toggled on.">Click a legend entry to show or hide that line. Canyon, indoor, and neutral air are shown by default; surface temperatures can be toggled on.</p>
          </div>
          <div class="legend" id="tempLegend"></div>
        </div>
        <svg id="tempChart" viewBox="0 0 980 430" role="img" aria-label="Building and canyon temperature line chart"></svg>
      </div>
      <div class="chartPanel schematicPanel">
        <div class="chartHeader">
          <div>
            <h2 data-i18n="How the model works">How the model works</h2>
            <p data-i18n="A simplified heat-network model. Roofs, walls, street, indoor air, canyon air, and city air are nodes with thermal capacity; solar, longwave, convective, and conductive links move energy between them, while AC rejects heat into the canyon. It is not a full urban climate model, but it is internally consistent for comparing scenarios.">A simplified heat-network model. Roofs, walls, street, indoor air, canyon air, and city air are nodes with thermal capacity; solar, longwave, convective, and conductive links move energy between them, while AC rejects heat into the canyon. It is not a full urban climate model, but it is internally consistent for comparing scenarios.</p>
          </div>
        </div>
        <div id="schematic"></div>
      </div>
      <div class="metricGrid" id="metrics"></div>
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2 data-i18n="Heat released to street air">Heat released to street air</h2>
            <p data-i18n="Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy. Incident solar can be toggled on.">Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy. Incident solar can be toggled on.</p>
          </div>
          <div class="legend" id="fluxLegend"></div>
        </div>
        <svg id="fluxChart" viewBox="0 0 980 300" role="img" aria-label="Heat flux line chart"></svg>
      </div>
      <section class="notes">
        <h2 data-i18n="What drives the warming?">What drives the warming?</h2>
        <p data-i18n="The city impact depends on when AC runs, how efficiently it rejects heat, how strongly the canyon mixes, and whether cooled buildings avoid storing heat that would otherwise be released later.">
          The city impact depends on when AC runs, how efficiently it rejects heat, how strongly the canyon mixes,
          and whether cooled buildings avoid storing heat that would otherwise be released later.
        </p>
        <p data-i18n="This is an energy-balance sketch, not a full urban canopy model. Use it to compare directions and parameter sensitivity before moving to a coupled building-energy and urban-meteorology model.">
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
const languageToggle = requiredElement<HTMLButtonElement>("#languageToggle");
const themeToggle = requiredElement<HTMLButtonElement>("#themeToggle");
const tempChart = requiredElement<SVGSVGElement>("#tempChart");
const fluxChart = requiredElement<SVGSVGElement>("#fluxChart");
const tempLegend = requiredElement<HTMLDivElement>("#tempLegend");
const fluxLegend = requiredElement<HTMLDivElement>("#fluxLegend");
const schematicEl = requiredElement<HTMLDivElement>("#schematic");

const presets: Array<{ label: string; values: Partial<Inputs> }> = [
    {
        label: "Paris · solstice",
        values: {
            latitude: 48.85,
            dayOfYear: 172,
            buildingCoverage: 0.55,
            floorCount: 6,
            dayVentilation: 60,
            nightVentilation: 45,
        },
    },
    {
        label: "Paris · August",
        values: {
            latitude: 48.85,
            dayOfYear: 213,
            buildingCoverage: 0.55,
            floorCount: 6,
            dayVentilation: 60,
            nightVentilation: 45,
        },
    },
    {
        label: "Hong Kong · high-rise",
        values: {
            latitude: 22.32,
            dayOfYear: 172,
            buildingCoverage: 0.58,
            floorCount: 22,
            dayVentilation: 60,
            nightVentilation: 45,
            cityAirDepth: 300,
            clearSkyClarity: 0.68,
            skyDepression: 7,
        },
    },
];

const presetRow = document.createElement("div");
presetRow.className = "presets";
for (const preset of presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "presetButton";
    button.dataset.preset = preset.label;
    button.textContent = preset.label;
    button.addEventListener("click", () => {
        Object.assign(state, defaults);
        Object.assign(state, preset.values);
        updateUrlParams();
        render();
    });
    presetRow.append(button);
}
controlsEl.append(presetRow);
const shareButton = document.createElement("button");
shareButton.type = "button";
shareButton.className = "shareButton";
shareButton.textContent = t("Share");
controlsEl.append(shareButton);

// AC schedule and thermostat are the parameters most worth tweaking, so they lead; the
// fabric/geometry/weather knobs are trickier to reason about and sit behind a disclosure.
const primaryKeys: Array<keyof Inputs> = [
    "acStart",
    "acEnd",
    "acDaySetpoint",
    "acNightSetpoint",
    "acCop",
    "acRemoteRejectionShare",
];

function buildControlField(control: (typeof controls)[number]): HTMLLabelElement {
    const id = `control-${control.key}`;
    const field = document.createElement("label");
    field.className = "control";
    field.htmlFor = id;
    field.innerHTML = `
    <span>
      <strong data-control-label="${control.key}">${control.label}</strong>
      <small data-control-help="${control.key}">${control.help}</small>
    </span>
    <output id="${id}-value"></output>
    <input id="${id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${state[control.key]}" />
  `;
    const input = field.querySelector<HTMLInputElement>("input");
    input?.addEventListener("input", () => {
        state[control.key] = Number(input.value);
        updateUrlParams();
        render();
    });
    return field;
}

const primaryControls = primaryKeys
    .map((key) => controls.find((control) => control.key === key))
    .filter((control): control is (typeof controls)[number] => control !== undefined);
const advancedControls = controls.filter((control) => !primaryKeys.includes(control.key));

for (const control of primaryControls) controlsEl.append(buildControlField(control));

const advancedToggle = document.createElement("button");
advancedToggle.type = "button";
advancedToggle.className = "advancedToggle";
advancedToggle.setAttribute("aria-expanded", "false");
advancedToggle.textContent = t("Advanced parameters");

const advancedSection = document.createElement("div");
advancedSection.className = "advancedSection";
advancedSection.hidden = true;
for (const control of advancedControls) advancedSection.append(buildControlField(control));

advancedToggle.addEventListener("click", () => {
    const opening = advancedSection.hidden;
    advancedSection.hidden = !opening;
    advancedToggle.setAttribute("aria-expanded", String(opening));
    advancedToggle.textContent = opening ? t("Hide advanced parameters") : t("Advanced parameters");
});

controlsEl.append(advancedToggle);
controlsEl.append(advancedSection);

languageToggle.addEventListener("click", () => {
    setLanguage(getLanguage() === "en" ? "fr" : "en");
    updateUrlParams();
    render();
});

shareButton.addEventListener("click", async () => {
    updateUrlParams();
    const url = relativeStateUrl();
    await navigator.clipboard.writeText(url);
    shareButton.textContent = t("Copied");
    window.setTimeout(() => {
        shareButton.textContent = t("Share");
    }, 1400);
});

themeToggle.addEventListener("click", () => {
    const currentTheme = themeMode === "system" ? (systemDarkQuery.matches ? "dark" : "light") : themeMode;
    themeMode = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(themeStorageKey, themeMode);
    updateUrlParams();
    applyTheme();
    renderChrome();
});

systemDarkQuery.addEventListener("change", () => {
    if (themeMode !== "system") return;
    applyTheme();
    renderChrome();
});

type ChartSeries = { key: keyof Point; className: string; label: string };

// Temperature chart: canyon/indoor/neutral shown by default, surfaces toggled on.
const tempSeries: ChartSeries[] = [
    { key: "noAcOutdoor", className: "noAc", label: "No AC canyon" },
    { key: "dayAcOutdoor", className: "dayAc", label: "AC canyon" },
    { key: "noAcMass", className: "noAcMass", label: "No AC indoor" },
    { key: "dayAcMass", className: "dayAcMass", label: "AC indoor" },
    { key: "weather", className: "weather", label: "Neutral air" },
    { key: "noAcCityAir", className: "noAcCityAir", label: "No AC city air" },
    { key: "dayAcCityAir", className: "dayAcCityAir", label: "AC city air" },
    { key: "noAcFacade", className: "noAcFacade", label: "No AC facade (sun)" },
    { key: "dayAcFacade", className: "dayAcFacade", label: "AC facade (sun)" },
    { key: "noAcRoof", className: "noAcRoof", label: "No AC roof" },
    { key: "dayAcRoof", className: "dayAcRoof", label: "AC roof" },
    { key: "noAcFabric", className: "noAcFabric", label: "No AC street" },
    { key: "dayAcFabric", className: "dayAcFabric", label: "AC street" },
];
const hiddenTemp = new Set<string>([
    "weather",
    "noAcCityAir",
    "dayAcCityAir",
    "noAcFacade",
    "dayAcFacade",
    "noAcRoof",
    "dayAcRoof",
    "noAcFabric",
    "dayAcFabric",
]);

// Flux chart: heat released to the canyon, plus incident solar (off by default).
const fluxSeries: ChartSeries[] = [
    { key: "noAcFlux", className: "noAc", label: "No AC facade" },
    { key: "noAcFabricFlux", className: "noAcFabric", label: "No AC street" },
    { key: "noAcWindowFlux", className: "noAcWindow", label: "No AC windows" },
    { key: "dayAcFlux", className: "dayAc", label: "AC facade" },
    { key: "dayAcFabricFlux", className: "dayAcFabric", label: "AC street" },
    { key: "dayAcWindowFlux", className: "dayAcWindow", label: "AC windows" },
    { key: "dayAcWaste", className: "waste", label: "AC rejection" },
    { key: "solarRoof", className: "solarRoof", label: "Solar roof" },
    { key: "solarStreet", className: "solarStreet", label: "Solar street" },
    { key: "solarWall", className: "solarWall", label: "Solar wall" },
    { key: "solarIndoor", className: "solarIndoor", label: "Solar indoor" },
];
const hiddenFlux = new Set<string>(["solarRoof", "solarStreet", "solarWall", "solarIndoor"]);

let lastPoints: Point[] = [];

function formatDayTick(hour: number): string {
    return `${t("D")}${Math.floor(hour / 24) + 1}`;
}

function formatEndTick(hour: number): string {
    const localHour = Math.round(hour % 24);
    if (localHour === 0) return t("End");
    return `${t("End")} ${String(localHour).padStart(2, "0")}:00`;
}

function drawChart(
    svg: SVGSVGElement,
    legendEl: HTMLElement,
    points: Point[],
    series: ChartSeries[],
    hidden: Set<string>,
    yLabel: string,
) {
    const width = 980;
    const height = svg.viewBox.baseVal.height;
    const pad = { top: 28, right: 28, bottom: 42, left: 62 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const firstHour = points[0]?.hour ?? 0;
    const lastHour = points.at(-1)?.hour ?? simulationHours;
    const duration = Math.max(1, lastHour - firstHour);
    const visible = series.filter((item) => !hidden.has(item.key as string));
    // Scale to the visible lines so hiding a hot surface zooms back in; fall back to all.
    const scaleSeries = visible.length > 0 ? visible : series;
    const yValues = scaleSeries.flatMap((item) => points.map((point) => Number(point[item.key])));
    const yMin = Math.floor(Math.min(...yValues) - 1);
    const yMax = Math.ceil(Math.max(...yValues) + 1);
    const xScale = (hour: number) => pad.left + ((hour - firstHour) / duration) * plotWidth;
    const yScale = (value: number) => pad.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
    const grid = Array.from({ length: 6 }, (_, index) => yMin + ((yMax - yMin) * index) / 5);
    const dayTicks = Array.from({ length: Math.floor(lastHour / 24) + 1 }, (_, index) => index * 24);
    const xTicks = dayTicks.at(-1) === lastHour ? dayTicks : [...dayTicks, lastHour];

    svg.innerHTML = `
    <rect class="chartBg" x="0" y="0" width="${width}" height="${height}" />
    ${grid
        .map(
            (tick) => `
      <line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${yScale(tick)}" y2="${yScale(tick)}" />
      <text class="axisText" x="${pad.left - 12}" y="${yScale(tick) + 4}" text-anchor="end">${tick.toFixed(0)}</text>`,
        )
        .join("")}
    ${xTicks
        .map(
            (tick) => `
      <line class="grid vertical" x1="${xScale(tick)}" x2="${xScale(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" />
      <text class="axisText" x="${xScale(tick)}" y="${height - 16}" text-anchor="middle">${tick === lastHour ? formatEndTick(tick) : formatDayTick(tick)}</text>`,
        )
        .join("")}
    <text class="axisLabel" x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})">${yLabel}</text>
    ${visible
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

    legendEl.innerHTML = series
        .map((item) => {
            const off = hidden.has(item.key as string) ? " off" : "";
            return `<span class="legendItem${off}" data-key="${item.key}" role="button" tabindex="0"><i class="${item.className}"></i><span>${t(item.label)}</span></span>`;
        })
        .join("");
}

function drawCharts() {
    drawChart(tempChart, tempLegend, lastPoints, tempSeries, hiddenTemp, "C");
    drawChart(fluxChart, fluxLegend, lastPoints, fluxSeries, hiddenFlux, "W/m2");
}

function wireLegend(legendEl: HTMLElement, hidden: Set<string>) {
    legendEl.addEventListener("click", (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>("[data-key]");
        const key = target?.dataset.key;
        if (!key) return;
        if (hidden.has(key)) hidden.delete(key);
        else hidden.add(key);
        drawCharts();
    });
}

wireLegend(tempLegend, hiddenTemp);
wireLegend(fluxLegend, hiddenFlux);

function renderMetrics(summary: ReturnType<typeof summarize>) {
    const signedValue = (value: number, digits = 2) => `${value >= 0 ? "+" : ""}${formatNumber(value, digits)} C`;
    metricsEl.innerHTML = [
        [
            "Night average delta",
            signedValue(summary.nightDelta),
            "AC scenario minus no-AC scenario for street-canyon air.",
        ],
        ["Worst night delta", signedValue(summary.worstNightDelta), "Peak nighttime penalty or benefit."],
        ["AC-hour outdoor delta", signedValue(summary.dayDelta), "Expected heat rejection cost while AC runs."],
        [
            "Night indoor delta",
            signedValue(summary.nightMassDelta),
            "How much cooler the indoor/operative node remains.",
        ],
        [
            "Mean AC waste heat",
            `${formatNumber(summary.wasteHeat, 0)} W/m2`,
            "Rejected cooling load plus compressor power per land area.",
        ],
        [
            "Sunlit facade peak",
            `${formatNumber(summary.sunlitFacadePeak, 1)} C`,
            "Hottest sunlit wall surface, no-AC case.",
        ],
        [
            "Shaded facade peak",
            `${formatNumber(summary.shadedFacadePeak, 1)} C`,
            "Shaded walls stay cooler and can sink canyon heat, no-AC case.",
        ],
        [
            "Roof peak",
            `${formatNumber(summary.roofPeak, 1)} C`,
            "Roof surface temperature in the no-AC case; it exchanges with city air, not canyon air.",
        ],
        [
            "No-AC window heat",
            `${formatNumber(summary.noAcWindowHeat, 0)} W/m2`,
            "Mean direct indoor heat release through open windows.",
        ],
        [
            "AC-case window heat",
            `${formatNumber(summary.dayAcWindowHeat, 0)} W/m2`,
            "Mean window release during hours when AC is off.",
        ],
        [
            "Max AC extraction",
            `${formatNumber(summary.acCapacityLand, 0)} W/m2`,
            "Cooling capacity converted from floor area to land area.",
        ],
        [
            "Max AC rejection",
            `${formatNumber(summary.acMaxRejection, 0)} W/m2`,
            "Outdoor heat at full load, including compressor energy.",
        ],
        [
            "Roof noon solar",
            `${formatNumber(summary.peakRoofSolar, 0)} W/m2`,
            "Peak roof shortwave per land area after the fixed solar budget split.",
        ],
        [
            "Wall noon solar",
            `${formatNumber(summary.peakWallSolar, 0)} W/m2`,
            "Peak sunlit-wall absorbed shortwave per land area, after indoor transmission.",
        ],
        [
            "Street noon solar",
            `${formatNumber(summary.peakStreetSolar, 0)} W/m2`,
            "Peak street shortwave per land area after canyon shading.",
        ],
        [
            "Indoor noon solar",
            `${formatNumber(summary.peakIndoorSolar, 0)} W/m2`,
            "Peak transmitted solar gain per land area.",
        ],
        [
            "Roof surface solar",
            `${formatNumber(summary.peakRoofSolarPerArea, 0)} W/m2`,
            "Peak roof shortwave per square meter of roof.",
        ],
        [
            "Wall surface solar",
            `${formatNumber(summary.peakWallSolarPerArea, 0)} W/m2`,
            "Peak absorbed shortwave per square meter of sunlit wall.",
        ],
        [
            "Street surface solar",
            `${formatNumber(summary.peakStreetSolarPerArea, 0)} W/m2`,
            "Peak shortwave per square meter of street surface.",
        ],
        [
            "Solar split total",
            `${formatNumber(summary.splitSolarTotal, 0)} W/m2`,
            "Roof + wall + street + indoor equals the fixed peak solar input.",
        ],
        [
            "Sunlit wall area",
            `${formatNumber(summary.sunlitWallShare * 100, 0)}%`,
            "Share of total wall area lit at the selected wall sun angle.",
        ],
        ["Wall sky view", formatNumber(summary.wallSkyView, 2), "Wall view of sky; lower in deeper canyons."],
        [
            "Roof sky view",
            formatNumber(summary.roofSkyView, 2),
            "Roof view of sky; roofs are exposed above the canopy.",
        ],
        [
            "Street sky view",
            formatNumber(summary.roadSkyView, 2),
            "Street-floor view of sky; collapses toward 0 in deep canyons.",
        ],
        [
            "Wall net longwave",
            `${formatNumber(summary.wallNetLongwave, 0)} W/m2`,
            "Clear-night wall radiative loss per exposed surface at the set sky depression.",
        ],
        [
            "Roof net longwave",
            `${formatNumber(summary.roofNetLongwave, 0)} W/m2`,
            "Clear-night roof radiative loss per exposed surface at the set sky depression.",
        ],
        [
            "Street net longwave",
            `${formatNumber(summary.streetNetLongwave, 0)} W/m2`,
            "Street-floor radiative loss per exposed surface at the set sky depression.",
        ],
        ["Implied FAR", formatNumber(summary.floorAreaRatio, 1), "Building coverage times floor count."],
        ["Building height", `${formatNumber(summary.buildingHeight, 0)} m`, "Floor count times 3 m per floor."],
        [
            "Street width",
            `${formatNumber(summary.streetWidth, 1)} m`,
            "Representative pitch width times the unbuilt street/open fraction.",
        ],
        [
            "Derived H/W",
            formatNumber(summary.derivedCanyonAspectRatio, 2),
            "Building height divided by derived street width.",
        ],
        [
            "Canyon air depth",
            `${formatNumber(summary.canyonDepth, 0)} m`,
            "Canopy depth, set by building height; sets canyon air heat capacity.",
        ],
        [
            "Indoor / canyon capacity",
            `${formatNumber(summary.indoorCapacityRatio, 0)}x`,
            "Indoor heat capacity relative to the modeled canyon air.",
        ],
        [
            "Facade / canyon capacity",
            `${formatNumber(summary.facadeCapacityRatio, 0)}x`,
            "Wall heat capacity relative to the modeled canyon air.",
        ],
        [
            "Roof / canyon capacity",
            `${formatNumber(summary.roofCapacityRatio, 0)}x`,
            "Roof heat capacity relative to the modeled canyon air.",
        ],
        [
            "Street / canyon capacity",
            `${formatNumber(summary.outdoorCapacityRatio, 0)}x`,
            "Outdoor fabric storage relative to the modeled canyon air.",
        ],
        [
            "City air / canyon capacity",
            `${formatNumber(summary.cityAirCapacityRatio, 0)}x`,
            "Broader mixed air reservoir relative to canyon air.",
        ],
        [
            "Indoor time constant",
            `${formatNumber(summary.indoorTimeConstant, 1)} h`,
            "Near-equilibrium indoor-to-facade exchange timescale.",
        ],
        [
            "Facade time constant",
            `${formatNumber(summary.facadeTimeConstant, 1)} h`,
            "Near-equilibrium wall-to-canyon exchange timescale.",
        ],
        [
            "Roof time constant",
            `${formatNumber(summary.roofTimeConstant, 1)} h`,
            "Near-equilibrium roof-to-city-air exchange timescale.",
        ],
        [
            "Street time constant",
            `${formatNumber(summary.outdoorTimeConstant, 1)} h`,
            "Street fabric-to-canyon exchange timescale.",
        ],
        [
            "Day canyon exchange",
            `${formatNumber(summary.dayCanyonCityTimeConstant, 1)} h`,
            "Daytime canyon air exchange timescale to city air.",
        ],
        [
            "Night canyon exchange",
            `${formatNumber(summary.nightCanyonCityTimeConstant, 1)} h`,
            "Nighttime canyon air exchange timescale to city air.",
        ],
        [
            "City flushing time",
            `${formatNumber(summary.cityAirTimeConstant, 1)} h`,
            "Broader city air exchange timescale to neutral weather.",
        ],
        [
            "Day / night exchange",
            `${formatNumber(summary.mixingRatio, 1)}x`,
            "Strength of the canyon-city exchange contrast.",
        ],
    ]
        .map(
            ([label, value, note]) => `
      <article class="metric">
        <span>${t(label)}</span>
        <strong>${value}</strong>
        <small>${t(note)}</small>
      </article>`,
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
        const value = control.unit === "%" ? Number(state[control.key]) * 100 : Number(state[control.key]);
        output.textContent = `${formatNumber(value, control.step < 1 && control.unit !== "%" ? 2 : 0)}${control.unit}`;
    }
}

function renderChrome() {
    document.documentElement.lang = getLanguage();
    document.title = t("How much does AC heat up cities?");
    controlsEl.ariaLabel = t("Simulation controls");
    tempChart.setAttribute("aria-label", t("Building and canyon temperature line chart"));
    fluxChart.setAttribute("aria-label", t("Heat flux line chart"));
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        if (key) element.textContent = t(key);
    });
    for (const control of controls) {
        const label = document.querySelector<HTMLElement>(`[data-control-label="${control.key}"]`);
        const help = document.querySelector<HTMLElement>(`[data-control-help="${control.key}"]`);
        if (label) label.textContent = t(control.label);
        if (help) help.textContent = t(control.help);
    }
    advancedToggle.textContent =
        advancedToggle.getAttribute("aria-expanded") === "true"
            ? t("Hide advanced parameters")
            : t("Advanced parameters");
    languageToggle.textContent = getLanguage() === "en" ? "FR" : "EN";
    languageToggle.ariaLabel = `${t("Language")}: ${languageNames[getLanguage()]}`;
    languageToggle.title = `${t("Language")}: ${languageNames[getLanguage()]}`;
    shareButton.textContent = t("Share");
    shareButton.ariaLabel = t("Share");
    shareButton.title = t("Share");
    const effectiveTheme = themeMode === "system" ? (systemDarkQuery.matches ? "dark" : "light") : themeMode;
    themeToggle.textContent = t(effectiveTheme === "dark" ? "Light" : "Dark");
    themeToggle.ariaLabel = t(effectiveTheme === "dark" ? "Use light mode" : "Use dark mode");
    themeToggle.title = themeToggle.ariaLabel;
}

function render() {
    schematicEl.innerHTML = schematicMarkup(state);
    renderChrome();
    renderControlValues();
    lastPoints = simulate(state);
    renderMetrics(summarize(lastPoints, state));
    drawCharts();
}

applyTheme();
render();
