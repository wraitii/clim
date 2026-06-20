import "./styles.css";

type ScenarioName = "noAc" | "dayAc";
type Language = "en" | "fr";
type ThemeMode = "system" | "light" | "dark";

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
        key: "peakSolar",
        label: "Peak solar",
        min: 0,
        max: 1000,
        step: 25,
        unit: "W/m2",
        help: "Fixed absorbed shortwave budget per m2 land at solar noon. 500-800 is a useful clear-summer range after albedo and geometry simplifications.",
    },
    {
        key: "wallSunAngle",
        label: "Wall sun angle",
        min: 5,
        max: 85,
        step: 1,
        unit: "deg",
        help: "Solar altitude for splitting fixed sun between horizontal roof/street and vertical walls. Low values favor walls; high values favor roofs and streets.",
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
const state: Inputs = { ...defaults };
const languageStorageKey = "clim-language";
const themeStorageKey = "clim-theme";
const languageNames: Record<Language, string> = { en: "English", fr: "Francais" };
const urlParams = new URLSearchParams(window.location.search);

const translations: Record<string, string> = {
    "Interactive urban heat model": "Modèle interactif de chaleur urbaine",
    "How much does AC heat up cities?": "La climatisation réchauffe-t-elle les villes ?",
    "Compare a no-AC city block with an air-conditioned block during a heat wave. The model tracks indoor comfort, waste heat, stored heat, and how much of it reaches the street canyon and city air.":
        "Comparez un îlot urbain sans climatisation à un îlot climatisé pendant une vague de chaleur. Quelques indicateurs sont suivis : confort intérieur, chaleur rejetée, chaleur stockée et quantité de chaleur atteignant le canyon urbain et l’air de la ville.",
    "Indoor and canyon, with and without AC": "Intérieur et canyon urbain, avec et sans climatisation",
    "The clean comparison: indoor air and street-canyon air for both scenarios.":
        "La comparaison directe : air intérieur et air du canyon urbain dans les deux scénarios.",
    "Building and canyon temperatures": "Températures du bâtiment et du canyon urbain",
    "Full week. Neutral air ramps to the end low/high over the first 4 days, then holds.":
        "Semaine complète. L’air neutre évolue vers les minimums et maximums finaux pendant les 4 premiers jours, puis se stabilise.",
    "Heat released to street air": "Chaleur rejetée dans l’air de la rue",
    "Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy.":
        "Les valeurs positives réchauffent le canyon urbain. Le rejet de climatisation inclut la chaleur extraite de l’intérieur et l’énergie du compresseur.",
    "What drives the warming?": "Qu’est-ce qui provoque le réchauffement ?",
    "The city impact depends on when AC runs, how efficiently it rejects heat, how strongly the canyon mixes, and whether cooled buildings avoid storing heat that would otherwise be released later.":
        "L’impact urbain dépend des horaires de fonctionnement de la climatisation, de l’efficacité du rejet de chaleur, du brassage dans le canyon urbain et du fait que les bâtiments refroidis stockent moins de chaleur qui aurait autrement été relâchée plus tard.",
    "This is an energy-balance sketch, not a full urban canopy model. Use it to compare directions and parameter sensitivity before moving to a coupled building-energy and urban-meteorology model.":
        "Il s’agit d’une esquisse de bilan énergétique, pas d’un modèle complet de canopée urbaine. Utilisez-la pour comparer les tendances et la sensibilité aux paramètres avant de passer à un modèle couplé bâtiment-énergie et météorologie urbaine.",
    "Simulation controls": "Réglages de simulation",
    "Indoor and canyon temperature comparison line chart":
        "Courbe comparant les températures intérieures et du canyon urbain",
    "Building and canyon temperature line chart": "Courbe des températures du bâtiment et du canyon urbain",
    "Heat flux line chart": "Courbe des flux de chaleur",

    "No AC canyon": "Canyon urbain sans climatisation",
    "AC canyon": "Canyon urbain avec climatisation",
    "No AC indoor": "Intérieur sans climatisation",
    "AC indoor": "Intérieur avec climatisation",
    "No AC city air": "Air urbain sans climatisation",
    "No AC facade (sun)": "Façade ensoleillée sans climatisation",
    "No AC roof": "Toiture sans climatisation",
    "No AC street": "Rue sans climatisation",
    "AC city air": "Air urbain avec climatisation",
    "AC facade (sun)": "Façade ensoleillée avec climatisation",
    "AC roof": "Toiture avec climatisation",
    "AC street": "Rue avec climatisation",
    "Neutral air": "Air neutre",
    "No AC facade": "Façade sans climatisation",
    "No AC windows": "Fenêtres sans climatisation",
    "AC facade": "Façade avec climatisation",
    "AC windows": "Fenêtres avec climatisation",
    "AC rejection": "Rejet de climatisation",

    Language: "Langue",
    Theme: "Thème",
    Dark: "Sombre",
    Light: "Clair",
    "Use dark mode": "Activer le mode sombre",
    "Use light mode": "Activer le mode clair",

    "Start low": "Minimum initial",
    "Start high": "Maximum initial",
    "End low": "Minimum final",
    "End high": "Maximum final",
    "Peak solar": "Pic solaire",
    "Wall sun angle": "Angle solaire sur façade",
    "Clear-sky depression": "Écart par ciel clair",
    "Building coverage": "Emprise bâtie",
    "Floor count": "Nombre d’étages",
    "Indoor thermal mass": "Inertie thermique intérieure",
    "Facade thermal mass": "Inertie thermique de façade",
    "Roof thermal mass": "Inertie thermique de toiture",
    "Street thermal mass": "Inertie thermique de la rue",
    "Wall-indoor leakiness": "Échange mur-intérieur",
    "Roof-indoor leakiness": "Échange toiture-intérieur",
    "Open-window exchange": "Échange par fenêtres ouvertes",
    "Indoor solar share": "Part solaire intérieure",
    "Canyon-wall exchange": "Échange canyon-mur",
    "Street-fabric exchange": "Échange rue-revêtement",
    "Roof-city exchange": "Échange toiture-ville",
    "Night canyon-city exchange": "Échange nocturne canyon-ville",
    "Day canyon-city exchange": "Échange diurne canyon-ville",
    "City air depth": "Épaisseur de l’air urbain",
    "City air flushing": "Renouvellement de l’air urbain",
    "Internal gain": "Apports internes",
    "AC day setpoint": "Consigne de climatisation de jour",
    "AC night setpoint": "Consigne de climatisation de nuit",
    "AC capacity": "Puissance de climatisation",
    "AC COP": "COP de la climatisation",
    "AC starts": "Début de la climatisation",
    "AC ends": "Fin de la climatisation",

    "Night average delta": "Écart moyen nocturne",
    "Worst night delta": "Écart nocturne maximal",
    "AC-hour outdoor delta": "Écart extérieur pendant la climatisation",
    "Night indoor delta": "Écart intérieur nocturne",
    "Mean AC waste heat": "Rejet thermique moyen de climatisation",
    "Sunlit facade peak": "Pic de façade ensoleillée",
    "Shaded facade peak": "Pic de façade ombragée",
    "Roof peak": "Pic de toiture",
    "No-AC window heat": "Chaleur par les fenêtres sans climatisation",
    "AC-case window heat": "Chaleur par les fenêtres avec climatisation",
    "Max AC extraction": "Extraction maximale de climatisation",
    "Max AC rejection": "Rejet maximal de climatisation",

    "Roof noon solar": "Solaire reçu par la toiture à midi",
    "Wall noon solar": "Solaire reçu par le mur à midi",
    "Street noon solar": "Solaire reçu par la rue à midi",
    "Indoor noon solar": "Solaire intérieur à midi",
    "Roof surface solar": "Solaire en surface de toiture",
    "Wall surface solar": "Solaire en surface de mur",
    "Street surface solar": "Solaire en surface de rue",
    "Solar split total": "Total de la répartition solaire",
    "Sunlit wall area": "Surface de mur ensoleillée",
    "Wall sky view": "Vue du ciel depuis le mur",
    "Roof sky view": "Vue du ciel depuis la toiture",
    "Street sky view": "Vue du ciel depuis la rue",
    "Wall net longwave": "Infrarouge net du mur",
    "Roof net longwave": "Infrarouge net de la toiture",
    "Street net longwave": "Infrarouge net de la rue",

    "Implied FAR": "COS implicite",
    "Building height": "Hauteur du bâti",
    "Street width": "Largeur de rue",
    "Derived H/W": "H/L déduit",
    "Canyon air depth": "Épaisseur d’air du canyon",
    "Indoor / canyon capacity": "Capacité intérieur / canyon",
    "Facade / canyon capacity": "Capacité façade / canyon",
    "Roof / canyon capacity": "Capacité toiture / canyon",
    "Street / canyon capacity": "Capacité rue / canyon",
    "City air / canyon capacity": "Capacité air urbain / canyon",
    "Indoor time constant": "Constante de temps intérieure",
    "Facade time constant": "Constante de temps de façade",
    "Roof time constant": "Constante de temps de toiture",
    "Street time constant": "Constante de temps de rue",
    "Day canyon exchange": "Échange diurne du canyon",
    "Night canyon exchange": "Échange nocturne du canyon",
    "City flushing time": "Temps de renouvellement urbain",
    "Day / night exchange": "Échange jour / nuit",

    "AC scenario minus no-AC scenario for street-canyon air.":
        "Scénario climatisé moins scénario sans climatisation pour l’air du canyon urbain.",
    "Peak nighttime penalty or benefit.": "Pénalité ou bénéfice nocturne maximal.",
    "Expected heat rejection cost while AC runs.":
        "Coût attendu du rejet thermique pendant le fonctionnement de la climatisation.",
    "How much cooler the indoor/operative node remains.": "Refroidissement conservé par le nœud intérieur/opératif.",
    "Rejected cooling load plus compressor power per land area.":
        "Charge de refroidissement rejetée plus puissance du compresseur par unité de surface au sol.",

    "Neutral weather low on day 1. Mild nights might be 15-20 C; hot urban heat-wave nights can stay above 22 C.":
        "Minimum météorologique neutre au jour 1. Les nuits douces peuvent être à 15-20 C ; les nuits urbaines de vague de chaleur peuvent rester au-dessus de 22 C.",
    "Neutral weather peak on day 1. Warm summer days are often 25-32 C; severe heat waves can exceed 35 C.":
        "Pic météorologique neutre au jour 1. Les journées chaudes d’été sont souvent à 25-32 C ; les vagues de chaleur sévères peuvent dépasser 35 C.",
    "Neutral weather low by day 7. Raise this to model accumulated regional heat and poor nighttime relief.":
        "Minimum météorologique neutre au jour 7. Augmentez cette valeur pour modéliser une chaleur régionale accumulée et un faible rafraîchissement nocturne.",
    "Neutral weather peak by day 7. Paris-scale heat waves can push the neutral peak toward 35-40 C.":
        "Pic météorologique neutre au jour 7. Des vagues de chaleur de type parisien peuvent pousser ce pic vers 35-40 C.",
    "Fixed absorbed shortwave budget per m2 land at solar noon. 500-800 is a useful clear-summer range after albedo and geometry simplifications.":
        "Budget fixe de rayonnement court absorbé par m2 de sol au midi solaire. 500-800 est une plage utile pour un été dégagé après simplification de l’albédo et de la géométrie.",
    "Solar altitude for splitting fixed sun between horizontal roof/street and vertical walls. Low values favor walls; high values favor roofs and streets.":
        "Altitude solaire utilisée pour répartir l’ensoleillement entre toiture/rue horizontales et murs verticaux. Les valeurs basses favorisent les murs ; les valeurs hautes favorisent toitures et rues.",
    "Effective sky temperature below neutral air. 4-8 K suits humid/cloudy nights; 10-15 K suits clearer dry nights.":
        "Température effective du ciel sous l’air neutre. 4-8 K convient aux nuits humides ou nuageuses ; 10-15 K aux nuits plus claires et sèches.",
    "Share of land occupied by roofs/building footprint. Paris-like dense blocks with courtyards are roughly 0.45-0.65 in this simplified pitch model; 0.9 is near-solid fabric.":
        "Part du sol occupée par les toitures ou l’emprise bâtie. Des îlots denses de type parisien avec cours se situent vers 0,45-0,65 dans ce modèle simplifié ; 0,9 correspond à un tissu presque continu.",
    "Typical above-ground floors. Paris mid-rise fabric is often about 5-7 floors; towers or low-rise suburbs should move away from that range.":
        "Nombre typique d’étages hors sol. Le tissu parisien de hauteur moyenne compte souvent 5 à 7 étages ; tours et faubourgs bas doivent s’éloigner de cette plage.",
    "Indoor contents and inner slab faces per m2 floor. Keep below structural mass to avoid double counting: ~30 light, ~60 medium, ~100 heavy.":
        "Contenu intérieur et faces internes des planchers par m2 de surface. Gardez cette valeur sous la masse structurelle pour éviter le double comptage : ~30 léger, ~60 moyen, ~100 lourd.",
    "Participating outer-wall capacity per m2 wall. ~50 light cladding, ~80 masonry, 110-160 heavy stone or thick historic fabric.":
        "Capacité de mur extérieur participante par m2 de mur. ~50 pour bardage léger, ~80 pour maçonnerie, 110-160 pour pierre lourde ou bâti historique épais.",
    "Participating roof capacity per m2 roof. ~40 light deck, ~80 typical roof, 150+ heavy concrete or green roof.":
        "Capacité de toiture participante par m2 de toiture. ~40 pour toiture légère, ~80 pour toiture courante, 150+ pour béton lourd ou toiture végétalisée.",
    "Participating paving/ground capacity per m2 street. ~60 thin/dry asphalt, ~100 typical paving, 150-200 deep stone or damp ground.":
        "Capacité participante du revêtement/sol par m2 de rue. ~60 pour asphalte mince et sec, ~100 pour revêtement courant, 150-200 pour pierre épaisse ou sol humide.",
    "Wall-to-indoor conductance per m2 wall, including leakage. ~0.2 very insulated, ~1-2 older masonry, 3-8 leaky or single-glazed.":
        "Conductance mur-intérieur par m2 de mur, infiltrations incluses. ~0,2 très isolé, ~1-2 maçonnerie ancienne, 3-8 bâtiment fuyant ou simple vitrage.",
    "Roof-to-indoor conductance per m2 roof. Usually lower than wall leakiness in this aggregate model because it mainly couples to the top-floor ceiling.":
        "Conductance toiture-intérieur par m2 de toiture. Elle est généralement plus faible que celle des murs dans ce modèle agrégé, car elle couple surtout le plafond du dernier étage.",
    "Direct indoor-canyon exchange when canyon air is cooler and AC is off. 0 means sealed; 3-8 represents useful night ventilation.":
        "Échange direct intérieur-canyon lorsque l’air du canyon est plus frais et que la climatisation est arrêtée. 0 signifie fermé ; 3-8 représente une ventilation nocturne utile.",
    "Share of wall-incident solar transmitted indoors. 0.05-0.2 is plausible after window fraction, glass, blinds, and orientation; the rest heats sunlit walls.":
        "Part du solaire incident sur les murs transmise à l’intérieur. 0,05-0,2 est plausible après prise en compte des fenêtres, vitrages, stores et orientations ; le reste chauffe les murs ensoleillés.",
    "Wall-to-canyon heat exchange. ~5-12 is a useful calm-to-breezy urban range; higher values make wall heat reach canyon air faster.":
        "Échange thermique mur-canyon. ~5-12 est une plage urbaine utile de calme à ventilé ; des valeurs plus élevées transfèrent plus vite la chaleur des murs vers l’air du canyon.",
    "Street-air to paving exchange. ~6-15 typical, up to 25-30 with strong wind or exposed surfaces.":
        "Échange entre l’air de rue et le revêtement. ~6-15 est typique, jusqu’à 25-30 avec vent fort ou surfaces exposées.",
    "Roof-to-city-air exchange above the canyon. Roofs are exposed, so 10-25 is a reasonable starting range.":
        "Échange toiture-air urbain au-dessus du canyon. Les toitures sont exposées, donc 10-25 est une plage de départ raisonnable.",
    "Canyon-to-city-air exchange overnight and near dawn. Low values trap released wall/street heat in the canyon.":
        "Échange canyon-air urbain la nuit et près de l’aube. Des valeurs faibles piègent dans le canyon la chaleur relâchée par les murs et la rue.",
    "Canyon-to-city-air exchange under sunny mixing. Usually greater than night; a 1-3x day/night ratio is a useful sensitivity range.":
        "Échange canyon-air urbain sous brassage diurne. Généralement plus fort que la nuit ; un rapport jour/nuit de 1 à 3x est une plage de sensibilité utile.",
    "Effective mixed urban air depth receiving canyon and roof heat. 100-300 m is a compact urban boundary-layer scale; deeper dilutes heat more.":
        "Épaisseur effective de l’air urbain mélangé recevant la chaleur du canyon et des toitures. 100-300 m représente une couche limite urbaine compacte ; une couche plus profonde dilue davantage la chaleur.",
    "Exchange from city air back to neutral weather. Low values model stagnant heat waves; high values flush the urban background quickly.":
        "Échange de l’air urbain vers la météo neutre. Des valeurs faibles modélisent des vagues de chaleur stagnantes ; des valeurs élevées renouvellent vite le fond urbain.",
    "People, appliances, lights, and equipment per m2 floor. Residential averages are often a few W/m2; offices can be higher.":
        "Occupants, appareils, éclairage et équipements par m2 de plancher. Les moyennes résidentielles sont souvent de quelques W/m2 ; les bureaux peuvent être plus élevés.",
    "Cooling target during solar hours when AC is scheduled on. 24-26 C is a common comfort-policy range.":
        "Température cible pendant les heures ensoleillées où la climatisation est programmée. 24-26 C est une plage courante de confort et de politique énergétique.",
    "Cooling target outside solar hours when AC is scheduled on. Lower values increase comfort but reject heat into the night canyon.":
        "Température cible hors heures ensoleillées lorsque la climatisation est programmée. Des valeurs plus basses augmentent le confort mais rejettent de la chaleur dans le canyon nocturne.",
    "Cooling extraction cap per m2 floor. Treat as realized load capacity, not nameplate. 20-40 moderate, 60-80 strong.":
        "Plafond d’extraction de froid par m2 de plancher. À traiter comme capacité réellement appelée, pas comme puissance nominale. 20-40 modéré, 60-80 fort.",
    "Coefficient of performance. Older or stressed systems may be 2-3; efficient systems often land around 4-6.":
        "Coefficient de performance. Les systèmes anciens ou contraints peuvent être à 2-3 ; les systèmes efficaces se situent souvent autour de 4-6.",
    "Hour when scheduled cooling begins. Use 0 with AC ends 24 for full-day operation.":
        "Heure de début de la climatisation programmée. Utilisez 0 avec une fin à 24 pour un fonctionnement toute la journée.",
    "Hour when scheduled cooling stops. Values earlier than start represent overnight schedules.":
        "Heure d’arrêt de la climatisation programmée. Une valeur antérieure au début représente une programmation de nuit.",

    "Hottest sunlit wall surface, no-AC case.": "Surface murale ensoleillée la plus chaude, dans le cas sans climatisation.",
    "Shaded walls stay cooler and can sink canyon heat, no-AC case.":
        "Les murs ombragés restent plus frais et peuvent absorber de la chaleur du canyon, dans le cas sans climatisation.",
    "Roof surface temperature in the no-AC case; it exchanges with city air, not canyon air.":
        "Température de surface de toiture dans le cas sans climatisation ; elle échange avec l’air urbain, pas avec l’air du canyon.",
    "Mean direct indoor heat release through open windows.":
        "Rejet moyen direct de chaleur intérieure par les fenêtres ouvertes.",
    "Mean window release during hours when AC is off.":
        "Rejet moyen par les fenêtres pendant les heures où la climatisation est arrêtée.",
    "Cooling capacity converted from floor area to land area.":
        "Capacité de refroidissement convertie de la surface de plancher à la surface au sol.",
    "Outdoor heat at full load, including compressor energy.":
        "Chaleur extérieure à pleine charge, énergie du compresseur incluse.",
    "Peak roof shortwave per land area after the fixed solar budget split.":
        "Pic de rayonnement court sur toiture par surface au sol après répartition du budget solaire fixe.",
    "Peak sunlit-wall absorbed shortwave per land area, after indoor transmission.":
        "Pic de rayonnement court absorbé par les murs ensoleillés par surface au sol, après transmission vers l’intérieur.",
    "Peak street shortwave per land area after canyon shading.":
        "Pic de rayonnement court reçu par la rue par surface au sol après ombrage du canyon.",
    "Peak transmitted solar gain per land area.": "Pic d’apport solaire transmis par surface au sol.",
    "Peak roof shortwave per square meter of roof.": "Pic de rayonnement court par mètre carré de toiture.",
    "Peak absorbed shortwave per square meter of sunlit wall.":
        "Pic de rayonnement court absorbé par mètre carré de mur ensoleillé.",
    "Peak shortwave per square meter of street surface.":
        "Pic de rayonnement court par mètre carré de surface de rue.",
    "Roof + wall + street + indoor equals the fixed peak solar input.":
        "Toiture + mur + rue + intérieur égalent l’apport solaire maximal fixe.",
    "Share of total wall area lit at the selected wall sun angle.":
        "Part de la surface totale de mur éclairée à l’angle solaire sélectionné.",
    "Wall view of sky; lower in deeper canyons.": "Vue du ciel depuis les murs ; plus faible dans les canyons profonds.",
    "Roof view of sky; roofs are exposed above the canopy.":
        "Vue du ciel depuis les toitures ; les toitures sont exposées au-dessus de la canopée.",
    "Street-floor view of sky; collapses toward 0 in deep canyons.":
        "Vue du ciel depuis le niveau de la rue ; elle tend vers 0 dans les canyons profonds.",
    "Clear-night wall radiative loss per exposed surface at the set sky depression.":
        "Perte radiative des murs par surface exposée lors d’une nuit claire, pour l’écart de ciel choisi.",
    "Clear-night roof radiative loss per exposed surface at the set sky depression.":
        "Perte radiative des toitures par surface exposée lors d’une nuit claire, pour l’écart de ciel choisi.",
    "Street-floor radiative loss per exposed surface at the set sky depression.":
        "Perte radiative du sol de rue par surface exposée lors d’une nuit claire, pour l’écart de ciel choisi.",
    "Building coverage times floor count.": "Emprise bâtie multipliée par le nombre d’étages.",
    "Floor count times 3 m per floor.": "Nombre d’étages multiplié par 3 m par étage.",
    "Representative pitch width times the unbuilt street/open fraction.":
        "Largeur représentative de la trame multipliée par la fraction non bâtie de rue ou d’espace ouvert.",
    "Building height divided by derived street width.": "Hauteur du bâti divisée par la largeur de rue déduite.",
    "Canopy depth, set by building height; sets canyon air heat capacity.":
        "Profondeur de canopée, définie par la hauteur du bâti ; elle fixe la capacité thermique de l’air du canyon.",
    "Indoor heat capacity relative to the modeled canyon air.":
        "Capacité thermique intérieure relative à l’air du canyon modélisé.",
    "Wall heat capacity relative to the modeled canyon air.":
        "Capacité thermique des murs relative à l’air du canyon modélisé.",
    "Roof heat capacity relative to the modeled canyon air.":
        "Capacité thermique de la toiture relative à l’air du canyon modélisé.",
    "Outdoor fabric storage relative to the modeled canyon air.":
        "Stockage thermique du tissu extérieur relatif à l’air du canyon modélisé.",
    "Broader mixed air reservoir relative to canyon air.":
        "Réservoir d’air mélangé plus large relatif à l’air du canyon.",
    "Near-equilibrium indoor-to-facade exchange timescale.":
        "Échelle de temps quasi stationnaire de l’échange intérieur-façade.",
    "Near-equilibrium wall-to-canyon exchange timescale.":
        "Échelle de temps quasi stationnaire de l’échange mur-canyon.",
    "Near-equilibrium roof-to-city-air exchange timescale.":
        "Échelle de temps quasi stationnaire de l’échange toiture-air urbain.",
    "Street fabric-to-canyon exchange timescale.": "Échelle de temps de l’échange revêtement de rue-canyon.",
    "Daytime canyon air exchange timescale to city air.":
        "Échelle de temps diurne de l’échange entre air du canyon et air urbain.",
    "Nighttime canyon air exchange timescale to city air.":
        "Échelle de temps nocturne de l’échange entre air du canyon et air urbain.",
    "Broader city air exchange timescale to neutral weather.":
        "Échelle de temps de l’échange entre l’air urbain global et la météo neutre.",
    "Strength of the canyon-city exchange contrast.":
        "Intensité du contraste d’échange entre canyon et ville.",
};

const readLanguage = (): Language => {
    const paramLanguage = urlParams.get("lang");
    if (paramLanguage === "en" || paramLanguage === "fr") return paramLanguage;
    return localStorage.getItem(languageStorageKey) === "en" ? "en" : "fr";
};
const readTheme = (): ThemeMode => {
    const paramTheme = urlParams.get("theme");
    if (paramTheme === "system" || paramTheme === "dark" || paramTheme === "light") return paramTheme;
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === "system" || storedTheme === "dark" || storedTheme === "light") return storedTheme;
    return "system";
};
let language: Language = readLanguage();
let themeMode: ThemeMode = readTheme();
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function t(text: string): string {
    return language === "fr" ? (translations[text] ?? text) : text;
}

