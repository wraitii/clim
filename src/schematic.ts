import type { Inputs } from "./model";

// Cross-section of the street-canyon energy balance, with dimensions driven by the
// parameters: building coverage sets canyon width vs building width, floor count sets
// building height. Pure markup — the data-i18n labels are translated by main.ts's
// renderChrome() pass, and it is re-rendered on every parameter change.

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));
const r = (value: number): number => Math.round(value * 10) / 10;

export function schematicMarkup(inputs: Inputs): string {
    const builtLeft = 120;
    const builtW = 692;
    const yGround = 332;

    // Coverage splits the built strip into canyon (open) vs the two flanking buildings;
    // clamped so labels stay legible and buildings stay visible at the extremes.
    const canyonW = clamp((1 - inputs.buildingCoverage) * builtW, 150, 460);
    const buildingW = (builtW - canyonW) / 2;
    const wallW = clamp(buildingW * 0.16, 6, 12);
    // Floor count sets height; min keeps room for the interior arrows, max keeps it on canvas.
    const buildingH = clamp(64 + inputs.floorCount * 11, 110, 272);
    const topY = yGround - buildingH;

    const lbX = builtLeft;
    const shadeWallX = lbX + buildingW - wallW;
    const canyonX = lbX + buildingW;
    const rbX = canyonX + canyonW; // sunlit wall + right building start
    const rbIndoorX = rbX + wallW;
    const builtRight = rbX + buildingW;

    const roofTopY = topY - 8;
    const indoorTopY = topY + 14;
    const indoorH = yGround - indoorTopY;
    const canyonCx = canyonX + canyonW / 2;
    const lbIndoorCx = lbX + (buildingW - wallW) / 2;
    const rbIndoorCx = rbIndoorX + (buildingW - wallW) / 2;
    const roofCx = rbX + buildingW / 2;
    const indoorCy = indoorTopY + indoorH * 0.62;

    // Window/AC arrows hug the sunlit wall so they never reach the indoor label.
    const winY = topY + buildingH * 0.5;
    const acY = topY + buildingH * 0.74;
    const canyonAnchorX = canyonX + canyonW * 0.34;
    const indoorAnchorX = rbIndoorX + 26;
    const wallLabelY = topY + 34;
    const exchY = clamp(topY - 12, 28, 84);

    return `
        <svg class="schematic" viewBox="0 0 980 400" role="img" aria-label="Model schematic">
          <defs>
            <marker id="m-win" markerWidth="7" markerHeight="7" refX="5" refY="2.6" orient="auto-start-reverse"><path class="fillWin" d="M0,0 L5,2.6 L0,5.2 Z" /></marker>
            <marker id="m-ac" markerWidth="7" markerHeight="7" refX="5" refY="2.6" orient="auto-start-reverse"><path class="fillAc" d="M0,0 L5,2.6 L0,5.2 Z" /></marker>
            <marker id="m-exch" markerWidth="6" markerHeight="6" refX="4.4" refY="2.2" orient="auto-start-reverse"><path class="fillExch" d="M0,0 L4.4,2.2 L0,4.4 Z" /></marker>
          </defs>

          <rect class="sch-air" x="0" y="14" width="812" height="${r(topY - 14)}" />
          <text class="sch-node" x="20" y="34" data-i18n="City air">City air</text>
          <rect class="sch-air" x="838" y="14" width="138" height="318" />
          <text class="sch-node" x="907" y="34" text-anchor="middle" data-i18n="Countryside air">Countryside air</text>

          <rect class="sch-air" x="${r(canyonX)}" y="${r(topY)}" width="${r(canyonW)}" height="${r(buildingH)}" />
          <text class="sch-node" x="${r(canyonCx)}" y="${r(topY + 24)}" text-anchor="middle" data-i18n="Canyon air">Canyon air</text>

          <rect class="sch-fabric" x="${r(lbX)}" y="${r(roofTopY)}" width="${r(buildingW)}" height="22" />
          <rect class="sch-indoor" x="${r(lbX)}" y="${r(indoorTopY)}" width="${r(buildingW - wallW)}" height="${r(indoorH)}" />
          <text class="sch-node" x="${r(lbIndoorCx)}" y="${r(indoorCy)}" text-anchor="middle" data-i18n="Indoor">Indoor</text>
          <rect class="sch-fabric" x="${r(shadeWallX)}" y="${r(indoorTopY)}" width="${r(wallW)}" height="${r(indoorH)}" />

          <rect class="sch-fabric" x="${r(rbX)}" y="${r(roofTopY)}" width="${r(buildingW)}" height="22" />
          <text class="sch-node" x="${r(roofCx)}" y="${r(roofTopY + 16)}" text-anchor="middle" data-i18n="Roof">Roof</text>
          <rect class="sch-fabric" x="${r(rbX)}" y="${r(indoorTopY)}" width="${r(wallW)}" height="${r(indoorH)}" />
          <rect class="sch-indoor" x="${r(rbIndoorX)}" y="${r(indoorTopY)}" width="${r(buildingW - wallW)}" height="${r(indoorH)}" />
          <text class="sch-node" x="${r(rbIndoorCx)}" y="${r(indoorCy)}" text-anchor="middle" data-i18n="Indoor">Indoor</text>

          <text class="sch-sub" x="${r(shadeWallX - 4)}" y="${r(wallLabelY)}" text-anchor="end" data-i18n="Shaded wall">Shaded wall</text>
          <text class="sch-sub" x="${r(rbIndoorX + 4)}" y="${r(wallLabelY)}" data-i18n="Sunlit wall">Sunlit wall</text>

          <rect class="sch-fabric" x="${r(lbX)}" y="${r(yGround)}" width="${r(builtRight - lbX)}" height="20" />
          <text class="sch-node" x="${r(canyonCx)}" y="${r(yGround + 14)}" text-anchor="middle" data-i18n="Street">Street</text>

          <line class="fExch" marker-start="url(#m-exch)" marker-end="url(#m-exch)" x1="812" y1="${r(exchY)}" x2="838" y2="${r(exchY)}" />

          <line class="fWin" marker-start="url(#m-win)" marker-end="url(#m-win)" x1="${r(canyonAnchorX)}" y1="${r(winY)}" x2="${r(indoorAnchorX)}" y2="${r(winY)}" />
          <line class="fAc" marker-end="url(#m-ac)" x1="${r(indoorAnchorX)}" y1="${r(acY)}" x2="${r(canyonAnchorX)}" y2="${r(acY)}" />

          <line class="fWin" x1="300" y1="384" x2="326" y2="384" />
          <text class="sch-sub" x="332" y="388" data-i18n="Windows">Windows</text>
          <line class="fAc" x1="470" y1="384" x2="496" y2="384" />
          <text class="sch-sub" x="502" y="388" data-i18n="AC rejection">AC rejection</text>
        </svg>`;
}
