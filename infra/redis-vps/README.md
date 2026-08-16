# Redis privado para Bellas Artes

Este stack reemplaza exclusivamente Upstash. La aplicación y el dominio continúan en Vercel. Redis no publica puertos; el único punto público es un gateway HTTPS autenticado por HMAC.

## Topología

- `redis`: cola BullMQ y cachés, persistidos en el volumen `redis-data`. Solo enlaza `6379` al bridge local del host como `172.17.0.1:16379`.
- `gateway`: recibe solicitudes firmadas de Vercel en el puerto 8787 del host Docker.
- `worker`: consume Redis directamente por la red interna. Conserva `GENERATION_ENABLED=false` hasta una activación independiente.
- Caddy: termina TLS para `bellas-artes-queue.157.173.104.214.nip.io`.

Los secretos viven en `/etc/bellas-artes` y no se guardan en Git. El despliegue usa:

```text
/etc/bellas-artes/compose.env
/etc/bellas-artes/gateway.env
/etc/bellas-artes/worker.env
```

## Validación mínima

1. `docker compose --env-file /etc/bellas-artes/compose.env config --quiet`
2. `docker compose --env-file /etc/bellas-artes/compose.env up -d`
3. `docker compose --env-file /etc/bellas-artes/compose.env ps`
4. Verificar que `https://bellas-artes-queue.157.173.104.214.nip.io/health` responde `200`.
5. Enviar una solicitud firmada de prueba y confirmar que una repetición del mismo nonce responde `409`.

No se debe publicar Redis en `0.0.0.0`, `::` ni copiar `REDIS_URL` a Vercel. Vercel solo recibe `QUEUE_GATEWAY_URL` y `QUEUE_GATEWAY_HMAC_KEY`.

## Operación y recuperación

El stack instalado vive en `/opt/bellas-artes/current/infra/redis-vps` y se administra con el archivo de variables raíz:

```bash
docker compose --env-file /etc/bellas-artes/compose.env ps
docker compose --env-file /etc/bellas-artes/compose.env up -d
```

Para diagnosticar, confirme primero los tres healthchecks y luego revise los logs acotados de `gateway` y `worker`. `GENERATION_ENABLED=false` es parte del estado preservado y no debe cambiarse durante una intervención de Redis.

Si el gateway falla después de un despliegue de Vercel, vuelva a promover el artefacto anterior y conserve el stack del VPS para diagnóstico. Si falla Redis, detenga temporalmente las operaciones que encolan trabajo, repare el volumen o restaure su respaldo y reinicie el stack. No restaure las credenciales agotadas de Upstash como mecanismo de recuperación.
