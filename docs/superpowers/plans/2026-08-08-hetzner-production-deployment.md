# Hetzner Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar ColdPower funcionando en `https://coldpower.pe` sobre un VPS de Hetzner, con Next.js ejecutándose en Node.js, PM2 administrando el proceso, Caddy terminando HTTPS y Cloudflare usado inicialmente solo como DNS.

**Architecture:**

```text
Usuario
  -> Cloudflare DNS (A/CNAME en DNS-only, nube gris)
  -> Hetzner Cloud / Ubuntu 24.04
  -> Caddy :80/:443, TLS automático y reverse proxy
  -> PM2 -> Next.js :3000, solo localhost
  -> Neon PostgreSQL + Clerk Production
```

**Tech Stack:** Next.js 16, Node.js 22 LTS, pnpm 11.20.0, PM2, Caddy, Ubuntu 24.04, Neon PostgreSQL, Clerk Production, Cloudflare DNS.

## Global Constraints

- No desplegar el estado actual directamente: el repositorio tiene cambios sin commit y la rama actual es `claude/cold-import-hvac-sales-7kgcyc`.
- No ejecutar `git reset --hard`, `git checkout --` ni borrar cambios existentes. Primero revisar, probar y consolidar el trabajo actual.
- Producción debe desplegarse desde `main` o desde un tag inmutable, nunca desde una rama de trabajo.
- No guardar secretos en Git, en `ecosystem.config.cjs`, en el Caddyfile ni en los logs.
- No abrir públicamente el puerto `3000`; solo deben exponerse `22`, `80` y `443`.
- El VPS aloja la aplicación, no PostgreSQL. La base de datos de producción será Neon separada de desarrollo.
- La primera versión será una sola instancia de Next.js. No usar clustering ni múltiples procesos hasta que exista una necesidad real.
- Con Cloudflare DNS-only la IP del servidor queda visible y se pierde la protección HTTP/WAF de Cloudflare. Se acepta en esta fase por compatibilidad y simplicidad; el firewall y SSH endurecido son obligatorios.

---

## 1. Cerrar el estado del código antes del servidor

**Archivos:** `package.json`, `pnpm-lock.yaml`, `.env.example`, `src/`, `drizzle.config.ts`, `docs/deployment.md`.

- [ ] Revisar `git status --short`, `git diff` y todos los archivos no trackeados del trabajo RBAC, Clerk, webhooks y Drizzle.
- [ ] Ejecutar en `COLDPOWER`:

  ```powershell
  corepack enable
  corepack prepare pnpm@11.20.0 --activate
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm test:all
  pnpm build
  ```

- [ ] Confirmar que los datos comerciales reales sustituyeron los placeholders: WhatsApp, correo, teléfono, RUC, dirección, redes y textos legales.
- [ ] Generar y revisar la primera migración de Drizzle. Actualmente existe `drizzle.config.ts`, pero no hay una carpeta `drizzle/` versionada.

  ```powershell
  pnpm db:generate
  Get-ChildItem drizzle -Recurse
  ```

- [ ] Inspeccionar el SQL generado para confirmar que crea `user_role`, `quote_status`, `users` y `quotes`, sin operaciones destructivas.
- [ ] Consolidar estos cambios en commits claros y crear una rama de integración/PR hacia `main`.
- [ ] Crear un tag de despliegue, por ejemplo `v1.0.0`, solo después de que CI/local esté verde.

**Criterio de salida:** `main` contiene código probado, migración revisada y ningún secreto; el tag de producción es reproducible.

## 2. Ajustes de código y operación que deben quedar versionados

### 2.1 Endpoint de salud

**Crear:** `src/app/api/health/route.ts`.

- [ ] Implementar `GET /api/health` con respuesta `200` y JSON mínimo `{ "ok": true, "service": "coldpower" }`.
- [ ] No consultar la base de datos en este endpoint; su propósito es comprobar que Next.js y PM2 están vivos. La base de datos se validará en una prueba funcional separada.
- [ ] Añadir una prueba pequeña en `scripts/phase12-production-readiness.test.mjs` que verifique la existencia del endpoint y de los archivos operativos.

### 2.2 Proceso PM2

**Crear:** `ecosystem.config.cjs`.

