# Island Cases

Juego 3D multijugador de investigación y misterio en una mansión isleña de 1954. Este repositorio contiene la base técnica y la primera demo de movimiento sincronizado.

## Requisitos

- Node.js 24+
- npm 11+
- Windows, macOS o Linux

## Arranque

```bash
npm install
npm run dev
```

- Cliente: http://localhost:5173
- Servidor: http://localhost:2567
- Health: http://localhost:2567/health

Abre dos navegadores o dos pestañas, entra con nombres distintos y comprueba que cada personaje ve y mueve al otro.

## Prueba automática

```bash
npx playwright install chromium
npm run test:e2e
```

El test arranca servidor y cliente, abre dos contextos aislados, comprueba que ambos jugadores aparecen y verifica que el movimiento de uno se sincroniza en el otro.

## Controles

- `WASD`: mover.
- Ratón: orbitar la cámara.
- Rueda: zoom.

## Ramas y CI

- `ramon` y `adil`: cada push ejecuta build, lint, typecheck, tests y E2E. Si pasa, el commit se fusiona en `pruebas`.
- `pruebas`: ejecuta la misma batería sobre la integración de ambas ramas. Si pasa, se fusiona en `main`.
- Si el juego falla o alguna prueba no pasa, el commit permanece solo en su rama.

El workflow está en `.github/workflows/ci.yml`.

## Estado

Esta fase solo cubre la base 3D y el multijugador. La investigación, los eventos, el terror, la muerte, el espectador, el chat y la puntuación se añadirán por fases.

## Documentación

- [Instalación](docs/INSTALL.md)
- [Ejecución y LAN](docs/RUNNING.md)
- [Arquitectura](docs/ARCHITECTURE.md)
