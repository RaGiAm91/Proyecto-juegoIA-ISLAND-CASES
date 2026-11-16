# Instalación

## Requisitos

- Node.js 24.11.1 o superior dentro de la línea 24.
- npm 11.6.2 o superior.
- Git.
- Navegador actualizado con WebGL 2.
- Opcional: Blender 4.5 LTS para assets 3D. No es necesario para la demo actual.

## Instalar

```bash
npm install
```

El repositorio usa npm workspaces. La instalación crea enlaces para `@island-cases/shared` dentro de `client` y `server`.

## Variables de entorno

Copiar `.env.example` a `.env` solo si hace falta cambiar el puerto o la URL del servidor.

```text
PORT=2567
VITE_SERVER_URL=
```

Si `VITE_SERVER_URL` está vacío, el cliente usa el hostname actual y el puerto `2567`. Esto permite LAN sin configuración adicional.

## Comprobar

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