- [ ] Configurar una app llamada `coldpower` con:
  - `cwd: /var/www/coldpower/current`.
  - script `node_modules/next/dist/bin/next`.
  - argumentos `start -p 3000`.
  - `NODE_ENV=production` y `PORT=3000`.
  - `instances: 1`, `exec_mode: "fork"`.
  - `autorestart: true` y `max_memory_restart: "512M"`.
  - logs en `/var/log/coldpower/out.log` y `/var/log/coldpower/error.log`.
- [ ] No colocar valores de Clerk, Neon ni secretos en este archivo.

### 2.3 Despliegue repetible

**Crear:** `ops/deploy-production.sh`.

- [ ] Hacer que reciba exactamente un tag, clone el tag en `/var/www/coldpower/releases/<tag>-<timestamp>`, enlace `.env.production` desde `shared`, instale dependencias con `--frozen-lockfile`, ejecute lint/build, ejecute migraciones y cambie el enlace `current` solo si todo terminó correctamente.
- [ ] Usar estas rutas fijas:

  ```text
  /var/www/coldpower/shared/.env.production
  /var/www/coldpower/releases/
  /var/www/coldpower/current -> release activo
  ```

- [ ] Antes de cambiar `current`, ejecutar `pnpm exec drizzle-kit migrate` con `DATABASE_URL` cargada desde el archivo protegido.
- [ ] Recargar con `pm2 startOrReload /var/www/coldpower/current/ecosystem.config.cjs --env production --update-env`.
- [ ] Conservar al menos las dos releases anteriores para rollback.
- [ ] Fallar si el argumento no es un tag, si falta `.env.production`, si `pnpm install`, lint, build o migración devuelve error.

### 2.4 Scripts y documentación

**Actualizar:** `package.json`, `.env.example`, `docs/deployment.md`.

- [ ] Añadir `db:migrate` y documentar la diferencia entre `db:generate`, `db:migrate` y `db:push`.
- [ ] Usar migraciones versionadas en producción; reservar `db:push` para desarrollo controlado.
- [ ] Actualizar `docs/deployment.md` para reemplazar la recomendación antigua de Vercel por Hetzner + Caddy + PM2.
- [ ] Eliminar de la documentación las limitaciones que ya no son ciertas, como “la cotización no persiste” y “no hay panel administrativo”.
- [ ] Documentar que `.env.production` se crea únicamente en el servidor con permisos `600`.
- [ ] Mantener `.env.example` sin secretos y con una sección explícita de producción:

  ```text
  NEXT_PUBLIC_SITE_URL=https://coldpower.pe
  NEXT_PUBLIC_IS_PREVIEW=false
  NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  ```

**Criterio de salida:** una persona puede desplegar un tag nuevo sin copiar comandos improvisados ni tocar secretos del repositorio.

## 3. Preparar las cuentas externas

### 3.1 Hetzner

- [ ] Crear un proyecto Cloud separado para `coldpower-production`.
- [ ] Crear un servidor Ubuntu 24.04 con `Primary IPv4` y una IPv6 solo si se configurará y probará correctamente.
- [ ] Tamaño inicial concreto: `CX23`, 2 vCPU, 4 GB RAM, 40 GB SSD, o el equivalente actual mostrado por la consola. Es suficiente para una primera instancia Next.js + PM2; escalar a `CX33` si build, memoria o tráfico lo requieren.
- [ ] Elegir la ubicación que ofrezca menor latencia real desde Perú entre las disponibles en la consola. No elegir por precio sin medir: las ubicaciones y precios varían por zona.
- [ ] Crear un firewall de Hetzner con entradas TCP `22` solo desde la IP administrativa si es posible, y `80`/`443` desde Internet; bloquear todo lo demás.
- [ ] Activar backups de Hetzner solo si el coste adicional está aprobado. Los backups del VPS no sustituyen el backup de Neon.

### 3.2 Cloudflare DNS

- [ ] En la zona `coldpower.pe`, crear:

  | Tipo | Nombre | Valor | Proxy |
  |---|---|---|---|
  | A | `@` | IPv4 pública del VPS | DNS-only / nube gris |
  | CNAME | `www` | `coldpower.pe` | DNS-only / nube gris |

