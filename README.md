> Note: this project has been entirely vibe coded, and I have not double-checked the code.

# How Much Does AC Heat Up Cities?

Live app: https://wraitii.github.io/clim/

This is a TypeScript energy-balance simulator for exploring how air conditioning can change street-canyon and city-air temperatures during a week-long heat event.

It compares two simplified scenarios:

- `No AC`: buildings exchange heat with sunlit walls, shaded walls, roof, street fabric, canyon air, and broader city air.
- `AC`: cooling extracts indoor heat, rejects it outdoors with compressor energy, and changes how much heat the building stores and releases later.

The model is meant for directional exploration and parameter sensitivity, not as a validated urban canopy or building-energy model.

## Run Locally

```sh
bun install
bun run dev
```

Then open the local URL printed by Vite.

## Notes

The UI exposes sliders for weather, building density, thermal mass, solar input, canyon mixing, longwave cooling, envelope leakage, window exchange, AC schedule, setpoints, capacity, and COP.

Negative `Night average delta` means the AC scenario is cooler outside from 21:00 to 06:00; positive means it is warmer.

The app supports French/English, light/dark mode, and URL parameters for sharing changed settings.
