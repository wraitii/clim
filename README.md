# How Much Does AC Heat Up Cities?

This is a TypeScript energy-balance simulator for estimating how air conditioning changes street-canyon and city-air temperatures during a week-long heat event.

AC rejects indoor heat plus compressor work outdoors while it runs. The model compares that direct waste heat with the way cooling changes building heat storage, surface temperatures, and nighttime release back into the canyon.

Run it with:

```sh
bun install
bun run dev
```

Then open `http://127.0.0.1:5173/`.

## Model Shape

The app runs two scenarios over a visible seven-day heat-wave forcing. Neutral weather ramps from the configured start low/high to the configured end low/high over the first four days, then holds the end conditions for the rest of the week.

- `No AC`: indoor/operative mass exchanges with sunlit wall, shaded wall, and roof nodes. Walls exchange with canyon air; roofs exchange with the broader city air above the canopy.
- `Day AC`: cooling runs only during the selected window, rejects heat to the canyon, and caps indoor/operative temperature near a daytime or nighttime setpoint.

Both scenarios can use direct open-window exchange between the indoor/operative node and canyon air when canyon air is cooler than indoors. The AC scenario disables this path during scheduled cooling hours, so changing the AC schedule also changes when passive window cooling is allowed. Window exchange ramps in and out over a short response time instead of switching instantly at the schedule boundary.

The full week is plotted. Sliders expose the starting and ending neutral-air daily low/high temperatures, building coverage, floor count, indoor thermal mass, facade thermal mass, roof thermal mass, street thermal mass, city air depth, canyon-wall exchange, roof-city exchange, street-fabric exchange, wall-indoor leakiness, roof-indoor leakiness, open-window exchange, fixed peak solar input, wall sun angle, indoor solar share, clear-sky depression, internal gains, day/night AC setpoints, COP, AC schedule, canyon-city exchange, and city-air flushing conductance. Canyon H/W is derived from coverage and floor count.

Negative `Night average delta` means the AC case is cooler outside from 21:00 to 06:00.

## Interpretation

The interesting region is:

- dense, high-mass buildings;
- stronger sunny-period mixing than nighttime mixing;
- daytime-only AC operation;
- decent COP;
- enough envelope leakiness for no-AC buildings to release stored heat at night.

The model separates neutral weather, broader city air, canyon air, sunlit wall, shaded wall, roof, street/paving fabric, and indoor/operative mass. Floor count and building coverage imply FAR (`coverage * floors`) so density has one source of truth. A fixed `24 m` representative pitch is split into building footprint and street/open canyon width from coverage, while floor count sets building height. Canyon `H/W = building height / street width`, so dense footprint and tall buildings automatically create deeper canyons. Higher `H/W` reduces exchange between canyon air and the broader city air, while the city air node itself flushes more slowly back to neutral weather. The UI reports derived checks for implied FAR, building height, street width, H/W, canyon air depth, indoor/canyon capacity ratio, facade/canyon capacity ratio, roof/canyon capacity ratio, street/canyon capacity ratio, city-air/canyon capacity ratio, and exchange timescales because these values strongly determine whether the curves look physically plausible.

Solar gains come from one fixed peak absorbed shortwave budget per square meter of land. Geometry only redistributes that budget:

```text
roof weight = building coverage * sin(angle)
street weight = (1 - building coverage) * street sky view * sin(angle)
wall weight = (1 - building coverage) * (1 - street sky view) * cos(angle)
roof/street/wall incident = peak solar * weight / sum(weights)
indoor = wall incident * indoor solar share
sunlit wall = wall incident - indoor
```

Low sun therefore shifts the conserved solar budget toward walls; high sun shifts it toward roof and street. The default peak solar value is `700 W/m2` land-area peak. The UI reports the roof, wall, street, and indoor noon split plus their total, so shape changes can be checked against the fixed input. It also reports per-surface solar for roof, sunlit wall, and street, because land-area-normalized street solar looks small when building coverage is high.

