# NestJS + Google OAuth2 + JWT

API backend (NestJS) para registro/login con **Google OAuth2**, persistencia con **Prisma + PostgreSQL** y sesiones sin estado mediante **JWT**.

Trabajo práctico — Programación IV (UTN).

## Requisitos

- Node.js 18+
- PostgreSQL local
- Credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com/)

## Configuración de Google Cloud

1. Crear un proyecto.
2. Configurar la **pantalla de consentimiento OAuth** (tipo External).
3. Crear credenciales → **OAuth client ID** → tipo **Web application**.
4. Configurar:
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `http://localhost:3000/auth/google/redirect`
5. Copiar **Client ID** y **Client Secret**.

## Instalación

```bash
git clone <url-del-repositorio>
cd Nestjs-oauth-google
npm install
```

## Variables de entorno

Copiar el ejemplo y completar los valores reales:

```bash
cp .env.example .env
```

Contenido de `.env.example`:

```env
PORT=3000

GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/redirect

JWT_SECRET=cambiame-por-un-secreto-largo
JWT_EXPIRES_IN=1d

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nestjs_oauth?schema=public"
```

> No subir el archivo `.env` al repositorio (está en `.gitignore`).

## Base de datos

1. Crear la base en PostgreSQL:

```sql
CREATE DATABASE nestjs_oauth;
```

2. Aplicar migraciones y generar el cliente Prisma:

```bash
npx prisma migrate dev
```

## Ejecutar en desarrollo

```bash
npm run start:dev
```

El servidor queda en `http://localhost:3000`.

## Endpoints

| Método | Ruta | Descripción | Auth |
| --- | --- | --- | --- |
| `GET` | `/auth/google` | Redirige al login de Google | — |
| `GET` | `/auth/google/redirect` | Callback de Google; crea/busca usuario y devuelve JWT | Google OAuth |
| `GET` | `/auth/profile` | Perfil del usuario autenticado | Bearer JWT |

### Probar el flujo

1. Abrir en el navegador: `http://localhost:3000/auth/google`
2. Iniciar sesión con Google.
3. La API responde con JSON:

```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "picture": "..."
  }
}
```

4. Usar el token en una ruta privada (PowerShell):

```powershell
$token = "PEGAR_ACCESS_TOKEN"
Invoke-RestMethod -Uri "http://localhost:3000/auth/profile" -Headers @{ Authorization = "Bearer $token" }
```

Sin token, `/auth/profile` responde **401 Unauthorized**.

## Arquitectura

```
src/
  auth/          # GoogleStrategy, JwtStrategy, AuthService, AuthController
  users/         # Acceso a usuarios (Prisma)
  prisma/        # PrismaService / PrismaModule
prisma/
  schema.prisma  # Modelo User (híbrido local + Google)
```

### Flujo de autenticación

1. El cliente llama a `/auth/google`.
2. Passport redirige a Google.
3. Google vuelve a `/auth/google/redirect`.
4. `GoogleStrategy.validate` procesa el perfil.
5. `AuthService.validateGoogleUser`:
   - busca por `googleId`
   - si no existe, busca por `email` y vincula `googleId`
   - si no existe, crea el usuario
6. Se firma un **JWT propio** de la aplicación.
7. Las rutas privadas se protegen con `JwtAuthGuard` (`Authorization: Bearer <token>`).

## Modelo User (Prisma)

Estrategia híbrida:

- usuarios federados (Google): `googleId` + `password` nulo
- usuarios locales (preparado): `password` opcional + posible vínculo posterior con Google

Campos: `id`, `email` (único), `password?`, `firstName`, `lastName`, `picture`, `googleId?` (único), `createdAt`, `updatedAt`.

## Scripts útiles

```bash
npm run start:dev       # desarrollo con watch
npm run build           # compilar
npx prisma studio       # UI para ver la base
npx prisma migrate dev  # migraciones
```
