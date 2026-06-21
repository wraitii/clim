// Physics: pure energy-balance model. No DOM, no i18n.

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
    latitude: number;
    dayOfYear: number;
    clearSkyClarity: number;
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
    solarRoof: number;
    solarStreet: number;
    solarWall: number;
    solarIndoor: number;
};
const neighborhoodPitchWidth = 24;
const floorHeight = 3;
// Linearized net-longwave coefficient 4*emissivity*sigma*T^3 at ~300 K, in W/m2/K.
const longwaveCoefficient = 5.5;
const minAreaIndex = 1e-6;
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
    latitude: 48.85,
    dayOfYear: 172,
    clearSkyClarity: 0.75,
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
    nightVentilation: 60,
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
// Real compressor COP degrades as the condenser rejects into hotter outdoor air. The
// nameplate `acCop` slider is the rated value at copRatedCondenser; effective COP falls
// ~copDerate per degree above it and rises below it, following typical manufacturer
// derating curves. This is the key urban feedback: a hot canyon lowers COP, which raises
// rejected heat, which warms the canyon further. It also redistributes the AC penalty
// toward hot afternoons and relieves it on cool nights.
const copRatedCondenser = 35;
const copDerate = 0.025;
const copMin = 1.2;
// Solar geometry. Intensity and the roof/wall/street split are derived from latitude and
// day-of-year via the live solar elevation, instead of a fixed budget at a frozen angle.
const solarConstant = 1361; // W/m2 extraterrestrial normal irradiance
const groundAbsorptance = 0.8; // 1 - albedo: folds reflection into the absorbed budget
// Diurnal air temperature (Parton-Logan): a sine rise to a peak lagged past solar noon,
// then exponential decay through the night to the sunrise minimum. Tied to the same
// sunrise/sunset the solar model derives, so the curve tracks day length and season.
const peakTempLagHours = 1.5; // Tmax lags solar noon
const nightDecayCoefficient = 2.2; // nocturnal cooling rate
// Solar declination for the day of year (Cooper), in radians.
function solarDeclination(inputs: Inputs): number {
    return ((23.45 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + inputs.dayOfYear)) / 365);
}

// sin(solar elevation); negative when the sun is below the horizon. Clock time is treated
// as local solar time (no longitude/equation-of-time correction at this fidelity).
function solarElevationSin(hour: number, inputs: Inputs): number {
    const local = ((hour % 24) + 24) % 24;
    const hourAngle = ((local - 12) * 15 * Math.PI) / 180;
    const lat = (inputs.latitude * Math.PI) / 180;
    const dec = solarDeclination(inputs);
    return Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle);
}

// Half-day-length in degrees of hour angle; sunrise/sunset are solar noon -/+ this.
function daylightHalfAngleDeg(inputs: Inputs): number {
    const lat = (inputs.latitude * Math.PI) / 180;
    const dec = solarDeclination(inputs);
    const cosH0 = -Math.tan(lat) * Math.tan(dec);
    if (cosH0 <= -1) return 180; // polar day
    if (cosH0 >= 1) return 0; // polar night
    return (Math.acos(cosH0) * 180) / Math.PI;
}

function sunriseHour(inputs: Inputs): number {
    return 12 - daylightHalfAngleDeg(inputs) / 15;
}

function sunsetHour(inputs: Inputs): number {
    return 12 + daylightHalfAngleDeg(inputs) / 15;
}

// Clear-sky shortwave on a horizontal surface (W/m2), before albedo. Beam only: a simple
// Kasten-Young air mass with a bulk atmospheric transmittance (the clarity knob).
function clearSkyHorizontal(hour: number, inputs: Inputs): number {
    const sinh = solarElevationSin(hour, inputs);
    if (sinh <= 0) return 0;
    const elevDeg = (Math.asin(Math.min(1, sinh)) * 180) / Math.PI;
    const airMass = 1 / (sinh + 0.50572 * Math.pow(elevDeg + 6.07995, -1.6364));
    const eccentricity = 1 + 0.033 * Math.cos((2 * Math.PI * inputs.dayOfYear) / 365);
    const dni = solarConstant * eccentricity * Math.pow(inputs.clearSkyClarity, airMass);
    return dni * sinh;
}

