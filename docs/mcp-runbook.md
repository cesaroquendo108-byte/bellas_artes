# Runbook del servidor MCP

## Endpoints

- Next.js: `POST /api/mcp` usando MCP Streamable HTTP.
- Servicio independiente: `npm run mcp`, con `POST /mcp` y `GET /health`.

El servicio independiente es útil si se quiere publicar MCP en un proceso Node
separado del frontend. La ruta de Next.js sirve cuando el deployment de la
aplicación ya tiene las variables privadas configuradas.

## Variables de servidor

```text
MCP_API_KEY=<secreto Bearer rotado fuera del repositorio>
MCP_USER_ID=<UUID de un usuario Bellas Artes de servicio>
MCP_ALLOWED_ORIGIN=https://cliente-que-lo-consuma.example
MCP_PORT=8787
NEXT_PUBLIC_MCP_SERVER_URL=https://app.example/api/mcp
```

`MCP_USER_ID` es la identidad que ejecutará las herramientas. No se acepta
`userId`, `ownerId` ni `authorId` en los mensajes MCP. Para producción debe ser
un usuario de servicio con permisos y saldo controlados.

## Verificación mínima

```bash
curl -fsS -X POST https://app.example/api/mcp \
  -H 'Authorization: Bearer <MCP_API_KEY>' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"1"}}}'
```

El endpoint `/health` sólo pertenece al servicio independiente (`/health` en
`MCP_PORT`); la ruta de Next.js usa el handshake POST como comprobación.

La respuesta debe anunciar `bellas-artes` y no debe devolver una API key. Las
pruebas siguientes deben usar un asset propio, consultar sólo jobs propios y
confirmar que una llamada bloqueada o sin crédito no crea un asset.

## Clientes

La URL pública y el Bearer se configuran en el mecanismo MCP de cada cliente.
La landing `/mcp` contiene los pasos visuales para Claude, ChatGPT, Cursor y
otros clientes compatibles, pero no declara integración operativa hasta que
cada cliente complete el handshake contra la URL publicada. No se deben
introducir secretos en `NEXT_PUBLIC_*` ni en archivos versionados.

La interfaz permanece en “no configurada” si
`NEXT_PUBLIC_MCP_SERVER_URL` está vacío. Esto es intencional: un deployment
antiguo o una URL sin el endpoint real no debe presentarse como integración
activa.
