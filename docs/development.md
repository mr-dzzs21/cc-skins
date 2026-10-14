# Development

[← cc-skins](../README.md) · [All docs](README.md)

## How it works

cc-skins is a Claude Code plugin made of:

- `themes/*.json`: color themes in Claude Code's custom-theme format (`name`, `base`, `overrides`).
- `hooks/register.tsx`: function hooks that draw the `AbovePrompt` band (the usage bar), rewrite the `Spinner` words, draw the `TurnDuration` line, and serve `/skin`. Usage figures come from the `session.measure` event, pushed after each turn, so nothing polls.
- `hooks/hud.tsx`: the usage bar in both styles: which pieces show at which width, their colors, and how they're drawn.
- `hooks/chat.tsx`: the chat cards. Tool calls keep Claude Code's own drawing inside the card, so nothing about them is lost.
- `hooks/skins.ts`: the skin definitions. A new skin is one entry there plus one theme file.

## From a clone

```sh
git clone https://github.com/mr-dzzs21/cc-skins && cd cc-skins
claude --plugin-dir .            # run Claude Code with the plugin loaded; edits hot-reload
claude plugin validate .         # check manifest, hooks and state contract
claude plugin test .             # run tests/*.test.tsx against the engine
python3 scripts/check_assets.py  # JSON, schemes, scripts, one theme and scheme per skin, the pictures, versions
```

CI runs the last three on every push and pull request, with Claude Code pinned, no login and no secrets (nothing calls a model).

Once Claude Code has loaded the folder, it writes the API types to `.claude-plugin/types/` and a `tsconfig.json`, so `tsc -p .` type-checks the plugin.

The pictures: `npx -y tsx@4.19.2 scripts/render_previews.ts` draws the banner and the skin gallery from the skins themselves; [`scripts/screens`](../scripts/screens) records the screenshots from a real session and builds them into `docs/`.

New built-in skins go through `scripts/add_skins.py <skins.json>`: it writes the skin, its `/theme` theme, its terminal schemes and its row in `docs/skins.md`, and refuses a block whose text would not read. Then redraw the gallery.

The sounds in `sounds/` are synthesized by `scripts/make_sounds.py` (`python3 scripts/make_sounds.py sounds`), so they carry the project's license.

Contributions are welcome, especially new skins: see [CONTRIBUTING.md](../CONTRIBUTING.md).
