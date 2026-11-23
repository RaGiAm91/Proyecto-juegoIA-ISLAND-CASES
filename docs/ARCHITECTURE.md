# Arquitectura

## Monorepo

```text
client/   Vite + React + Babylon + Colyseus SDK
server/   Express + Colyseus + reglas autoritativas
shared/   protocolo, tipos, constantes, validación, matemáticas, estructura, colisiones, lobby, pistas, eventos, espectador y hub del vestíbulo
```

`shared` se compila a `dist` y se consume como workspace. `client` y `server` no se importan entre sí.

## Paquete shared

- `constants.ts`: versión de protocolo, nombre de sala, límites, equipos, cuenta atrás, ritmos, interacción y predicción.
- `types.ts`: entrada de movimiento, opciones de entrada, vistas de jugador, equipo y estado.
- `messages.ts`: nombres y payloads tipados de mensajes cliente-servidor.
- `validation.ts`: esquemas Zod para entradas, nombres, inspección e interacción con el hub.
- `clues.ts`: definiciones de pistas, búsqueda por proximidad y comprobación de rango.
- `events.ts`: definiciones de eventos, búsqueda por pista disparadora y evento mortal.
- `hub.ts`: puntos interactivos del vestíbulo, señalización de salidas, destinos y contenido del panel.
- `spectator.ts`: selección pura del objetivo de espectador.
- `lobby.ts`: asignación de parejas y condición pura para iniciar la partida.
- `mansion.ts`: zonas, muros, huecos de puerta y utilidades puras de la estructura de la mansión.
- `math.ts`: movimiento planar, normalización, límites, interpolación angular y suavizado.
- `world.ts`: obstáculos AABB de la mansión y resolución de colisiones circle-vs-AABB.
- El servidor aplica `applyMovement` en su tick autoritativo y el cliente usa la misma función para predicción local.
- Ambos pasan `MANSION_OBSTACLES` a `applyMovement`, así que la predicción y la autoridad resuelven las mismas colisiones.

## Flujo de red

```text
mensaje lobby:ready -> MatchRoom -> fase WAITING/COUNTDOWN/PLAYING
input del cliente -> mensaje player:input -> MatchRoom
E cerca de una pista -> mensaje clue:inspect -> MatchRoom
E cerca de un punto del hub -> mensaje hub:interact -> MatchRoom
MatchRoom -> mensaje hub:panel solo al solicitante -> HUD del directorio o tablón
MatchRoom -> evento asociado y posible muerte -> estado autoritativo
MatchRoom -> estado autoritativo -> delta patches -> clientes
cliente -> predicción local + corrección -> personaje local
cliente -> interpolación -> personajes remotos
```

- Tick fijo del servidor: 20 Hz.
- Input del cliente: 30 Hz.
- Estado sincronizado mínimo: posición, rotación, nombre, conexión, equipo, listo, vida, modo espectador, objetivo de espectador, causa de muerte, cuenta atrás, pistas por equipo y registro de eventos.
- El servidor valida y normaliza el movimiento; nunca confía en posiciones enviadas por el cliente.
- El cliente predice su movimiento con la misma función pura y corrige si el error supera 0,75 m.
- El input de teclado se convierte a ejes del mundo con la orientación actual de la cámara antes de enviarlo al servidor.

## Colyseus 0.18

- `defineServer`/`defineRoom` en `server/src/app.config.ts`.
- `schema({ ... }, "Nombre")` en `server/src/rooms/schema/MatchState.ts`.
- `MatchRoom` usa `setFixedTimestep` y mensajes declarativos con `validate`.
- El cliente usa `@colyseus/sdk`, `Callbacks.get(room)` y `onDrop`/`onReconnect`/`onLeave`.

## Escena 3D

