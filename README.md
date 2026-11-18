# NBA Analytics (Netlify + installable app)

Static site — no build step. Netlify publishes this folder as-is (`netlify.toml`).

- `index.html`, `app.css`, `players.js` — the dashboard
- `dash.js` — loads `data/*.json`, runs the calculations, redraws on resize
- `data/` — the only files that change daily:
  - `nba_defense_2026_27.json` (all 30 defenses)
  - `nba_offense_2026_27.json` (all 30 offenses)
  - `players_last10.json` (LAL, SAS, NYK, PHI, GSW, TOR, DET — last 10 games)
  - `updated.json` (`{"at": ISO time, "latest_game": "YYYY-MM-DD"}` — shown under the title)
- `manifest.webmanifest`, `sw.js`, `icons/` — installable app (PWA) + offline support

Daily updates: replace the four files in `data/` and push; Netlify redeploys automatically.
