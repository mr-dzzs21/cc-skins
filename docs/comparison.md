# cc-skins and status line tools

[← cc-skins](../README.md) · [All docs](README.md)

Claude Code's status line shows the output of a command you configure, below the prompt. Tools such as [ccstatusline](https://github.com/sirmalloc/ccstatusline) build on it, and do it well. cc-skins is a plugin instead, which changes what it can do:

| | cc-skins | A status line tool |
|---|---|---|
| Where | A bar above the prompt, plus the chat, spinner, turn line and theme | One or more lines below the prompt |
| Clicks | Each block opens something inside Claude Code: model and effort picker, usage dashboard, changed files, live limits, settings | Links to open elsewhere, where the tool draws them (ccstatusline has branch, PR and editor links) |
| Look | Skins for the whole UI: 26 built in, your own from one color | Colors, themes and powerline styles for the line |
| Settings | Inside Claude Code: `/skin bar`, in tabs | A config file or the tool's own setup screen |
| Install | `/plugin install`, nothing else | The tool, plus a `statusLine` entry in `settings.json` (some tools write it for you) |
| Network and credentials | None | Depends on the tool: live usage figures may come from Anthropic's API with your stored login |
| What it shows | Model, effort, branch, context, 5h and 7d limits with resets, cost, a compact button; as extras git status, context tokens, cost per hour, session time, clock, Claude Code version | Often much more: ccstatusline alone has dozens of widgets |
| Claude Code | 2.1.296 or newer: function-hook plugins are new and may still change | Any version with a status line |

They don't get in each other's way: keep your status line below the prompt and cc-skins above it.
