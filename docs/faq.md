# Questions and fixes

[← cc-skins](../README.md) · [All docs](README.md)

## The bar doesn't show

First, `claude --version`: cc-skins needs 2.1.295 or newer, and says so when it starts on an older one. The stable update channel can be a week or two behind: `/config` → Auto-update channel → latest (with Homebrew: the `claude-code@latest` cask), or `claude install latest`.

Check that the plugin is on: `claude plugin list` should list `cc-skins@cc-skins` as enabled; if not, `claude plugin enable cc-skins@cc-skins`. A Claude Code that was already running when you installed or updated (background sessions too) needs `/reload-plugins`. `/skin hud on` brings back a bar you hid.

## Boxes or question marks where icons should be

Your font has no Nerd Font icons: `/skin glyphs powerline` keeps the arrows and uses short words for the icons (fonts with Powerline symbols, such as Cascadia Code), `/skin glyphs plain` works with any font. Or install a Nerd Font (MesloLGS NF, or CaskaydiaCove Nerd Font on Windows), set it in your terminal and run `/skin glyphs nerd`.

## The limits are behind, or show `~`

The 5h and 7d meters show up on Pro, Max and Team plans. Claude Code learns them with each reply, so they are as current as this session's last reply: usage from another session or device shows up with the next reply, within a minute from another session on the same machine, or at once with a click on a limit (`/skin limits`). A reading that may be behind (none this session yet, or older than ten minutes) is marked `~49%`. With an API key you see context and cost.

## Is the cost what I pay?

It is what Claude Code's own ledger says the session cost at API prices, the same figure `/cost` shows. On a Pro, Max or Team plan you don't pay it per token; it shows how much you used.

## Claude Code's own colors didn't change

Those come from the color theme, which Claude Code keeps yours to choose: open `/theme` and pick `cc-skins · <your skin>`. Skins and themes mix freely. The terminal's background and font come from your terminal app: [`extras/terminal`](../extras/terminal) has a scheme for each skin.

## Does it slow Claude Code down, or send anything?

No. It makes no network requests, and runs a command only when you ask: `git status` when you open the changed files (or after each reply, with the Git status extra on), `/usage` when you ask for live limits. Its figures come from Claude Code with each reply; the branch is read from `.git/HEAD` at the start and after each turn; once a minute it moves the reset countdowns on. See [Privacy and safety](privacy.md).