The indoor solar share defaults to `0.20` of wall-incident solar, not total solar. It stands in for the product of window fraction, glass transmittance, curtains/blinds, orientation, and occupant behavior.

This value has to be large enough to be consistent with the prescribed regional-air swing. The regional-air daytime peak implicitly reflects strong solar heating of the surface, so the urban surfaces must absorb comparable energy or the canyon stays unphysically cool. With the absorbed-solar and longwave terms balanced, the sunlit surfaces peak around `46 C`, the shaded surfaces stay near `37 C`, and the midday canyon air sits within a degree or two of the regional-air peak (a small lag from thermal mass) instead of the `7-8 K` daytime cool bias an under-driven surface produced. If you raise thermal mass you generally need more absorbed solar to keep the daytime canyon tracking regional air.

### Sunlit and shaded facade

The exterior fabric is split into separate wall and roof nodes rather than one orientation-averaged node. A single average smears a hot sunlit wall (`45-60 C`) together with a cool shaded wall and an exposed roof into a lukewarm surface that is neither, which over-damps the daily swing and routes roof heat into the wrong air mass. The sunlit wall area is estimated from solar altitude and derived canyon geometry: one side of the canyon can be lit, and the lit height fraction is `min(1, tan(angle) / H/W)`, so low sun concentrates the wall solar onto a smaller hot patch. The remaining wall area is shaded. The roof has its own thermal mass, receives the roof share of solar, loses longwave to full sky, exchanges convectively with city air rather than canyon air, and has a separate roof-indoor leakiness.

### Longwave radiative cooling

The exterior surfaces lose heat to the sky by net longwave radiation, day and night. This term was missing in an earlier version, which is why surfaces charged up over the heat wave and never discharged: the canyon air sat pinned ~10 K above ambient with almost no diurnal swing. The loss is linearized as `Q = h_r * SVF * (T_surface - T_sky)`, with:

- `h_r = 5.5 W/m2/K`, the linearized coefficient `4 * emissivity * sigma * T^3` at about `300 K`. This is physics, not a tuning knob.
- `SVF`, the geometric sky-view factor of an infinitely long canyon: street floor `sqrt(1 + r^2) - r` and wall `0.5 * (1 + r - sqrt(1 + r^2)) / r`, with `r = H/W`. Roofs use full sky view. Deeper canyons see less sky, shed less longwave, and trap more heat, so the modeled nocturnal heat island rises with `H/W`.
- `T_sky = neutral air - Clear-sky depression`. The depression slider is the one free atmospheric parameter and encodes humidity and cloud: a humid or cloudy heat-wave sky (low depression) radiates strongly back and suppresses cooling, so heat-wave nights stay hot; a clear dry sky (high depression) cools faster. The default `12 K` corresponds to roughly `60-65 W/m2` net clear-sky loss per fully sky-exposed surface.

With realistic values the no-AC dense canyon settles several degrees above the rural nighttime low (about `8 K` at the default end-of-week forcing, in the Paris-heat-wave range), with a real diurnal swing. There is no engineered "thermal battery" night-cooling benefit; daytime AC adds a small net nighttime warming (about `+0.7 K` at default, consistent with measured air-conditioning waste-heat studies), which is the physically expected result.

The UI reports the derived wall, roof, and street sky-view factors and the implied clear-sky net longwave loss alongside the capacity and timescale checks.

Thermal mass controls use `Wh/m2/K`; divide `kJ/m2/K` by `3.6` to compare literature values. The defaults are aimed at heavy urban fabric, but the building's structural mass is carried by the facade and roof nodes, so the indoor node is deliberately modest to avoid double-counting it: indoor `60 Wh/m2floor/K` (`216 kJ/m2/K`, interior contents and inner-slab faces), facade `80 Wh/m2facade/K` (`288 kJ/m2/K`), roof `80 Wh/m2roof/K` (`288 kJ/m2/K`), street `80 Wh/m2ground/K` (`288 kJ/m2/K`), and a `250 m` city-air layer (`84 Wh/m2/K`, about `300 kJ/m2/K`).

