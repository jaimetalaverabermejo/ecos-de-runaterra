# Ecos de Runaterra — Project Structure

This project is organized by domain so that adding ~170 champions, many regions, items and mechanics does not create flat folders.

## Champions — data

```text
src/data/champions/<champion-id>/
├── definition.json     # name, tags, passive and skill IDs
├── stats.json          # base stats only
├── progression.json    # future level/mastery curves
├── traits.json         # future champion-specific trait rules
└── forms/              # future form/skin data
```

## Champions — visual assets

```text
public/assets/champions/<champion-id>/
├── overworld/
│   └── overworld.png
├── battle/
│   ├── front.png
│   └── back.png
├── ui/
│   ├── portrait.png
│   └── icon.png
├── icons/
│   ├── passive.png
│   ├── q.png
│   ├── w.png
│   ├── e.png
│   └── r.png
├── forms/<form-id>/
└── legacy/             # temporary old assets only
```

## World / maps

Both map data and visual assets use the same Region → Zone hierarchy.

```text
src/data/world/regions/<region-id>/zones/<zone-id>/
├── map.json            # dimensions, collisions, spawn, transitions
├── encounters.json     # wild Eco encounter table
├── npcs.json           # future NPC placement/data
├── interactions.json   # future chests, signs, switches, etc.
└── transitions.json    # optional when transitions become complex

public/assets/world/regions/<region-id>/zones/<zone-id>/
├── overworld.png
├── battle-background.png
├── tiles/              # future Tiled tilesets
├── props/
└── ambience/
```

Current Bandle test zone:

```text
world/regions/bandle-city/zones/portal-clearing/
```

## Items

Items are grouped by tier first, then by functional family.

```text
src/data/items/
├── components/
│   ├── attack/
│   ├── power/
│   ├── health/
│   ├── defense/
│   ├── resistance/
│   └── utility/
├── epic/<family>/
└── legendary/<family>/

public/assets/items/
├── components/<family>/<item-id>/icon.png
├── epic/<family>/<item-id>/icon.png
└── legendary/<family>/<item-id>/icon.png
```

Recipes remain data-driven and reference item IDs rather than file paths.

## Stats

```text
src/data/stats/
├── definitions.json    # name, abbreviation, display order
├── scaling.json        # future generic growth rules
└── formulas.json       # future configurable balance constants
```

Champion values remain inside each champion's `stats.json`.

## Skills

During the vertical slice the shared skill registry remains in `src/data/skills/`. When the roster grows, use:

```text
src/data/skills/champions/<champion-id>/
├── passive.json
├── q.json
├── w.json
├── e.json
└── r.json
```

## Mechanics / systems

Each mechanic gets its own folder instead of adding more files to one flat `systems` directory.

```text
src/systems/
├── combat/
├── link/
├── progression/
├── inventory/
├── equipment/
├── encounters/
├── save/
└── dialogue/
```

New mechanics should expose reusable services/engines and must not be coded specifically for individual champions.

## UI

```text
src/ui/
├── theme/
│   └── UiTheme.ts
├── components/
│   └── UiKit.ts
├── battle/
├── menu/
└── dialogue/
```

Shared colors, fonts, panels and buttons must come from the UI theme/components instead of being restyled independently in every scene.

## Rule for new content

When adding content, create its final folder structure immediately. Do not place temporary assets or JSON files in a generic root folder unless they truly apply globally. If an asset is temporary, put it in a clearly named `legacy/` or `debug/` folder so it cannot be mistaken for production content.
