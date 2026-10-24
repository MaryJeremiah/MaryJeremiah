# Mary Jeremiah’s personal AI assistant

A local browser app with AI chat, saved conversations, chat export, an editable assistant name, optional dictation, and spoken replies. The GitHub profile README is preserved.

## Launch

Install Node.js 22 or newer from https://nodejs.org if it is not installed. No dependency installation is needed.

- **Windows:** double-click `launch.bat`.
- **macOS:** open `launch.command`. If needed, run `chmod +x launch.command` in Terminal first.
- **Linux:** run `sh launch.command`.
- **Any system:** run `npm start`, then visit http://localhost:3000.

Keep the terminal open while using the assistant. Press Ctrl+C to stop it.

Open **Settings**, add your OpenAI API key, and save. The default model is `gpt-4.1-mini`; your API account must have access and available billing credit. ChatGPT subscriptions do not include API usage. Create/manage keys at https://platform.openai.com/api-keys. Never paste your key into chat or commit it to GitHub.

The assistant is named Maya by default. Change the name and speech preference in Settings.

## Your data

Chats and preferences are saved in the current browser on this device. Export chats from Settings to keep a JSON backup. Clearing browser storage removes them. Prompts and recent conversation history are sent to OpenAI for AI replies; the app requests `store: false`. Consult OpenAI’s API data policies for provider-side retention.

The API key is stored in `.assistant-config.json` on this computer with restrictive file permissions. That file is ignored by Git. For managed setups, use the `OPENAI_API_KEY` environment variable instead; it takes precedence over the settings key. Optional `OPENAI_MODEL` and `PORT` variables override defaults. The server only listens on the local computer. Do not expose it publicly without adding authentication and HTTPS.

Voice features depend on the browser and permissions. Dictation may use the browser vendor’s speech service. Read-aloud uses available system/browser voices. Text chat works without voice support.

The assistant helps with writing, learning, coding, and planning. It cannot browse the web, control your computer, send messages, or access accounts. It is not an autonomous background agent.

## Verification

Run `npm test` for HTTP endpoint checks, cross-origin protections, invalid conversation checks, and a mocked AI-provider round trip. Live AI replies require your own configured key and network access to `api.openai.com`.
