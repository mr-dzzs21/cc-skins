# Screenshots

The README's screenshots are recorded from a real Claude Code session, not drawn: `drive.py` runs `claude` in a pseudo-terminal, [pyte](https://github.com/selectel/pyte) keeps the screen, and each screen is saved as cells (character, colors, bold). `to_svg.py` turns cells into an SVG terminal window, with borders, powerline caps and arrows drawn as shapes, so the pictures need no Nerd Font and look the same in every browser.

```sh
python3 -m venv .work/venv && .work/venv/bin/pip install pyte==0.8.2
.work/venv/bin/python scripts/screens/capture.py .work/shots   # about eight minutes
python3 scripts/screens/build.py .work/shots                   # writes docs/hero.svg, docs/screens/, docs/social-preview.*
```

`capture.py` needs a logged-in Claude Code with cc-skins installed. It makes a small demo repository in a temporary folder and asks one short question there, twice (150 columns for the panes, 110 for the chat in ten skins), so the context, cost and turn line have real figures; that uses a little of your plan. It backs your cc-skins settings up first and puts them back after: meanwhile the bar uses the Arrows-only icons and shows sample limit figures (42 % and 23 %, then 72 % and 91 % for the warning colors) in place of yours.

| File | Does |
|---|---|
| `drive.py` | Runs a program in a pseudo-terminal through steps (`send`, `key`, `wait`, `until`, `seed`, `shot`) and saves screens as JSON |
| `capture.py` | The steps for the README's screens, the demo repository, the settings backup |
| `to_svg.py` | One screen (or a crop of it) as an SVG terminal window, in a skin's terminal colors |
| `animate.py` | Several screens as one SVG fading from one to the next |
| `social.py` | The 1280×640 preview GitHub shows for a shared link |
| `build.py` | All of the above, from a capture folder to `docs/` |

GitHub takes the social preview only through the repository's **Settings → General → Social preview**: upload `docs/social-preview.png` there.