- [ ] No crear un registro `AAAA` hasta tener IPv6 funcionando en Ubuntu, UFW y Caddy.
- [ ] Mantener los registros MX/TXT existentes; no modificarlos como parte del deploy.
- [ ] Verificar desde Windows:

  ```powershell
  Resolve-DnsName coldpower.pe
  Resolve-DnsName www.coldpower.pe
  ```

- [ ] Aceptar explícitamente la consecuencia: DNS-only revela la IP de origen. Más adelante se puede probar Cloudflare Proxied, pero solo después de validar Clerk, `src/proxy.ts`, webhooks, HTTPS y límites de request.

### 3.3 Neon Production

- [ ] Crear un proyecto Neon separado de desarrollo, en una región razonablemente cercana al VPS elegido.
- [ ] Crear una rama/base de producción y guardar la connection URI en el gestor de secretos local del servidor; no copiarla al repo.
- [ ] Usar la URI PostgreSQL generada por Neon para `DATABASE_URL`. El driver actual es `drizzle-orm/neon-http`; validar la URI exacta con una migración y una consulta antes de abrir el sitio.
- [ ] Configurar recuperación/retención disponible en el plan de Neon y realizar una prueba de restauración en una rama separada.
- [ ] Antes de la primera migración productiva, sacar backup lógico si el plan lo permite:

  ```bash
  pg_dump --format=custom --file=/var/backups/coldpower/coldpower-$(date +%F).dump "$DATABASE_URL"
  ```

- [ ] No ejecutar `db:push` sobre producción si ya existen datos. En producción se ejecutará la migración versionada revisada.

### 3.4 Clerk Production

- [ ] Crear la instancia Production de Clerk; no reutilizar las claves `pk_test_`/`sk_test_`.
- [ ] Configurar el dominio principal `coldpower.pe` y completar en Clerk los CNAME/TXT que el dashboard solicite.
- [ ] Configurar estas variables en `.env.production`:

  ```text
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
  CLERK_SECRET_KEY=sk_live_...
  CLERK_WEBHOOK_SECRET=whsec_...
  ```

- [ ] Crear webhook de producción en `https://coldpower.pe/api/webhooks/clerk`.
- [ ] Suscribir `user.created`, `user.updated` y `user.deleted`.
- [ ] Usar exactamente `CLERK_WEBHOOK_SECRET`, que es el nombre que espera `src/app/api/webhooks/clerk/route.ts`.
- [ ] Confirmar que el claim de sesión leído por `src/lib/auth.ts` y `src/proxy.ts` expone `metadata.role` desde Clerk Public Metadata. Si Clerk no lo incluye por defecto, configurar el Session Token/claim correspondiente antes de probar `/admin`.
- [ ] Crear el primer usuario productivo después de activar el webhook y verificar que queda `admin` en la tabla `users` y en Clerk. Crear usuarios posteriores y verificar que quedan `customer`.

## 4. Provisionar y asegurar el VPS

**Ejecutar en el servidor recién creado, primero como `root` y luego como `coldpower`:**

- [ ] Actualizar Ubuntu e instalar herramientas base:

  ```bash
  apt update
  apt full-upgrade -y
  apt install -y ca-certificates curl git ufw fail2ban unzip debian-keyring debian-archive-keyring apt-transport-https
  ```

- [ ] Crear el usuario de aplicación sin login por contraseña y registrar su clave SSH:

  ```bash
  adduser --disabled-password --gecos "" coldpower
  usermod -aG sudo coldpower
  install -d -m 700 -o coldpower -g coldpower /home/coldpower/.ssh
  ```

- [ ] Probar una segunda sesión SSH como `coldpower` antes de desactivar root/password login.
- [ ] Endurecer SSH, validar sintaxis y recargar:

  ```bash
  cat >/etc/ssh/sshd_config.d/99-coldpower-hardening.conf <<'EOF'
  PermitRootLogin no
  PasswordAuthentication no
  KbdInteractiveAuthentication no
  PubkeyAuthentication yes
  EOF
  sshd -t
  systemctl reload ssh
  ```

- [ ] Configurar UFW y confirmar que `3000` no aparece:

  ```bash
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status verbose
  ```

