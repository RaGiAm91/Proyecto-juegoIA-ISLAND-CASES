# Island Cases

Juego 3D multijugador de investigación y misterio en una mansión isleña de 1954. Dos desarrolladores, coste 0 €, hasta 20 jugadores en parejas, sin respawn y con espectador.

## Estado actual

- Fase 0 y primera demo multijugador en construcción.
- El objetivo inmediato es una escena 3D estable con dos personajes visibles y sincronizados.
- Investigación, pistas, eventos, terror, muerte, espectador, chat y puntuación quedan fuera de esta fase.

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
