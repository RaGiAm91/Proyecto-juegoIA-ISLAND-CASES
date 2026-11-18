# Ejecución

## Desarrollo local

```bash
npm run dev
```

- Vite: http://localhost:5173
- Colyseus/Express: http://localhost:2567
- Health check: http://localhost:2567/health

`npm run dev` compila primero `shared`, luego arranca el compilador en watch, el servidor con `tsx watch` y el cliente con Vite.

## Prueba de dos jugadores

1. Abrir http://localhost:5173 en dos pestañas o navegadores.
2. Entrar con nombres distintos.
3. Comprobar que aparecen en el mismo equipo del lobby.
4. Pulsar «Listo» en ambos navegadores y comprobar la cuenta atrás de 3 segundos.
5. Comprobar que ambos personajes aparecen y se mueven al pasar a `PLAYING`.
6. Comprobar que la cámara sigue al jugador local y que el personaje remoto se interpola.
7. Acercarse al libro de visitas junto a la entrada y comprobar que aparece el aviso `E`.
8. Pulsar `E` y comprobar que la pista aparece en el expediente de ambos navegadores y que su marcador 3D desaparece.

La misma prueba está automatizada con Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright arranca ambos servicios, abre dos contextos aislados y comprueba el emparejamiento, la cuenta atrás, el registro de una pista y la sincronización de movimiento.

## LAN

1. Ejecutar `npm run dev` en el equipo servidor.
2. Averiguar la IPv4 local:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object IPAddress, InterfaceAlias
```

3. Abrir `http://IP_DEL_SERVIDOR:5173` desde el otro equipo.
4. Permitir Node.js en el firewall de Windows si se solicita.

El cliente usa por defecto `http://IP_DEL_SERVIDOR:2567` para Colyseus. Si se necesita otro servidor, crear `.env` en la raíz con `VITE_SERVER_URL=http://IP:2567`.

## Producción local

```bash
npm run build
npm start
```

El servidor sirve la API y Colyseus. Para servir el cliente compilado hace falta añadir el estático de `client/dist` al servidor o usar un proxy local; se hará en la fase de despliegue.

## Túnel público temporal

Con `cloudflared` instalado:

```bash
cloudflared tunnel --url http://localhost:2567
```

Es una URL temporal, sin SLA. No se garantiza disponibilidad para la competición.