- [ ] Mantener logs del sistema en UTC; convertirlos a hora de Lima al analizarlos. Activar actualizaciones de seguridad automáticas y `fail2ban` para SSH.
- [ ] Instalar Node.js 22 LTS para el usuario `coldpower`, fijar la versión probada localmente, activar Corepack y pnpm 11.20.0:

  ```bash
  su - coldpower
  nvm install 22.20.0
  nvm alias default 22.20.0
  corepack enable
  corepack prepare pnpm@11.20.0 --activate
  npm install --global pm2
  ```

  Si el servidor no tiene `nvm`, instalarlo para `coldpower`, cerrar/abrir la sesión y repetir estos comandos.

**Criterio de salida:** se puede entrar con la clave SSH de `coldpower`, root/password login están desactivados, UFW está activo y solo están previstos `22`, `80` y `443`.

## 5. Instalar Caddy y preparar el reverse proxy

- [ ] Instalar Caddy desde su repositorio oficial y no desde un binario descargado manualmente.
- [ ] Crear `ops/Caddyfile` con esta configuración base:

  ```caddyfile
  coldpower.pe, www.coldpower.pe {
      encode zstd gzip

      log {
          output file /var/log/caddy/coldpower-access.log
          format json
      }

      reverse_proxy 127.0.0.1:3000
  }
  ```

- [ ] Copiarlo a `/etc/caddy/Caddyfile`, validar y activar:

  ```bash
  caddy validate --config /etc/caddy/Caddyfile
  systemctl enable --now caddy
  systemctl status caddy --no-pager
  ```

- [ ] Confirmar que DNS ya apunta al VPS y que `80`/`443` están abiertos antes de esperar el certificado. Caddy debe poder completar ACME y redirigir HTTP a HTTPS.
- [ ] No configurar todavía Cloudflare como proxy. Caddy será el terminador TLS público en esta primera fase.

## 6. Primer despliegue de ColdPower

- [ ] Crear la estructura como `coldpower`:

  ```bash
  sudo mkdir -p /var/www/coldpower/{releases,shared}
  sudo mkdir -p /var/log/coldpower /var/backups/coldpower
  sudo chown -R coldpower:coldpower /var/www/coldpower /var/log/coldpower /var/backups/coldpower
  sudo chmod 700 /var/www/coldpower/shared /var/backups/coldpower
  ```

- [ ] Crear `/var/www/coldpower/shared/.env.production` con permisos `600`, propietario `coldpower`, y estas variables más los datos comerciales reales:

  ```text
  NODE_ENV=production
  NEXT_PUBLIC_SITE_URL=https://coldpower.pe
  NEXT_PUBLIC_IS_PREVIEW=false
  NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false
  NEXT_PUBLIC_COMPANY_NAME=ColdPower
  NEXT_PUBLIC_WHATSAPP_NUMBER=numero_real
  NEXT_PUBLIC_CONTACT_EMAIL=correo_real
  NEXT_PUBLIC_CONTACT_PHONE=telefono_real
  NEXT_PUBLIC_RUC=ruc_real
  QUOTE_RATE_LIMIT_MAX=5
  QUOTE_RATE_LIMIT_WINDOW_MS=600000
  QUOTE_ENABLE_API_LOG=true
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_valor_real
  CLERK_SECRET_KEY=sk_live_valor_real
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  CLERK_WEBHOOK_SECRET=whsec_valor_real
  DATABASE_URL=postgresql://valor_real_generado_por_neon
  ```

  Los textos `numero_real`, `correo_real`, `telefono_real`, `ruc_real`, `pk_live_valor_real`, `sk_live_valor_real`, `whsec_valor_real` y la URI son datos que se reemplazan en el servidor; nunca se escriben en el repositorio.

- [ ] Ejecutar el script de despliegue con el tag que pasó las pruebas:

  ```bash
  cd /var/www/coldpower
  ./current/ops/deploy-production.sh v1.0.0
  ```

  Para el primer despliegue, clonar el repositorio en una release inicial, enlazar `current`, copiar `.env.production` como symlink y ejecutar el script. El script debe dejar este resultado:

  ```text
  /var/www/coldpower/current/.env.production -> /var/www/coldpower/shared/.env.production
  pm2 status                         # coldpower online
  curl -fsS http://127.0.0.1:3000/api/health
  ```

- [ ] Configurar PM2 para iniciar con systemd como usuario `coldpower`:

  ```bash
  pm2 startup systemd -u coldpower --hp /home/coldpower
  # Ejecutar exactamente el comando sudo que PM2 imprime.
  pm2 save
  pm2 status
  ```

