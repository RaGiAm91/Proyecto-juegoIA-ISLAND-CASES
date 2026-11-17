# Arquitectura

## Monorepo

```text
client/   Vite + React + Babylon + Colyseus SDK
server/   Express + Colyseus + reglas autoritativas
shared/   protocolo, tipos, constantes, validación Zod y matemáticas puras
```

`shared` se compila a `dist` y se consume como workspace. `client` y `server` no se importan entre sí.

## Paquete shared

- `constants.ts`: versión de protocolo, nombre de sala, límites, ritmos y constantes de predicción.
- `types.ts`: entrada de movimiento, opciones de entrada, vista de jugador y vista de estado.
- `messages.ts`: nombres y payloads tipados de mensajes cliente-servidor.
- `validation.ts`: esquemas Zod para entradas y nombres.
- `math.ts`: movimiento planar, normalización, límites, interpolación angular y suavizado.
- El servidor aplica `applyMovement` en su tick autoritativo y el cliente usa la misma función para predicción local.

## Flujo de red

```text
input del cliente -> mensaje player:input -> MatchRoom
MatchRoom -> estado autoritativo -> delta patches -> clientes
cliente -> predicción local + corrección -> personaje local
cliente -> interpolación -> personajes remotos
```

- Tick fijo del servidor: 20 Hz.
- Input del cliente: 30 Hz.
- Estado sincronizado mínimo: posición, rotación, nombre y conexión.
- El servidor valida y normaliza el movimiento; nunca confía en posiciones enviadas por el cliente.
- El cliente predice su movimiento con la misma función pura y corrige si el error supera 0,75 m.

## Colyseus 0.18

- `defineServer`/`defineRoom` en `server/src/app.config.ts`.
- `schema({ ... }, "Nombre")` en `server/src/rooms/schema/MatchState.ts`.
- `MatchRoom` usa `setFixedTimestep` y mensajes declarativos con `validate`.
- El cliente usa `@colyseus/sdk`, `Callbacks.get(room)` y `onDrop`/`onReconnect`/`onLeave`.

## Escena 3D

- Babylon `Engine` + `Scene` + `ArcRotateCamera`.
- Imports específicos de Babylon y side-effects de `Ray`/builders para mantener el bundle bajo control.
- Escena de prueba construida con primitivas y materiales PBR.
- Personajes placeholder con cuerpo, cabeza, sombrero, sombra y placa de nombre.
- La cámara sigue al jugador local; los remotos se interpolan.

## Siguientes cortes verticales

1. Colisiones y navegación por la mansión.
2. Lobby, equipos y parejas.
3. Expediente, pistas e inspección.
4. Eventos, muerte y espectador.
5. Puntuación, resultados y administración.