function formatNumber(value: number, maximumFractionDigits: number): string {
    return value.toLocaleString(language === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits });
}

function applyTheme() {
    const effectiveTheme = themeMode === "system" ? (systemDarkQuery.matches ? "dark" : "light") : themeMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
}

function updateUrlParams() {
    const params = new URLSearchParams();
    if (language !== "fr") params.set("lang", language);
    if (themeMode !== "system") params.set("theme", themeMode);
    for (const control of controls) {
        const value = state[control.key];
        if (value !== defaults[control.key]) params.set(control.key, String(value));
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
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
            <h2 data-i18n="Indoor and canyon, with and without AC">Indoor and canyon, with and without AC</h2>
            <p data-i18n="The clean comparison: indoor air and street-canyon air for both scenarios.">The clean comparison: indoor air and street-canyon air for both scenarios.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i><span data-i18n="No AC canyon">No AC canyon</span></span>
            <span><i class="dayAc"></i><span data-i18n="AC canyon">AC canyon</span></span>
            <span><i class="noAcMass"></i><span data-i18n="No AC indoor">No AC indoor</span></span>
            <span><i class="dayAcMass"></i><span data-i18n="AC indoor">AC indoor</span></span>
          </div>
        </div>
        <svg id="cleanChart" viewBox="0 0 980 360" role="img" aria-label="Indoor and canyon temperature comparison line chart"></svg>
      </div>
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2 data-i18n="Building and canyon temperatures">Building and canyon temperatures</h2>
            <p data-i18n="Full week. Neutral air ramps to the end low/high over the first 4 days, then holds.">Full week. Neutral air ramps to the end low/high over the first 4 days, then holds.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i><span data-i18n="No AC canyon">No AC canyon</span></span>
            <span><i class="noAcCityAir"></i><span data-i18n="No AC city air">No AC city air</span></span>
            <span><i class="noAcFacade"></i><span data-i18n="No AC facade (sun)">No AC facade (sun)</span></span>
            <span><i class="noAcRoof"></i><span data-i18n="No AC roof">No AC roof</span></span>
            <span><i class="noAcFabric"></i><span data-i18n="No AC street">No AC street</span></span>
            <span><i class="noAcMass"></i><span data-i18n="No AC indoor">No AC indoor</span></span>
            <span><i class="dayAc"></i><span data-i18n="AC canyon">AC canyon</span></span>
            <span><i class="dayAcCityAir"></i><span data-i18n="AC city air">AC city air</span></span>
            <span><i class="dayAcFacade"></i><span data-i18n="AC facade (sun)">AC facade (sun)</span></span>
            <span><i class="dayAcRoof"></i><span data-i18n="AC roof">AC roof</span></span>
            <span><i class="dayAcFabric"></i><span data-i18n="AC street">AC street</span></span>
            <span><i class="dayAcMass"></i><span data-i18n="AC indoor">AC indoor</span></span>
            <span><i class="weather"></i><span data-i18n="Neutral air">Neutral air</span></span>
          </div>
        </div>
        <svg id="tempChart" viewBox="0 0 980 430" role="img" aria-label="Building and canyon temperature line chart"></svg>
      </div>
      <div class="metricGrid" id="metrics"></div>
      <div class="chartPanel">
        <div class="chartHeader">
          <div>
            <h2 data-i18n="Heat released to street air">Heat released to street air</h2>
            <p data-i18n="Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy.">Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy.</p>
          </div>
          <div class="legend">
            <span><i class="noAc"></i><span data-i18n="No AC facade">No AC facade</span></span>
            <span><i class="noAcFabric"></i><span data-i18n="No AC street">No AC street</span></span>
            <span><i class="noAcWindow"></i><span data-i18n="No AC windows">No AC windows</span></span>
            <span><i class="dayAc"></i><span data-i18n="AC facade">AC facade</span></span>
            <span><i class="dayAcFabric"></i><span data-i18n="AC street">AC street</span></span>
            <span><i class="dayAcWindow"></i><span data-i18n="AC windows">AC windows</span></span>
            <span><i class="waste"></i><span data-i18n="AC rejection">AC rejection</span></span>
          </div>
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
    controlsEl.append(field);
}

languageToggle.addEventListener("click", () => {
    language = language === "en" ? "fr" : "en";
    localStorage.setItem(languageStorageKey, language);
    updateUrlParams();
    render();
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
        vertical: Math.max(0.01, Math.cos(angleRadians)),
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
        indoor,
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
            const needed = ((indoorTemp - acSetpoint) * indoorCapacity) / acResponseHours;
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
            dayAcFabricFlux: scenario === "dayAc" ? fabricFlux : 0,
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
    const envelopeConductance =
        state.envelopeConductance * wallAreaIndex + state.roofEnvelopeConductance * roofAreaIndex;
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
    const splitSolarTotal =
        peakSolarSplit.roof + peakSolarSplit.street + peakSolarSplit.wallExterior + peakSolarSplit.indoor;
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
        sunlitWallShare,
    };
}

function renderLineChart(
    svg: SVGSVGElement,
    points: Point[],
    series: Array<{ key: keyof Point; className: string }>,
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
      <text class="axisText" x="${pad.left - 12}" y="${yScale(tick) + 4}" text-anchor="end">${tick.toFixed(0)}</text>`,
        )
        .join("")}
    ${xTicks
        .map(
            (tick) => `
      <line class="grid vertical" x1="${xScale(tick)}" x2="${xScale(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" />
      <text class="axisText" x="${xScale(tick)}" y="${height - 16}" text-anchor="middle">${tick === simulationHours ? "End" : `D${Math.floor(tick / 24) + 1}`}</text>`,
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
        output.textContent = `${formatNumber(Number(state[control.key]), control.step < 1 ? 2 : 0)}${control.unit}`;
    }
}

function renderChrome() {
    document.documentElement.lang = language;
    document.title = t("How much does AC heat up cities?");
    controlsEl.ariaLabel = t("Simulation controls");
    cleanChart.setAttribute("aria-label", t("Indoor and canyon temperature comparison line chart"));
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
    languageToggle.textContent = language === "en" ? "FR" : "EN";
    languageToggle.ariaLabel = `${t("Language")}: ${languageNames[language]}`;
    languageToggle.title = `${t("Language")}: ${languageNames[language]}`;
    const effectiveTheme = themeMode === "system" ? (systemDarkQuery.matches ? "dark" : "light") : themeMode;
    themeToggle.textContent = t(effectiveTheme === "dark" ? "Light" : "Dark");
    themeToggle.ariaLabel = t(effectiveTheme === "dark" ? "Use light mode" : "Use dark mode");
    themeToggle.title = themeToggle.ariaLabel;
}

function render() {
    renderChrome();
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
            { key: "dayAcMass", className: "dayAcMass" },
        ],
        "C",
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
            { key: "weather", className: "weather" },
        ],
        "C",
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
            { key: "dayAcWaste", className: "waste" },
        ],
        "W/m2",
    );
}

applyTheme();
render();