- [ ] No marcar el despliegue como exitoso hasta que `curl -fsS http://127.0.0.1:3000/api/health` responda `200` y `journalctl -u caddy` no muestre errores de certificado o upstream.

## 7. Pruebas de aceptación públicas

- [ ] HTTPS y redirección:

  ```bash
  curl -I http://coldpower.pe
  curl -I https://coldpower.pe
  curl -fsS https://coldpower.pe/api/health
  ```

- [ ] Rutas públicas: `/`, catálogo/productos, `/cotizacion`, `/sign-in` y `/sign-up` cargan sin error 5xx.
- [ ] Autenticación:
  - crear el primer usuario en Clerk;
  - confirmar webhook `user.created` con estado exitoso;
  - confirmar fila en Neon;
  - confirmar que `/admin` permite entrar al primer admin;
  - confirmar que un segundo usuario no puede entrar a `/admin`;
  - confirmar que `/cuenta` requiere sesión.
- [ ] Cotizaciones:
  - enviar una cotización válida como visitante;
  - comprobar respuesta y persistencia en `quotes`;
  - comprobar que aparece en el panel admin;
  - comprobar validación y rate limit con payload inválido/repetido.
- [ ] Webhook:
  - enviar evento de prueba desde Clerk;
  - comprobar respuesta `2xx`;
  - revisar `pm2 logs coldpower` sin exponer secretos.
- [ ] Reinicio:

  ```bash
  sudo reboot
  # después de reconectar
  systemctl is-active caddy
  pm2 status
  curl -fsS https://coldpower.pe/api/health
  ```

- [ ] Revisar `ss -lntp`: Next.js debe escuchar en `127.0.0.1:3000`, no en una interfaz pública.

## 8. Backups, rollback y operación

- [ ] Mantener el código y los archivos operativos en Git; no depender del disco del VPS para recuperar la aplicación.
- [ ] Configurar backup lógico periódico de Neon a un destino fuera del VPS. Un dump guardado solo en `/var/backups` no es suficiente ante pérdida del servidor.
- [ ] Probar una restauración en una rama Neon de prueba y registrar fecha/resultado.
- [ ] Tomar snapshot del VPS antes de cambios de sistema importantes; esto protege configuración, no sustituye la base de datos.
- [ ] Documentar rollback de aplicación:

  ```bash
  sudo ln -sfn /var/www/coldpower/releases/<release-anterior> /var/www/coldpower/current
  sudo -u coldpower pm2 startOrReload /var/www/coldpower/current/ecosystem.config.cjs --env production --update-env
  ```

- [ ] No hacer rollback automático de una migración de base de datos. Las migraciones deben ser aditivas y compatibles con la release anterior; cualquier migración destructiva exige backup y procedimiento manual probado.
- [ ] Revisar semanalmente `pm2 status`, espacio en disco, memoria, logs de Caddy, intentos SSH y estado de Neon.
- [ ] Mantener un procedimiento de renovación de secretos Clerk/Neon y registrar qué release se desplegó.

## 9. Criterio final de “funcionando”

El trabajo queda aceptado solo cuando se cumplen todos estos puntos:

- `https://coldpower.pe` carga con certificado válido.
- `www.coldpower.pe` redirige o sirve correctamente.
- PM2 revive Next.js después de reiniciar el servidor.
- Caddy es el único proceso público HTTP y Next.js queda en localhost.
- La base de datos de producción Neon recibe y devuelve cotizaciones.
- Clerk Production autentica usuarios y el webhook sincroniza `users`.
- El primer admin puede usar `/admin` y un customer no puede hacerlo.
- No quedan claves de desarrollo, placeholders comerciales ni `NEXT_PUBLIC_IS_PREVIEW=true`.
- Existe backup/restauración verificada de los datos.
- Existe una release anterior utilizable para rollback.

## Referencias oficiales

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Caddy reverse proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy)
- [PM2 startup y ecosystem files](https://pm2.keymetrics.io/docs/usage/startup/)
- [Hetzner Cloud locations](https://docs.hetzner.com/cloud/general/locations/)
- [Hetzner Cloud prices effective 15 June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)
- [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Neon connection URI](https://api-docs.neon.tech/reference/getconnectionuri)
