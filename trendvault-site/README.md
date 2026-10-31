# TrendVault

Competitive image database with AI tagging, hosted on Netlify.

## How it's organized

- `public/index.html` — the app.
- `netlify/functions/claude.mjs` — a small server function. The app sends AI requests here with the shared passcode, and the function adds the Anthropic API key and forwards them. The key never reaches the browser.
- `netlify.toml` — tells Netlify where the app and the function live.

## Settings in Netlify

Site configuration → Environment variables:

| Name | Required | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Your Anthropic API key |
| `APP_PASSCODE` | yes | The shared passcode people type into the app |
| `CLAUDE_MODEL` | no | Defaults to `claude-sonnet-5` |

After changing any of these, trigger a new deploy so the function picks them up.

## Updating the app

Replace `public/index.html` in GitHub. Netlify redeploys on its own within a minute or two.

## Changing the passcode

Change `APP_PASSCODE` in Netlify and redeploy. Everyone gets asked for the new one the next time they use AI tagging.
