WebStorm: Debug the Electron Renderer (simple path)

Goal
- Run the app.
- Attach WebStorm to the renderer so breakpoints in src/renderer/**/*.ts(x) hit.

Pick ONE of these ways to run the app
1) Easiest (recommended): dev server + Electron together
   - In WebStorm: View > Tool Windows > NPM
   - Double‑click: dev:debug
   - This starts the dev server (http://localhost:8080) and launches Electron with renderer debug on port 9222.

2) Two tasks: start dev server first, then Electron
   - Task A: run start:renderer (wait for “Project is running at http://localhost:8080”).
   - Task B: run start:main:debug.

3) No dev server (single task): build then launch main in debug
   - Run: debug:main:standalone
   - This compiles both main and renderer into dist/ and then launches Electron with debug flags.

Attach WebStorm to the renderer
- Run > Edit Configurations…
- Click + and choose: Attach to Node.js/Chrome
- Name: Attach Renderer (9222)
- Host: localhost, Port: 9222
- Apply, then Run this configuration after the Electron window opens.
- Set breakpoints in src/renderer/**/*.ts/tsx — they should bind and hit.

Troubleshooting (renderer)
- Blank window when using start:main:debug:
  - Make sure the dev server is running (use option 1 or 2), or use debug:main:standalone so dist/renderer/index.html exists.
- Breakpoint is gray/unbound:
  - Ensure the app is running and you attached to 9222.
  - Confirm the dev server is on http://localhost:8080 and port 9222 isn’t blocked.
- Nothing shows to attach:
  - Stop and re-run Attach after the Electron window is up.

That’s it — simple ways to run and attach. If you also need to debug the main process later, add a separate “Attach Main (5858)” config, but it isn’t required for renderer debugging.
