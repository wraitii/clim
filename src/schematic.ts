import type { Inputs } from "./model";

// Cross-section of the street-canyon energy balance. Geometry is intentionally static
// so the schematic stays readable while the charts carry the parameter response. Pure
// markup — the data-i18n labels are translated by main.ts's renderChrome() pass.

const r = (value: number): number => Math.round(value * 10) / 10;

const sunRay = (cx: number, cy: number, radius: number, angleDeg: number, length: number): string => {
    const angle = (angleDeg * Math.PI) / 180;
    const x1 = cx + Math.cos(angle) * (radius + 4);
    const y1 = cy + Math.sin(angle) * (radius + 4);
    const x2 = cx + Math.cos(angle) * (radius + 4 + length);
    const y2 = cy + Math.sin(angle) * (radius + 4 + length);

    return `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" />`;
};

export function schematicMarkup(_inputs: Inputs): string {
    const cityAirRight = 812;
    const countryAirX = cityAirRight;
    const countryAirW = 164;
    const streetTopY = 400;
    const streetH = 22;
    const roofH = 32;

    const canyonW = 235;
    const buildingH = 270;
    const buildingW = 146;
    const builtW = buildingW * 2 + canyonW;
    const builtLeft = (cityAirRight - builtW) / 2;
    const wallW = 14;
    const roofTopY = streetTopY - buildingH;
    const roofBottomY = roofTopY + roofH;
    const indoorBottomY = streetTopY;

    const lbX = builtLeft;
    const shadeWallX = lbX + buildingW - wallW;
    const canyonX = lbX + buildingW;
    const rbX = canyonX + canyonW; // sunlit wall + right building start
    const rbIndoorX = rbX + wallW;

    const indoorTopY = roofBottomY;
    const indoorH = indoorBottomY - indoorTopY;
    const canyonCx = canyonX + canyonW / 2;
    const lbIndoorCx = lbX + (buildingW - wallW) / 2;
    const rbIndoorCx = rbIndoorX + (buildingW - wallW) / 2;
    const roofCx = rbX + buildingW / 2;
    const indoorCy = indoorTopY + indoorH * 0.62;

    // Window/AC arrows hug the sunlit wall so they never reach the indoor label.
    const winY = indoorTopY + indoorH * 0.43;
    const acY = indoorTopY + indoorH * 0.68;
    const canyonAnchorX = canyonX + canyonW * 0.36;
    const indoorAnchorX = rbIndoorX + 26;
    const wallLabelY = indoorTopY + 24;
    const arrowLabelX = canyonAnchorX + (indoorAnchorX - canyonAnchorX) * 0.5;
    const sunCx = 86;
    const sunCy = 76;
    const sunR = 16;
    const sunRays = Array.from({ length: 12 }, (_, index) => index * 30)
        .map((angle) => sunRay(sunCx, sunCy, sunR, angle, 8))
        .join("");

    return `
        <svg class="schematic" viewBox="0 0 980 410" role="img" aria-label="Model schematic">
          <defs>
            <marker id="m-win" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path class="fillWin" d="M0,0 L8,3 L0,6 Z" /></marker>
            <marker id="m-ac" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path class="fillAc" d="M0,0 L8,3 L0,6 Z" /></marker>
          </defs>

          <rect class="sch-city-air" x="0" y="14" width="${cityAirRight}" height="${r(roofBottomY - 14)}" />
          <text class="sch-node" x="${r(cityAirRight / 2)}" y="34" text-anchor="middle" data-i18n="City air">City air</text>
          <rect class="sch-country-air" x="${countryAirX}" y="14" width="${countryAirW}" height="${r(streetTopY + streetH - 14)}" />
          <text class="sch-node" x="${r(countryAirX + countryAirW / 2)}" y="34" text-anchor="middle" data-i18n="Countryside air">Countryside air</text>

          <g class="sch-sun" aria-hidden="true">
            <circle cx="${sunCx}" cy="${sunCy}" r="${sunR}" />
            ${sunRays}
          </g>

          <rect class="sch-canyon-air" x="${r(canyonX)}" y="${r(roofBottomY)}" width="${r(canyonW)}" height="${r(indoorBottomY - roofBottomY)}" />
          <text class="sch-node" x="${r(canyonCx)}" y="${r(roofBottomY + 28)}" text-anchor="middle" data-i18n="Canyon air">Canyon air</text>

          <rect class="sch-roof" x="${r(lbX)}" y="${r(roofTopY)}" width="${r(buildingW)}" height="${roofH}" />
          <rect class="sch-indoor" x="${r(lbX)}" y="${r(indoorTopY)}" width="${r(buildingW - wallW)}" height="${r(indoorH)}" />
          <text class="sch-node" x="${r(lbIndoorCx)}" y="${r(indoorCy)}" text-anchor="middle" data-i18n="Indoor">Indoor</text>
          <rect class="sch-wall-shade" x="${r(shadeWallX)}" y="${r(indoorTopY)}" width="${r(wallW)}" height="${r(indoorH)}" />

          <rect class="sch-roof" x="${r(rbX)}" y="${r(roofTopY)}" width="${r(buildingW)}" height="${roofH}" />
          <text class="sch-node" x="${r(roofCx)}" y="${r(roofTopY + 21)}" text-anchor="middle" data-i18n="Roof">Roof</text>
          <rect class="sch-wall-sun" x="${r(rbX)}" y="${r(indoorTopY)}" width="${r(wallW)}" height="${r(indoorH)}" />
          <rect class="sch-indoor" x="${r(rbIndoorX)}" y="${r(indoorTopY)}" width="${r(buildingW - wallW)}" height="${r(indoorH)}" />
          <text class="sch-node" x="${r(rbIndoorCx)}" y="${r(indoorCy)}" text-anchor="middle" data-i18n="Indoor">Indoor</text>

          <text class="sch-sub" x="${r(shadeWallX - 4)}" y="${r(wallLabelY)}" text-anchor="end" data-i18n="Shaded wall">Shaded wall</text>
          <text class="sch-sub" x="${r(rbIndoorX + 4)}" y="${r(wallLabelY)}" data-i18n="Sunlit wall">Sunlit wall</text>

          <rect class="sch-street" x="${r(canyonX)}" y="${r(streetTopY)}" width="${r(canyonW)}" height="${streetH}" />
          <text class="sch-node" x="${r(canyonCx)}" y="${r(streetTopY + 16)}" text-anchor="middle" data-i18n="Street">Street</text>

          <line class="fWin" marker-start="url(#m-win)" marker-end="url(#m-win)" x1="${r(canyonAnchorX)}" y1="${r(winY)}" x2="${r(indoorAnchorX)}" y2="${r(winY)}" />
          <text class="sch-flow-label" x="${r(arrowLabelX)}" y="${r(winY - 9)}" text-anchor="middle" data-i18n="Windows">Windows</text>
          <line class="fAc" marker-end="url(#m-ac)" x1="${r(indoorAnchorX)}" y1="${r(acY)}" x2="${r(canyonAnchorX)}" y2="${r(acY)}" />
          <text class="sch-flow-label" x="${r(arrowLabelX)}" y="${r(acY - 9)}" text-anchor="middle" data-i18n="AC rejection">AC rejection</text>
        </svg>`;
}