// Asymmetric diurnal air temperature (Parton-Logan), driven by the derived sunrise/sunset.
function dailyTemperature(hour: number, low: number, high: number, inputs: Inputs): number {
    const local = ((hour % 24) + 24) % 24;
    const rise = sunriseHour(inputs);
    const set = sunsetHour(inputs);
    const dayLength = Math.max(0.001, set - rise);
    const denom = dayLength + 2 * peakTempLagHours;
    const sunsetTemp = low + (high - low) * Math.sin((Math.PI * dayLength) / denom);
    if (local > rise && local < set) {
        return low + (high - low) * Math.sin((Math.PI * (local - rise)) / denom);
    }
    const nightLength = Math.max(0.001, 24 - dayLength);
    let sinceSunset = local - set;
    if (sinceSunset < 0) sinceSunset += 24;
    const b = nightDecayCoefficient;
    // Normalized so T = sunsetTemp at sunset and T = low at the next sunrise.
    const decay = (Math.exp((-b * sinceSunset) / nightLength) - Math.exp(-b)) / (1 - Math.exp(-b));
    return low + (sunsetTemp - low) * decay;
}

function weatherTemp(hour: number, inputs: Inputs): number {
    const progress = Math.min(1, hour / heatRampHours);
    const low = inputs.startLow + (inputs.endLow - inputs.startLow) * progress;
    const high = inputs.startHigh + (inputs.endHigh - inputs.startHigh) * progress;
    return dailyTemperature(hour, low, high, inputs);
}

function acSetpointForHour(hour: number, inputs: Inputs): number {
    return solarElevationSin(hour, inputs) > 0 ? inputs.acDaySetpoint : inputs.acNightSetpoint;
}

// Effective COP at the current condenser (canyon) air temperature, derated linearly from
// the rated value. Clamped below so an extreme canyon never drives it to nonsense.
function effectiveCop(ratedCop: number, condenserTemp: number): number {
    const derated = ratedCop * (1 - copDerate * (condenserTemp - copRatedCondenser));
    return Math.max(copMin, derated);
}

