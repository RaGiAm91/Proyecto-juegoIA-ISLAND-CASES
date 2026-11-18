# Arquitectura

## Monorepo

```text
client/   Vite + React + Babylon + Colyseus SDK
server/   Express + Colyseus + reglas autoritativas
shared/   protocolo, tipos, constantes, validación, matemáticas, colisiones, lobby y pistas
```

`shared` se compila a `dist` y se consume como workspace. `client` y `server` no se importan entre sí.

## Paquete shared

- `constants.ts`: versión de protocolo, nombre de sala, límites, equipos, cuenta atrás, ritmos, interacción y predicción.
- `types.ts`: entrada de movimiento, opciones de entrada, vistas de jugador, equipo y estado.
- `messages.ts`: nombres y payloads tipados de mensajes cliente-servidor.
- `validation.ts`: esquemas Zod para entradas, nombres e inspección.
- `clues.ts`: definiciones de pistas, búsqueda por proximidad y comprobación de rango.
- `lobby.ts`: asignación de parejas y condición pura para iniciar la partida.
- `math.ts`: movimiento planar, normalización, límites, interpolación angular y suavizado.
- `world.ts`: obstáculos AABB de la mansión y resolución de colisiones circle-vs-AABB.
- El servidor aplica `applyMovement` en su tick autoritativo y el cliente usa la misma función para predicción local.
- Ambos pasan `MANSION_OBSTACLES` a `applyMovement`, así que la predicción y la autoridad resuelven las mismas colisiones.

## Flujo de red

```text
mensaje lobby:ready -> MatchRoom -> fase WAITING/COUNTDOWN/PLAYING
input del cliente -> mensaje player:input -> MatchRoom
E cerca de una pista -> mensaje clue:inspect -> MatchRoom
MatchRoom -> estado autoritativo -> delta patches -> clientes
cliente -> predicción local + corrección -> personaje local
cliente -> interpolación -> personajes remotos
```

- Tick fijo del servidor: 20 Hz.
- Input del cliente: 30 Hz.
- Estado sincronizado mínimo: posición, rotación, nombre, conexión, equipo, listo, cuenta atrás y pistas por equipo.
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
- La mesa, las sillas y la chimenea tienen obstáculos AABB en `shared/world.ts` que coinciden con el blockout.
- Cada pista tiene un marcador emisivo en 3D que desaparece cuando el equipo la registra.

## Colisiones

- Los personajes se modelan como círculos de `PLAYER_RADIUS` y los obstáculos como AABB estáticos.
- `resolveCollisions` empuja al jugador hacia el lado más cercano o fuera de la cara del AABB más próxima.
- El cliente y el servidor usan el mismo layout, por lo que la predicción local no atraviesa muebles.

## Lobby

- Los jugadores entran en `WAITING` y se emparejan por orden de llegada en equipos de 2.
- `lobby:ready` alterna el estado `ready` del jugador; el servidor valida el payload con Zod.
- La partida pasa a `COUNTDOWN` cuando todas las parejas están completas y listas; un cambio durante la cuenta atrás devuelve el lobby a `WAITING`.
- `COUNTDOWN_SECONDS = 3`; al terminar, la sala pasa a `PLAYING` y entonces se acepta `player:input`.
- Si un jugador abandona, se reasignan los equipos y se reinician los estados `ready`.

## Expediente e inspección

- `shared/clues.ts` define cuatro pistas con posición, título y detalle; es la única fuente de definiciones.
- El cliente calcula la pista cercana con `findNearbyClue` y muestra el aviso `E`;
  el servidor vuelve a comprobar el rango con `isClueInRange` antes de aceptar `clue:inspect`.
- Solo se registran pistas durante `PLAYING`; el mensaje se valida con Zod.
- El progreso se guarda por equipo en `TeamState.discoveredClues` y se sincroniza en `MatchState.teams`.
- El HUD muestra el expediente con las pistas registradas; los marcadores 3D desaparecen al registrarlas.

## Siguientes cortes verticales

1. Eventos, muerte y espectador.
2. Puntuación, resultados y administración.
