# Trabajo Práctico: Backend de Registro y Autenticación con NestJS y Google OAuth2

Este trabajo práctico guía el desarrollo de un microservicio o API backend utilizando el framework **NestJS** para resolver el flujo de autenticación (Registro y Login) centralizado mediante el proveedor **Google OAuth2**.

---

## 🎯 Objetivos de Aprendizaje
* Configurar una arquitectura modular escalable con **NestJS**.
* Implementar seguridad y persistencia de datos (usando **TypeORM** o **Prisma** con PostgreSQL/MySQL).
* Integrar la estrategia de autenticación **Google OAuth2** utilizando `passport` y `@nestjs/passport`.
* Gestionar sesiones mediante **JSON Web Tokens (JWT)** para proteger rutas privadas.

---

## 🛠️ Requisitos Previos y Herramientas
1. **Node.js** (v18 o superior) e npm/yarn.
2. Una instancia de **PostgreSQL** o **MySQL** (local o via Docker).
3. Una cuenta de Google Cloud Console para obtener las credenciales de cliente (`Client ID` y `Client Secret`).
4. Cliente HTTP (Postman, Insomnia o la extensión *REST Client* de VS Code) para pruebas.

---

## 🚀 Entregables del Trabajo Práctico

El proyecto debe estar estructurado de forma modular (`AuthModule`, `UsersModule`, `DatabaseModule`). A continuación se detallan los pasos y requerimientos obligatorios:

### Paso 1: Configuración de la Consola de Google Developer
1. Ir a [Google Cloud Console](https://console.cloud.google.com/).
2. Crear un nuevo proyecto.
3. Configurar la *OAuth consent screen* (Pantalla de consentimiento) como tipo **External**.
4. Ir a **Credentials** -> **Create Credentials** -> **OAuth client ID**.
5. Seleccionar *Web application*.
6. Configurar las URLs:
   * **Authorized JavaScript origins**: `http://localhost:3000`
   * **Authorized redirect URIs**: `http://localhost:3000/auth/google/redirect`
7. Descargar o copiar el **Client ID** y el **Client Secret**.

### Paso 2: Inicialización del Proyecto NestJS
Instalar el CLI de NestJS de forma global si no se posee, e iniciar el proyecto:
```bash
npm i -g @nestjs/cli
nestjs new nestjs-google-oauth
cd nestjs-google-oauth
```

Instalar las dependencias críticas de autenticación y base de datos:
```bash
npm install --save @nestjs/passport passport passport-google-oauth20 @nestjs/jwt @nestjs/config
npm install --save-dev @types/passport-google-oauth20 @types/passport-jwt
```
*(Nota: Añadir las dependencias correspondientes al ORM elegido, ej. `@nestjs/typeorm typeorm pg`)*

### Paso 3: Definición del Modelo de Usuario
El modelo o entidad de `User` debe contener, como mínimo, los siguientes campos para soportar el flujo híbrido/OAuth:
* `id`: Identificador único (UUID o autoincremental).
* `email`: String, único. Obligatorio.
* `firstName`: String.
* `lastName`: String.
* `picture`: String (URL de la foto de perfil provista por Google).
* `googleId`: String, único. Almacena el ID único devuelto por el perfil de Google.
* `createdAt` / `updatedAt`: Fechas de auditoría.

### Paso 4: Implementación de la Estrategia de Google (Passport)
Crear un archivo `google.strategy.ts` dentro de tu módulo de autenticación:

```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    
    // Aquí se invoca al servicio para registrar o loguear al usuario
    const validatedUser = await this.authService.validateGoogleUser(user);
    done(null, validatedUser);
  }
}
```

### Paso 5: Lógica del Servicio de Autenticación (`AuthService`)
El método `validateGoogleUser` debe realizar la siguiente lógica:
1. Buscar en la base de datos si existe un usuario con el `googleId` recibido.
2. Si **existe**: Actualizar los datos del perfil (opcional) y retornar el usuario.
3. Si **no existe**: Buscar si el `email` ya está registrado (ej. registro tradicional previo). Si existe, vincular el `googleId`. Si no existe, **crear un nuevo registro de usuario** en la base de datos.
4. Generar y firmar un **JWT** (JSON Web Token) propio de tu aplicación conteniendo el payload del usuario.

### Paso 6: Controladores y Endpoints (`AuthController`)
Se deben exponer dos endpoints principales para el flujo:

1. `GET /auth/google`: Activa el guard de Passport para redirigir al usuario a la pantalla de login de Google.
2. `GET /auth/google/redirect`: Endpoint de callback donde Google redirige tras la autenticación exitosa. Recibe el usuario validado en el objeto `req.user`.

```typescript
import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Guarda la redirección automática a Google
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    // req.user contiene el JWT o el usuario generado por AuthService
    const token = req.user.jwt;
    
    // Opción A: Responder con el token JSON
    // return res.status(200).json({ token });
    
    // Opción B (Recomendada para Frontend): Redirigir enviando el token por query param o cookie
    return res.redirect(`http://localhost:4200/login-success?token=${token}`);
  }
}
```

---

## 📑 Criterios de Evaluación y Defensa
Al finalizar la práctica, el alumno deberá presentar el código fuente funcional y responder a la defensa técnica evaluando:

| Criterio | Descripción | Puntaje |
| :--- | :--- | :--- |
| **Variables de Entorno** | Uso estricto de `.env` para almacenar credenciales sensibles (Base de datos, Client Secrets de Google, JWT Secret). | 15% |
| **Manejo de Base de Datos** | Correcto almacenamiento del perfil, control de duplicados por email y persistencia íntegra. | 25% |
| **Flujo Completo OAuth2** | Redirección exitosa, procesamiento del callback y generación correcta del token JWT de sesión. | 35% |
| **Estructura y Limpieza** | Uso adecuado de la arquitectura modular de NestJS, TypeScript tipado rigurosamente, y control de excepciones (`HttpException`). | 25% |

---

## 📝 Formato de Entrega
* Código subido a un repositorio privado/público de **GitHub** o **GitLab**.
* Incluir un archivo `README.md` detallando las instrucciones para clonar, configurar el archivo `.env.example` y correr el servidor en entorno de desarrollo.