function canyonCityConductance(hour: number, inputs: Inputs): number {
    const noon = Math.max(0.001, solarElevationSin(12, inputs));
    const sun = Math.min(1, Math.max(0, solarElevationSin(hour, inputs)) / noon);
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

// Beam projection onto horizontal (roof/street) and vertical (wall) surfaces, from the
// live solar elevation: horizontal ~ sin(elevation), vertical ~ cos(elevation).
function sunComponents(sinElevation: number): { horizontal: number; vertical: number } {
    const s = Math.min(1, Math.max(0, sinElevation));
    return {
        horizontal: Math.max(0.01, s),
        vertical: Math.max(0.01, Math.sqrt(1 - s * s)),
    };
}

// Absorbed shortwave per m2 land at `hour`, split across roof, street, exterior wall, and
// indoor. Both the magnitude (clear-sky horizontal) and the partition (via the live
// elevation) vary through the day, so low morning/evening sun favours walls and high noon
// sun favours roof and street.
function solarSplit(hour: number, inputs: Inputs): { roof: number; street: number; wallExterior: number; indoor: number } {
    const budget = clearSkyHorizontal(hour, inputs) * groundAbsorptance;
    if (budget <= 0) return { roof: 0, street: 0, wallExterior: 0, indoor: 0 };
    const { road: roadSkyView } = skyViewFactors(inputs);
    const { horizontal, vertical } = sunComponents(solarElevationSin(hour, inputs));
    const roofWeight = inputs.buildingCoverage * horizontal;
    const canyonOpeningWeight = 1 - inputs.buildingCoverage;
    const streetWeight = canyonOpeningWeight * roadSkyView * horizontal;
    const wallWeight = canyonOpeningWeight * (1 - roadSkyView) * vertical;
    const totalWeight = Math.max(minAreaIndex, roofWeight + streetWeight + wallWeight);
    const roof = budget * (roofWeight / totalWeight);
    const street = budget * (streetWeight / totalWeight);
    const wallIncident = budget * (wallWeight / totalWeight);
    const indoor = wallIncident * inputs.indoorSolarFraction;
    const wallExterior = wallIncident - indoor;
    return {
        roof,
        street,
        wallExterior,
        indoor,
    };
}

// Frozen at solar noon: the sunlit/shaded wall areas set the lumped wall capacities, which
// cannot migrate between nodes mid-run, even though the incident solar above varies hourly.
function sunlitWallFraction(inputs: Inputs): number {
    const { horizontal, vertical } = sunComponents(solarElevationSin(12, inputs));
    const sunlitHeightFraction = Math.min(1, horizontal / (vertical * canyonAspectRatio(inputs)));
    return 0.5 * sunlitHeightFraction;
}

function gradientAdjustedConductance(baseConductance: number, deltaC: number): number {
    const multiplier = Math.pow(1 + Math.abs(deltaC) / gradientHeatTransferReference, 1 / 3);
    return baseConductance * Math.min(maxGradientConductanceMultiplier, multiplier);
}

function simulateScenario(inputs: Inputs, scenario: ScenarioName): Omit<Point, "hour" | "weather">[] {
    const steps = Math.round(simulationHours / dtHours);
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
        const sunlitToCanyon =
            gradientAdjustedConductance(sunlitExteriorConductance, facadeSunlitTemp - canyonTemp) *
            (facadeSunlitTemp - canyonTemp);
        const shadedToCanyon =
            gradientAdjustedConductance(shadedExteriorConductance, facadeShadedTemp - canyonTemp) *
            (facadeShadedTemp - canyonTemp);
        const passiveFlux = sunlitToCanyon + shadedToCanyon;
        const fabricFlux =
            gradientAdjustedConductance(outdoorConductance, fabricTemp - canyonTemp) * (fabricTemp - canyonTemp);
        const sunlitToIndoor =
            gradientAdjustedConductance(sunlitEnvelopeConductance, facadeSunlitTemp - indoorTemp) *
            (facadeSunlitTemp - indoorTemp);
        const shadedToIndoor =
            gradientAdjustedConductance(shadedEnvelopeConductance, facadeShadedTemp - indoorTemp) *
            (facadeShadedTemp - indoorTemp);
        const roofToIndoor =
            gradientAdjustedConductance(roofIndoorConductance, roofTemp - indoorTemp) * (roofTemp - indoorTemp);
        const envelopeFlux = sunlitToIndoor + shadedToIndoor + roofToIndoor;
        const roofToCity =
            gradientAdjustedConductance(roofCityConductance, roofTemp - cityAirTemp) * (roofTemp - cityAirTemp);
        const acScheduled = scenario === "dayAc" && isAcOn(hour, inputs);
        acEngagement += ((acScheduled ? 1 : 0) - acEngagement) * (1 - Math.exp(-dtHours / acRampHours));
        const targetWindowOpening = !acScheduled && canyonTemp < indoorTemp ? 1 : 0;
        const windowResponse = 1 - Math.exp(-dtHours / windowResponseHours);
        windowOpening += (targetWindowOpening - windowOpening) * windowResponse;
        const windowHeatToIndoor =
            windowOpening * inputs.openWindowConductance * far * Math.min(0, canyonTemp - indoorTemp);
        const windowHeatToCanyon = -windowHeatToIndoor;
        const solar = solarSplit(hour, inputs);
        const indoorSolarGains = solar.indoor;
        const exteriorSolarGains = solar.wallExterior;
        const streetSolarGains = solar.street;
        const roofSolarGains = solar.roof;
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
            const needed = ((indoorTemp - acSetpoint) * indoorCapacity) / acResponseHours;
            const maxCapacity = inputs.acCapacity * far;
            cooling = Math.min(needed, maxCapacity) * acEngagement;
            waste = cooling * (1 + 1 / effectiveCop(inputs.acCop, canyonTemp));
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
            dayAcFabricFlux: scenario === "dayAc" ? fabricFlux : 0,
            // Incident solar is scenario-independent; reported for both runs.
            solarRoof: roofSolarGains,
            solarStreet: streetSolarGains,
            solarWall: exteriorSolarGains,
            solarIndoor: indoorSolarGains,
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
            dayAcFabricFlux: dayAc[index].dayAcFabricFlux,
            solarRoof: row.solarRoof,
            solarStreet: row.solarStreet,
            solarWall: row.solarWall,
            solarIndoor: row.solarIndoor,
        };
    });
}

