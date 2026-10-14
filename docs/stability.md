# How cc-skins stays working

[← cc-skins](../README.md) · [All docs](README.md)

cc-skins builds on Claude Code's plugin hooks, which are new and still change. No plugin can promise that a future Claude Code never breaks it; this is what cc-skins does so that you are not the one who finds out, and so that you never get a version that wasn't tested.

## You get releases, not work in progress

The marketplace you install from points at a release tag, not at the code being worked on. A release is made by [`scripts/release.py`](../scripts/release.py), which tags a version only once CI has passed for that exact commit, and only then moves the marketplace to it. `claude plugin update cc-skins@cc-skins` brings you the newest release, never anything in between.

## Every change is tested where you use it

Every push and pull request runs, on **macOS, Windows and Linux**:

- the whole test suite and a strict validation, with the **oldest Claude Code cc-skins supports** and with the **newest**
- an install through the marketplace, as you do it
- the asset checks: themes, schemes, scripts, pictures, links, versions

## Every morning too

A new Claude Code can break a plugin without any change to the plugin. So CI also runs every morning: the tests with the newest Claude Code, and the release you have installed with the newest Claude Code. A failure there reaches the maintainer by mail, before it reaches you.

## A failure in cc-skins never stops Claude Code

Claude Code skips a plugin hook that fails and goes on as if it weren't there: at worst you lose the bar or a card for a moment, never your session. cc-skins also keeps working when parts of Claude Code don't answer: without its store it runs on the defaults, without git it leaves the branch out, and a `/skin` command that fails says so and points to `/skin doctor` instead of an error. Tests cover each of these.

## Too old a Claude Code says so

cc-skins needs Claude Code **2.1.295** or newer. Started on an older one, it tells you what to do (`claude install latest`, or wait for your update channel). The stable channel can be a week or two behind the latest: switch in `/config` → Auto-update channel, or with Homebrew use the `claude-code@latest` cask.

## When something is still wrong

`/skin doctor` shows what cc-skins sees, which versions, your settings, the repository, the store, with hints for what looks off. Paste it into a [bug report](https://github.com/mr-dzzs21/cc-skins/issues/new?template=bug_report.yml).
