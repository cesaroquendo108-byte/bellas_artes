# Redis privado para Bellas Artes

Este stack reemplaza exclusivamente Upstash. La aplicación y el dominio continúan en Vercel. Redis no publica puertos; el único punto público es un gateway HTTPS autenticado por HMAC.

## Topología

- `redis`: cola BullMQ y cachés, persistidos en el volumen `redis-data`.
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

No se debe publicar `6379/tcp` ni copiar `REDIS_URL` a Vercel. Vercel solo recibe `QUEUE_GATEWAY_URL` y `QUEUE_GATEWAY_HMAC_KEY`.
