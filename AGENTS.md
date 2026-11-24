# Island Cases

Juego 3D multijugador de investigación y misterio en una mansión isleña de 1954. Dos desarrolladores, coste 0 €, hasta 20 jugadores en parejas, sin respawn y con espectador.

## Estado actual

- Fase 0 completada para la demo base: escena 3D, multijugador, lobby por parejas, pistas e inspección.
- Los eventos disparados al registrar pistas, la muerte sin respawn y el espectador ya están implementados.
- El terror ambiental, el chat y la puntuación quedan para fases posteriores.

## Comandos

- `npm install`: instala todos los workspaces.
- `npm run dev`: compila `shared`, arranca servidor y cliente.
- `npm run build`: compila `shared`, `server` y `client`.
- `npm run typecheck`: TypeScript de los tres workspaces.
- `npm run lint`: ESLint 10 + typescript-eslint.
- `npm test`: Vitest.
- `npx playwright install chromium`: instala el navegador de E2E.
- `npm run test:e2e`: prueba de dos jugadores con Playwright.
- `npm run check:boundaries`: dependency-cruiser.
- `npm run format:check`: Prettier.

Cliente: `http://localhost:5173`. Servidor: `http://localhost:2567`. Health: `http://localhost:2567/health`.

## Stack fijado

- Node 24.11.1, npm workspaces, ESM.
- TypeScript 5.9.3. No subir a TypeScript 7: typescript-eslint 8.72.2 admite `<6.1.0`.
- Cliente: Vite 8.3.8, React 19.3.1, CSS Modules, Babylon 9.36.0, Zustand 5.1.0.
- Servidor: Express 5.3.0, Colyseus 0.18.12, `@colyseus/schema` 5.0.48, Zod 4.6.7.
- Persistencia futura: SQLite con `better-sqlite3`; no Prisma.
- Tooling: ESLint 10.15.0, Prettier 3.10.1, Vitest 5.1.0, Playwright 1.65.1.

## Colyseus 0.18

Consultar `.agents/skills/colyseus/SKILL.md` antes de tocar salas o estado. Reglas clave:

- Servidor con `defineServer` y `defineRoom`; no usar `new Server()`.
- Estado con el builder `schema({ ... }, "Nombre")`; no usar decoradores.
- Cliente con `@colyseus/sdk`, no `colyseus.js`.
- `client.sessionId`, no `client.id`.
- Recolocación: `onDrop` + `allowReconnection`, `onReconnect`, y eliminar en `onLeave`.
- Callbacks de estado con `Callbacks.get(room)`.
- Solo el servidor muta el estado. Validar todos los mensajes.

## Fronteras

- `client` y `server` pueden importar `shared`.
- `shared` no importa cliente, servidor, DOM, Node, Babylon, React ni Express.
- `client` no importa `server`.
- `server` no importa `client`.
- El servidor posee movimiento autoritativo, equipos, pistas, eventos, muertes, puntuación y chat.
- El cliente posee cámara, input, UI, predicción local, audio y rendimiento.

## Convenciones

- Sin comentarios en código salvo que sean imprescindibles.
- Imports relativos en `shared`/`server` con extensión `.js`; en `client` sin extensión.
- Nombres de mensajes con namespace: `player:*`, `match:*`, `lobby:*`.
- Mantener el estado sincronizado pequeño; no meter datos que el cliente no necesita.
- No añadir dependencias sin comprobar versión, licencia y necesidad real.
- No tocar `#opcional/`; queda ignorado.

## Calidad

Antes de cerrar una fase: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run check:boundaries`. Sin errores P0/P1, sin warnings de consola y con la demo probada en dos navegadores.

## Fuentes de assets

- Modelos: Fab (antes Sketchfab) para `.glb` descargables y gratuitos con detalle alto; filtrar por Downloadable y Free. Útil para edificios, vehículos y escenarios complejos.
- Modelos: Poly Haven para estilo realista con materiales PBR completos; bajar a 2K en `.gltf`/`.glb` para equilibrar calidad y memoria en portátil.
- Modelos: Quaternius y KayKit para packs stylized/low poly coherentes y rápidos de integrar.
- Modelos y audio: Kenney Assets, packs CC0 coherentes y ligeros: https://kenney.nl/assets
- Personajes: Mixamo para humanoides y animaciones listas como correr, saltar o atacar.
- Formato preferido: `.glb`, porque evita rutas rotas de texturas externas al entregar el proyecto.
- Límite cómodo en portátil: 15.000 a 50.000 triángulos y texturas de 2048×2048 px.
- Validar modelos antes de importarlos arrastrándolos a `donmccurdy.com` para comprobar aspecto, tamaño real y nombres de animaciones.
- SFX: Freesound filtrando por CC0; Kenney Audio en `.ogg`/`.mp3` bajo CC0; Sonniss GDC Game Audio Bundles con efectos gratuitos libres de regalías.
- SFX retro: jsfxr y ChipTone para generar saltos, láseres y explosiones exportables a `.wav` o `.mp3`.
- Música: Pixabay para pistas descargables en `.mp3`; OpenGameArt para loops de videojuegos; Incompetech de Kevin MacLeod con mención obligatoria en créditos; Free Music Archive para instrumental, ambient y experimental bajo Creative Commons.
- Audio web: usar `.mp3` o `.ogg`; iniciar la música tras la primera interacción del usuario porque los navegadores bloquean el autoplay; valorar Howler.js para loops, volúmenes independientes y sonidos simultáneos.
