# Mary Jeremiah’s personal AI assistant

A local browser app with AI chat, saved conversations, chat export, an editable assistant name, optional dictation, and spoken replies. The GitHub profile README is preserved.

## Launch

Install Node.js 22 or newer from https://nodejs.org if it is not installed. No dependency installation is needed.

- **Windows:** double-click `launch.bat`.
- **macOS:** open `launch.command`. If needed, run `chmod +x launch.command` in Terminal first.
- **Linux:** run `sh launch.command`.
- **Any system:** run `npm start`, then visit http://localhost:3000.

Keep the terminal open while using the assistant. Press Ctrl+C to stop it.

## Free local setup (recommended for 16 GB RAM)

1. Install Ollama for Windows from https://ollama.com/download/windows and open it.
2. Double-click `setup-free.bat`. It downloads `llama3.2:3b` (a few GB) and launches Maya. Keep Ollama running. If Windows cannot find Ollama just after installation, close and reopen the terminal/launcher.
3. In Maya's **Settings**, choose **Ollama — free on this laptop** and use model `llama3.2:3b`. Click **Save settings**. No API key or API billing is required.
4. Send a short message. The first reply can take longer while the model loads. An older laptop may need a few minutes for replies; it will use CPU and shared system memory.

Use `launch.bat` on future visits. The downloaded model can run text chat without internet. A small local model is less capable than larger cloud models. Local mode sends chat requests only to Ollama at `127.0.0.1:11434`, with an 8K context and up to 1024 generated tokens per reply. Long chats may lose earlier context. Optional browser dictation may still use an online service. This setup does not run GPT-6 locally.

### Update an earlier Maya download

Stop the running assistant with Ctrl+C. Download and extract the latest branch ZIP into a new folder. Launch the new copy on the same localhost port to retain browser-saved chats. Old API configuration is kept only in the old folder; it is not needed for local mode. Use the new `setup-free.bat` launcher for the steps above.

## Optional paid OpenAI setup

In **Settings**, select **OpenAI — paid API**, add your OpenAI API key, and save. The default cloud model is `gpt-4.1-mini`; your API account must have access and available billing credit. ChatGPT subscriptions do not include API usage. Create/manage keys at https://platform.openai.com/api-keys. Never paste your key into chat or commit it to GitHub.

The assistant is named Maya by default. Change the name and speech preference in Settings.

## Your data

Chats and preferences are saved in the current browser on this device. Export chats from Settings to keep a JSON backup. Clearing browser storage removes them. In OpenAI mode, prompts and recent conversation history are sent to OpenAI for AI replies; the app requests `store: false`. Consult OpenAI’s API data policies for provider-side retention.

The API key is stored in `.assistant-config.json` on this computer with restrictive file permissions. That file is ignored by Git. For managed setups, use the `OPENAI_API_KEY` environment variable instead; it takes precedence over the settings key. Optional `OPENAI_MODEL` and `PORT` variables override defaults. The server only listens on the local computer. Do not expose it publicly without adding authentication and HTTPS.

Voice features depend on the browser and permissions. Dictation may use the browser vendor’s speech service. Read-aloud uses available system/browser voices. Text chat works without voice support.

The assistant helps with writing, learning, coding, and planning. It cannot browse the web, control your computer, send messages, or access accounts. It is not an autonomous background agent.

## Verification

Run `npm test` for HTTP endpoint checks, cross-origin protections, invalid conversation checks, mocked cloud and local AI round trips, local model readiness, and missing-Ollama errors. Live local replies require Ollama and the downloaded model. Live OpenAI replies require your own configured key and network access to `api.openai.com`. Automated tests use simulated provider responses; model speed and answer quality must be checked on your laptop.
