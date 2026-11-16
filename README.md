# Login seguro

Aplicación de autenticación con frontend y backend en TypeScript, React, Express y PostgreSQL. Incluye registro, inicio y cierre de sesión, sesiones persistentes, validación de datos, protección CSRF, limitación de intentos y contraseñas con hash bcrypt.

## Requisitos

- Node.js 20 o posterior
- Docker Desktop (recomendado para PostgreSQL) o una instancia PostgreSQL disponible

## Puesta en marcha

1. Copia `.env.example` a `.env` y cambia `SESSION_SECRET` por un valor aleatorio de al menos 32 caracteres.
2. Inicia la base de datos con `docker compose up -d`.
3. Instala dependencias con `npm install`.
4. Inicia frontend y API en modo desarrollo con `npm run dev`.
5. Abre `http://localhost:5173`, crea una cuenta y entra.

La aplicación escucha en el puerto 3000 y Vite redirige las solicitudes `/api` a la API. El primer inicio de PostgreSQL crea las tablas de usuarios y la tabla de sesiones se crea automáticamente. Si cambias la contraseña de PostgreSQL en `.env`, cambia también `docker-compose.yml`.

## Producción

Ejecuta `npm run build` y `npm start`. En producción el servidor sirve también el frontend compilado. Configura `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET` (secreto aleatorio de 32 caracteres o más), `CLIENT_ORIGIN` con el origen HTTPS de la aplicación y `PORT`. Para una base administrada con TLS, activa `DATABASE_SSL=true`. En producción la cookie de sesión usa `Secure`, `HttpOnly` y `SameSite=Lax`; sirve la aplicación detrás de HTTPS y limita el acceso a la base de datos. La opción «Recordarme» mantiene la cookie durante siete días; al desactivarla, la cookie termina al cerrar el navegador.

## Rutas de API

- `GET /api/health`: estado de la API y PostgreSQL.
- `GET /api/auth/csrf`: crea/recupera el token CSRF de la sesión.
- `GET /api/auth/me`: usuario de la sesión actual.
- `POST /api/auth/register`: `{ "name", "email", "password" }`.
- `POST /api/auth/login`: `{ "email", "password" }`.
- `POST /api/auth/logout`: requiere `X-CSRF-Token`.

El frontend recibe el token CSRF inicial y lo envía en cada operación que modifica estado. Las contraseñas deben tener entre 10 y 128 caracteres; el servidor las almacena con bcrypt y no devuelve hashes.
