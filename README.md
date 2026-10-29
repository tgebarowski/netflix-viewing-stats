# Netflix Viewing History

Turn the CSV that Netflix gives you into about fifty statistics — years, binges,
genres, languages, countries, streaks and a lot of superlatives.

Everything runs in the browser. Your viewing history is never uploaded anywhere.

**[Open the dashboard →](https://USERNAME.github.io/netflix-viewing-stats/)**

![The overview tab](docs/screenshot.jpg)

## What you need to know first

Netflix's export has exactly two columns: **title** and **date**. That is the
whole file. Everything else this dashboard shows is either derived from those
two columns or looked up from a metadata API, and it is worth knowing which is
which before you quote any of it at a party.

- **Hours are estimates, not measurements.** Netflix does not tell you how long
  you watched. Hours are episodes watched multiplied by a runtime from TMDB or
  TVMaze. Where a title never matched, the runtime falls back to the median of
  resolved titles sharing a genre. Every affected card carries an *"N% measured"*
  badge so you can see how much of the figure is real.
- **There are no timestamps.** Dates only. Hour-of-day and late-night stats are
  impossible; "the day you watch most" means a weekday and a calendar date.
- **Partial views are missing.** Netflix logs a row once you have watched enough
  of something, so totals skew slightly low.
- **Series structure is inferred from the title string.** Netflix has used two
  formats over the years — `Show: Season 2: Episode Title` and the older
  `Show: Episode Title`. Both are parsed, and ambiguous single titles are checked
  against TMDB. Anything it gets wrong can be corrected on the **Data** tab.
- **Genre, language and country totals double-count by design.** A title with
  three genres counts in all three, so those totals exceed the number of titles.

## Getting your data

1. Sign in and open [netflix.com/viewingactivity](https://www.netflix.com/viewingactivity)
2. Choose the profile you want at the top of the page
3. Scroll to the bottom and click **Download all**
4. Drop the resulting `NetflixViewingHistory.csv` onto the dashboard

There is also an **Explore with sample data** link on the landing page if you
just want to look around. The sample is synthetic.

## The TMDB key

Without a key the dashboard falls back to [TVMaze](https://www.tvmaze.com/api),
which is free and needs no signup but covers **series only** — films get no
genre, language, country or runtime.

A free [TMDB key](https://www.themoviedb.org/settings/api) takes about a minute
to get, needs no payment details, and unlocks films plus age ratings, release
dates, production countries, posters and total episode counts. Paste it into
**Settings → TMDB API key**. It is stored in your browser and sent only to
`api.themoviedb.org`.

Enrichment is a one-time cost; results are cached locally. You can start without
a key and add one later — anything fetched during a keyless run is automatically
re-queued once a key is present. **Settings → Export cache** writes a JSON file
you can import elsewhere so you never re-fetch.

## Running it locally

```bash
git clone https://github.com/USERNAME/netflix-viewing-stats.git
cd netflix-viewing-stats
python3 -m http.server 8000
```

Then open <http://localhost:8000>. A server is needed because the app is built
from ES modules, which browsers refuse to load over `file://`.

There is no build step, no package manager and no dependencies.

## How it works

Three layers stacked on top of a two-column CSV:

| Layer | What it does |
|---|---|
| `src/data/csv.js` | Parses the export, including quoted fields and locale-dependent dates |
| `src/data/classify.js` | Turns title strings into shows, seasons and episodes |
| `src/data/metadata.js` | Resolves titles against TMDB, falling back to TVMaze |
| `src/data/stats.js` | Every aggregation, computed over the filtered row set |
| `src/ui/` | Charts, cards and chrome |

Charts are hand-written SVG — there is no charting library, because the handful
of chart types needed here are a few hundred lines in total and a dependency
would have been the larger half of the project.

Cards are self-registering. A card is an object with an `id`, a `tab`, a width
and a `build(ctx)` that returns a DOM node; dropping a new one into
`src/ui/cards/` and importing it from `src/ui/cards/index.js` is the whole
process of adding a statistic.

```
index.html              markup and panel scaffolding
src/
  core/                 DOM helpers, formatting, storage, the refresh bus
  data/                 parsing, classification, metadata, statistics
  ui/
    cards/              one module per tab
    charts.js           SVG primitives
    ...                 filters, panels, settings, rendering
sample/                 synthetic data for the demo
```

## Deploying your own copy

The included workflow publishes the repository root to GitHub Pages on every
push to `main`. Enable it under **Settings → Pages → Build and deployment →
Source: GitHub Actions**, then update the dashboard link at the top of this file.

## Contributing

Issues and pull requests are welcome. There are no tests and no linter; keep
changes dependency-free and match the surrounding style.

## License

[MIT](LICENSE).

Not affiliated with, endorsed by, or connected to Netflix. Metadata comes from
[TMDB](https://www.themoviedb.org/) and [TVMaze](https://www.tvmaze.com/);
this product uses the TMDB API but is not endorsed or certified by TMDB.
