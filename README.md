# Pointed

Pointed is an iOS-first scoreboard built with Expo 57, Expo Router, React Native,
React Native Web, TypeScript, and SQLite. The same project runs in Expo Go and as
a statically exported installable web app.

## Local development

Install dependencies and start the web app:

```bash
npm install
npm run web
```

Open the URL shown by Expo (normally `http://localhost:8081`). `localhost` is a
secure-context exception in desktop browsers, so Expo SQLite can persist data
there. To exercise the production output locally:

```bash
npx expo export -p web
npx expo serve dist
```

Run the native app with `npm run ios`, `npm run android`, or `npx expo start` and
Expo Go as before.

## iPhone Safari testing

Browser SQLite requires a secure context. A LAN URL such as
`http://192.168.x.x:8081` is not sufficient, even though the page itself may
load. Use one of these options:

1. Deploy `dist` to an HTTPS preview URL with the headers described below.
2. Run `npx expo start --web --tunnel` and use the HTTPS tunnel URL Expo prints.
   The tunnel command may ask to install Expo's tunnel helper outside this
   project.
3. Use a locally trusted HTTPS certificate and `npx expo start --web --https`.
   The certificate must be trusted by the iPhone; merely bypassing a Safari
   certificate warning is not a reliable secure-context test.

Keep the computer and iPhone online while using a development or preview URL.
Open the HTTPS URL in Safari, not a Private Browsing tab.

## Production export and hosting

Build the static site with:

```bash
npx expo export -p web
```

Upload the contents of `dist` to an HTTPS static host. The host must:

- serve clean Expo Router paths such as `/scoreboard` and `/history`;
- preserve the files under `/_expo`, `/assets`, and `/icons`;
- serve `.wasm` files with `Content-Type: application/wasm`;
- add these headers to every HTML, JavaScript, worker, WASM, and asset response:

```text
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```

Expo emits the same headers in `dist/_expo/.routes.json` for EAS Hosting. The
export also includes `dist/_headers`, which is recognized by hosts such as
Netlify and Cloudflare Pages. For other hosts, configure their equivalent global
header rules. A host that cannot set these headers is not suitable for Pointed's
Expo SQLite web build.

The app stores browser data in the origin-private file system. Data is scoped to
the exact origin, so changing the protocol, hostname, subdomain, or port creates
a different browser data store. Safari Private Browsing does not provide the
required persistent storage.

## Install on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap Share.
3. Tap **Add to Home Screen** (use **Edit Actions** if it is hidden).
4. Confirm the name **Pointed**, then tap **Add**.
5. Launch Pointed from its Home Screen icon. It opens in standalone mode.

## Persistence check

1. Create a named game with at least two players.
2. Enter several scores, then use Undo and Redo.
3. Open History and restore an earlier point.
4. In Settings, choose a non-system appearance and enable negative scores.
5. Return Home, remove Pointed from the app switcher, and launch it again from
   the Home Screen icon.
6. Confirm the saved game, scores, history, restored state, layout, appearance,
   and negative-score setting remain available.

Do not clear Safari website data during this test. Web data is local to that
browser and origin; Pointed has no account or cloud synchronization.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npx expo export -p web
```

Offline caching is intentionally not configured yet. A network connection is
currently required to load the exported application files, including when the
app is launched from the Home Screen.