An earlier default put `150 Wh/m2floor/K` on the indoor node on top of the facade mass. Because the indoor node couples to the facade only through the envelope conductance, that gave it a time constant near `90 h` (`thermalMass / envelopeConductance`), longer than the whole simulation, so the building never reached a repeating daily cycle and kept charging up day after day under flat forcing. Keeping the indoor node lighter than the facade puts the dominant time constant back below two days; a small residual day-to-day rise during the flat-hot stretch is real heat-wave accumulation, not numerical drift.

Wall-canyon, roof-city, wall-indoor, and roof-indoor exchange use the slider value as the near-equilibrium conductance. Roof-indoor leakiness is intentionally separate because the roof mainly couples to the top-floor ceiling, not every conditioned floor. For larger temperature differences, the conductance is increased modestly with a capped cube-root multiplier, approximating the way natural convection and radiation make large gradients converge faster than a fixed time constant would imply.

The `AC capacity` parameter is the cooling extraction cap per square meter of floor area. In this sketch it should be treated as a realized-load cap, not equipment nameplate capacity. The model converts it to land area with FAR:

```text
max extraction per land area = AC capacity * floor area ratio
```

Outdoor rejection includes compressor energy:

```text
outdoor rejection = extracted indoor heat * (1 + 1 / COP)
```

So the default `80 W/m2` floor-area capacity at default implied FAR `3.3` gives about `264 W/m2` maximum extraction per land area, and with COP `3.5` about `339 W/m2` maximum outdoor rejection.

AC rejection heats the canyon air directly, as a real condenser does. The street/paving fabric is not heated by the waste stream; it only warms indirectly, by convection from the warmed canyon air. Because the canyon air is well ventilated, most waste heat is mixed out to the city air rather than accumulating, so AC shows up mainly as a modest canyon-air and city-air warming rather than a large rise in any single stored node.

The AC schedule supports daytime, overnight, and full-day operation. The default is full-day cooling (`00:00` to `24:00`), with a `25 C` daytime setpoint during solar hours and a `22 C` nighttime setpoint outside them.

The canyon-city and city-weather exchange sliders are effective conductances in `W/m2/K`, not wind speeds. Canyon exchange moves heat from canyon air into the broader city air node, not directly to neutral weather. The city air node has its own depth and flushing conductance back to neutral weather, so heat vented out of one canyon can still warm the urban background air instead of disappearing instantly.

Night canyon-city exchange must not be set too low, or the canyon air ends up trapping the heat the surfaces release overnight and floats many degrees above the city air. With the default night value the canyon sits a few degrees above the city node at night and tracks it closely by day, which is the expected street-canyon behavior; the daytime value is higher because convective mixing is stronger in the sun.

The effect reverses when AC runs into the night, COP is poor, nighttime mixing is strong, or buildings do not store much daytime heat.

This is an energy-balance sketch, not a replacement for a coupled building-energy and urban-canopy model. It is meant to identify parameter ranges worth testing more rigorously.

Useful starting points for calibration:

- Cooling load references distinguish heat gains, cooling load, and heat extraction rate; this model's `AC capacity` is the heat extraction-rate cap.
- Zhao et al., 2025, the PDF in this repo discussion, is useful for canyon response rather than indoor swing: it models AC sensible heat as exterior heat flux, uses `16.25 W/m2` room heat emission intensity, and finds sidewall heat sources raise H/W=1 canyon air by about `1-3 K`, deep H/W=5 canyon air by about `2-10 K`, while rooftop release has much smaller canyon impact.
- Salamanca et al., 2014, "Anthropogenic heating of the urban environment due to air conditioning", Journal of Geophysical Research: Atmospheres.
- Ohashi et al., 2007, "Influence of Air-Conditioning Waste Heat on Air Temperature in Tokyo during Summer", Journal of Applied Meteorology and Climatology.
- Masson et al., 2020, "Urban Climates and Climate Change", Annual Review of Environment and Resources.
