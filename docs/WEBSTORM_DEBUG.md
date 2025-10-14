WebStorm: Debug the Electron Renderer

Goal
- Run the app.
- Attach WebStorm to the renderer so breakpoints in src/renderer/**/*.ts(x) hit.

1) Dev server + Electron together
   - In WebStorm: View > Tool Windows > NPM
   - Double‑click: dev:debug
   - This starts the dev server (http://localhost:8080) and launches Electron with renderer debug on port 9222.

2) Attach WebStorm to the renderer
- Run > Edit Configurations…
- Click + and choose: Attach to Node.js/Chrome
- Name: Attach Renderer (9222)
- Host: localhost, Port: 9222
- Apply, then Run this configuration after the Electron window opens.
- Set breakpoints in src/renderer/**/*.ts/tsx — they should bind and hit.