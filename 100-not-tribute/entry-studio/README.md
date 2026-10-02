# Entry Studio

Entry Studio is integrated into the desktop app. There is no local web server and
no browser step anymore.

- App page: `umbrella-app/app/entry-studio.html` (+ `umbrella-app/app/assets/js/entry-studio-page.js`)
- Service (in-process): `umbrella-app/electron/services/entry-studio-service.js`
- Converter tools it drives: `animation/tools/` (staged into packaged builds at
  `app/tools/entry-studio/tools`)
- Folder settings persist in the app user-data folder (`entry-studio-config.json`);
  the work tree lives at `entry-studio/BakeMe` in the same place.

The legacy standalone build (Node HTTP server on 127.0.0.1:7878) remains in the
flagship repository at `AuroraForge_WWE_PC-Game_Modding_Tool\entry-studio\` for
history only. Do not add a second copy of its sources here.
