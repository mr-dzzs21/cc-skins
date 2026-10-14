# Contributing

Thanks for wanting to help. Ideas, bug reports and new skins are all welcome: open an [issue](https://github.com/mr-dzzs21/cc-skins/issues/new/choose) first for anything bigger than a fix, so we can agree on it before you build it.

## Set up

```sh
git clone https://github.com/mr-dzzs21/cc-skins && cd cc-skins
claude --plugin-dir .            # Claude Code with your copy loaded; edits hot-reload
```

Before a pull request, these must pass (CI runs them too, with no login):

```sh
claude plugin validate .
claude plugin test .
python3 scripts/check_assets.py
```

## A new skin

The quickest way: build it with `/skin create`, then share what `/skin export` copies in a [skin idea](https://github.com/mr-dzzs21/cc-skins/issues/new?template=skin_idea.yml).

To make it a built-in skin, describe it in a JSON file and run `python3 scripts/add_skins.py <file>`: it writes the skin into `hooks/skins.ts`, its `/theme` theme, its Ghostty and iTerm2 schemes and its row in `docs/skins.md`, and refuses a block whose text would not read (WCAG contrast 4.5). Then `npx -y tsx@4.19.2 scripts/render_previews.ts` redraws the skin gallery.

## Code

- State atoms and every function that takes `$` live at the top level of `hooks/register.tsx` (the plugin validator wants them in the hooks module). Pure logic and drawing go in the other files in `hooks/`, with tests in `tests/`.
- Text from outside (a repository, a shared skin, Claude's answer) goes through `cleanLine` or `stripControls` from `hooks/text.ts` before it is drawn or sent anywhere.
- Widths are terminal cells (`displayWidth`), not string lengths.
- cc-skins makes no network requests and reads no credentials: keep it that way.

## Releases

A user-facing change bumps the version in `.claude-plugin/plugin.json` and adds a section at the top of `CHANGELOG.md` with the same version (`check_assets.py` checks the two agree).