- Babylon `Engine` + `Scene` + `ArcRotateCamera`.
- Imports específicos de Babylon y side-effects de `Ray`/builders para mantener el bundle bajo control.
- Blockout construido con primitivas y materiales PBR a partir de la estructura compartida de la mansión.
- La planta tiene cinco zonas: vestíbulo, biblioteca, salón principal, comedor y galería.
- Los muros exteriores y los tabiques se generan desde `MANSION_WALLS`; los huecos desde `MANSION_DOORWAYS`.
- Personajes placeholder con cuerpo, cabeza, sombrero, sombra y placa de nombre.
- La cámara sigue al jugador local; los remotos se interpolan.
- La cámara orbita al pasar el ratón sobre el canvas, sin necesidad de hacer clic o arrastrar; la rueda controla el zoom.
- La mesa, las sillas y la chimenea tienen obstáculos AABB en `shared/world.ts` que coinciden con el blockout.
- El vestíbulo es la primera zona detallada: alfombra, espejo, consola, perchero y atril del libro de visitas.
- Los muebles del vestíbulo se definen en `shared/props.ts` y se renderizan desde esos mismos datos.
- El vestíbulo se refuerza con puerta principal, candelabro, apliques, marco de alfombra, guías emisivas, carteles de salida y paneles consultables.
- Los marcadores de puntos del hub son emisivos; el HUD bloquea el movimiento mientras el panel está abierto y `Esc` lo cierra.
- En desarrollo se genera un personaje de pruebas en el vestíbulo; `__islandCasesDebug.setTestCharacter(x, z)` permite reposicionarlo desde E2E.
- `__islandCasesDebug.setCameraAlpha(alpha)` permite girar la cámara desde E2E para verificar el movimiento relativo a la cámara.
- `__islandCasesDebug.setPlayerPosition(x, z)` usa un mensaje DEV-only validado para colocar al jugador en E2E sin depender de temporizadores del navegador.
- El aviso central de muerte se desvanece tras 3,6 s; en espectador queda una insignia compacta con el objetivo.
- Cada pista tiene un marcador emisivo en 3D que desaparece cuando el equipo la registra.

## Colisiones

- Los personajes se modelan como círculos de `PLAYER_RADIUS` y los obstáculos como AABB estáticos.
- `MANSION_OBSTACLES` incluye muebles, muros exteriores y tabiques; los huecos de puerta quedan libres.
- `resolveCollisions` empuja al jugador hacia el lado más cercano o fuera de la cara del AABB más próxima.
- El cliente y el servidor usan el mismo layout, por lo que la predicción local no atraviesa muebles ni tabiques.

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

## Vestíbulo como hub

- `shared/hub.ts` define el directorio y el tablón, sus posiciones, los destinos y la señalización de las dos salidas del vestíbulo.
- El cliente calcula el punto cercano con `findNearbyHubInteractable` y muestra el aviso `E`; las pistas tienen prioridad mutua para no mezclar prompts.
- El servidor valida `hub:interact` durante `PLAYING`, exige jugador conectado y vivo, y comprueba la distancia con `isHubInteractableInRange`.
- `hub:panel` se envía solo al jugador solicitante con destinos compartidos, progreso real del equipo y número de eventos; no entra en `MatchState`.
- El panel se cierra con `Esc` o con su botón; mientras está abierto el cliente envía input neutro y no registra pistas.

## Eventos, muerte y espectador

- `shared/events.ts` define los eventos disparados por la primera inspección de cada pista; `firma-sangrienta` es el evento mortal asociado al libro de visitas.
- El servidor valida `clue:inspect`, registra la pista por equipo y añade el evento al registro solo una vez por partida.
- Un evento mortal fija `alive = false`, guarda la causa y activa `spectating`; no hay respawn.
- `chooseSpectatorTarget` prefiere un compañero de equipo vivo y conectado, y cae a cualquier jugador vivo y conectado.
- El servidor ignora input e inspecciones de jugadores muertos y recalcula espectadores al entrar, salir, desconectarse, reconectarse o reiniciar el lobby.
- El cliente congela al personaje muerto, desactiva su prompt de interacción y mueve la cámara hacia el objetivo de espectador.
- El HUD muestra el último evento, una superposición de muerte y el nombre del jugador observado.

## Siguientes cortes verticales

1. Puntuación, resultados y administración.
2. Terror ambiental y chat.