function summarize(points: Point[], inputs: Inputs) {
    const night = points.filter((point) => {
        const local = point.hour % 24;
        return local >= 21 || local <= 6;
    });
    const day = points.filter((point) => {
        return isAcOn(point.hour, inputs);
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
    const canyonDepth = canyonDepthFromFloors(inputs);
    const buildingHeight = buildingHeightFromFloors(inputs);
    const streetWidth = streetWidthFromCoverage(inputs);
    const derivedCanyonAspectRatio = canyonAspectRatio(inputs);
    const far = floorAreaRatio(inputs);
    const canyonHeatCapacity = 0.335 * canyonDepth;
    const cityAirCapacity = 0.335 * inputs.cityAirDepth;
    const indoorCapacity = inputs.thermalMass * far;
    const streetAreaIndex = Math.max(minAreaIndex, 1 - inputs.buildingCoverage);
    const outdoorCapacity = inputs.outdoorThermalMass * streetAreaIndex;
    const facadeAreaIndex = far * (0.55 + inputs.buildingCoverage * 0.75);
    const roofAreaIndex = Math.max(minAreaIndex, inputs.buildingCoverage);
    const wallAreaIndex = Math.max(minAreaIndex, facadeAreaIndex - roofAreaIndex);
    const facadeCapacity = inputs.facadeThermalMass * wallAreaIndex;
    const roofCapacity = inputs.roofThermalMass * roofAreaIndex;
    const envelopeConductance =
        inputs.envelopeConductance * wallAreaIndex + inputs.roofEnvelopeConductance * roofAreaIndex;
    const exteriorConductance = inputs.exteriorConductance * wallAreaIndex;
    const roofConductance = inputs.roofConductance * roofAreaIndex;
    const indoorCapacityRatio = indoorCapacity / canyonHeatCapacity;
    const facadeCapacityRatio = facadeCapacity / canyonHeatCapacity;
    const roofCapacityRatio = roofCapacity / canyonHeatCapacity;
    const outdoorCapacityRatio = outdoorCapacity / canyonHeatCapacity;
    const cityAirCapacityRatio = cityAirCapacity / canyonHeatCapacity;
    const indoorTimeConstant = indoorCapacity / envelopeConductance;
    const facadeTimeConstant = facadeCapacity / exteriorConductance;
    const roofTimeConstant = roofCapacity / roofConductance;
    const outdoorTimeConstant = outdoorCapacity / (inputs.outdoorConductance * streetAreaIndex);
    const dayCanyonCityTimeConstant = canyonHeatCapacity / (inputs.dayVentilation * canyonExchangeFactor(inputs));
    const nightCanyonCityTimeConstant = canyonHeatCapacity / (inputs.nightVentilation * canyonExchangeFactor(inputs));
    const cityAirTimeConstant = cityAirCapacity / inputs.cityAirExchange;
    const mixingRatio = inputs.dayVentilation / inputs.nightVentilation;
    const acCapacityLand = inputs.acCapacity * far;
    const acMaxRejection = acCapacityLand * (1 + 1 / inputs.acCop);
    const { road: roadSkyView, wall: wallSkyView, roof: roofSkyView } = skyViewFactors(inputs);
    const wallNetLongwave = longwaveCoefficient * wallSkyView * inputs.skyDepression;
    const roofNetLongwave = longwaveCoefficient * roofSkyView * inputs.skyDepression;
    const streetNetLongwave = longwaveCoefficient * roadSkyView * inputs.skyDepression;
    const peakSolarSplit = solarSplit(12, inputs);
    const splitSolarTotal =
        peakSolarSplit.roof + peakSolarSplit.street + peakSolarSplit.wallExterior + peakSolarSplit.indoor;
    const sunlitWallShare = sunlitWallFraction(inputs);
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
        sunlitWallShare,
    };
}

export type { ScenarioName, Inputs, Point };
export { defaults, simulationHours, simulate, summarize };
