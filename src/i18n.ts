// Localization strings + locale-aware number formatting.

type Language = "en" | "fr";
const languageStorageKey = "clim-language";
const languageNames: Record<Language, string> = { en: "English", fr: "Francais" };
const translations: Record<string, string> = {
    "Interactive urban heat model": "Modèle interactif de chaleur urbaine",
    "How much does AC heat up cities?": "La climatisation réchauffe-t-elle les villes ?",
    "How the model works": "Comment fonctionne le modèle",
    D: "J",
    End: "Fin",
    Share: "Partager",
    Copied: "Copié",
    "A simplified heat-network model. Roofs, walls, street, indoor air, canyon air, and city air are nodes with thermal capacity; solar, longwave, convective, and conductive links move energy between them, while AC rejects heat into the canyon. It is not a full urban climate model, but it is internally consistent for comparing scenarios.":
        "Un modèle simplifié de réseau thermique. Toitures, murs, rue, air intérieur, air du canyon et air de la ville sont des nœuds avec capacité thermique ; des liens solaires, infrarouges, convectifs et conductifs transfèrent l’énergie entre eux, tandis que la climatisation rejette sa chaleur dans le canyon. Ce n’est pas un modèle complet de climat urbain, mais il reste cohérent pour comparer des scénarios.",
    "City air": "Air de la ville",
    "Countryside air": "Air de la campagne",
    "Canyon air": "Air du canyon",
    "Roof": "Toiture",
    "Sunlit wall": "Mur ensoleillé",
    "Shaded wall": "Mur à l’ombre",
    "Street": "Rue",
    "Indoor": "Intérieur",
    "Windows": "Fenêtres",
    "Compare a no-AC city block with an air-conditioned block during a heat wave. The model tracks indoor comfort, waste heat, stored heat, and how much of it reaches the street canyon and city air.":
        "Comparez un îlot urbain sans climatisation à un îlot climatisé pendant une vague de chaleur. Quelques indicateurs sont suivis : confort intérieur, chaleur rejetée, chaleur stockée et quantité de chaleur atteignant le canyon urbain et l’air de la ville.",
    "Building and canyon temperatures": "Températures du bâtiment et du canyon urbain",
    "Click a legend entry to show or hide that line. Canyon, indoor, and neutral air are shown by default; surface temperatures can be toggled on.":
        "Cliquez sur une entrée de légende pour afficher ou masquer la courbe. Canyon, intérieur et air neutre sont affichés par défaut ; les températures de surface peuvent être activées.",
    "Heat released to street air": "Chaleur rejetée dans l’air de la rue",
    "Positive values warm the canyon. AC rejection includes extracted indoor heat plus compressor energy. Incident solar can be toggled on.":
        "Les valeurs positives réchauffent le canyon urbain. Le rejet de climatisation inclut la chaleur extraite de l’intérieur et l’énergie du compresseur. Le solaire incident peut être activé.",
    "What drives the warming?": "Qu’est-ce qui provoque le réchauffement ?",
    "The city impact depends on when AC runs, how efficiently it rejects heat, how strongly the canyon mixes, and whether cooled buildings avoid storing heat that would otherwise be released later.":
        "L’impact urbain dépend des horaires de fonctionnement de la climatisation, de l’efficacité du rejet de chaleur, du brassage dans le canyon urbain et du fait que les bâtiments refroidis stockent moins de chaleur qui aurait autrement été relâchée plus tard.",
    "This is an energy-balance sketch, not a full urban canopy model. Use it to compare directions and parameter sensitivity before moving to a coupled building-energy and urban-meteorology model.":
        "Il s’agit d’une esquisse de bilan énergétique, pas d’un modèle complet de canopée urbaine. Utilisez-la pour comparer les tendances et la sensibilité aux paramètres avant de passer à un modèle couplé bâtiment-énergie et météorologie urbaine.",
    "Simulation controls": "Réglages de simulation",
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
    "Solar roof": "Solaire toiture",
    "Solar street": "Solaire rue",
    "Solar wall": "Solaire mur",
    "Solar indoor": "Solaire intérieur",

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
    "Advanced parameters": "Paramètres avancés",
    "Hide advanced parameters": "Masquer les paramètres avancés",
    "Latitude": "Latitude",
    "Day of year": "Jour de l'année",
    "Sky clarity": "Clarté du ciel",
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
    "Site latitude. Sets the sun's seasonal path: solar elevation, day length, and sunrise/sunset. Paris is 48.85.":
        "Latitude du site. Détermine la course saisonnière du soleil : élévation, durée du jour, lever/coucher. Paris est à 48,85.",
    "Date as day-of-year. Summer solstice is ~172 (Jun 21); Aug 1 is ~213. Drives solar declination, so day length and noon sun height.":
        "Date en jour de l’année. Le solstice d’été est ~172 (21 juin) ; le 1er août ~213. Pilote la déclinaison solaire, donc la durée du jour et la hauteur du soleil à midi.",
    "Bulk atmospheric transmittance for clear-sky beam solar. ~0.75 is a clear summer day; lower is hazier/more humid. Replaces the old fixed solar budget.":
        "Transmittance atmosphérique globale du rayonnement direct par ciel clair. ~0,75 correspond à une journée d’été dégagée ; plus bas = plus brumeux/humide. Remplace l’ancien budget solaire fixe.",
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

let language: Language = "fr";

export function getLanguage(): Language {
    return language;
}

export function setLanguage(next: Language): void {
    language = next;
    localStorage.setItem(languageStorageKey, next);
}

export function initLanguage(urlParams: URLSearchParams): void {
    const paramLanguage = urlParams.get("lang");
    if (paramLanguage === "en" || paramLanguage === "fr") {
        language = paramLanguage;
        return;
    }
    language = localStorage.getItem(languageStorageKey) === "en" ? "en" : "fr";
}

export function t(text: string): string {
    return language === "fr" ? (translations[text] ?? text) : text;
}

export function formatNumber(value: number, maximumFractionDigits: number): string {
    return value.toLocaleString(language === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits });
}

export type { Language };
export { languageNames };
