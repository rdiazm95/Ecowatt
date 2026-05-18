# EcoWatt ⚡

**EcoWatt** es una aplicación móvil (**Mobile + Backend**) diseñada para ayudar a los usuarios a optimizar su consumo eléctrico doméstico.

A través de la integración con los precios oficiales de la luz (**PVPC vía API ESIOS**), la app permite simular costes, programar usos de electrodomésticos y obtener recomendaciones inteligentes de ahorro energético.

---

## 🚀 Características principales

- **Dashboard en tiempo real:** precio actual de la luz con clasificación visual (**Verde / Amarillo / Rojo**) por franja horaria.
- **Simulador inteligente:** calcula el coste de usar cualquier electrodoméstico eligiendo potencia, horas y franja horaria.
- **Recomendaciones proactivas:** analiza las próximas 24 horas (incluyendo el día siguiente si hay datos) para sugerir el momento de mayor ahorro.
- **Programador de usos:** gestión de electrodomésticos programados del día, con persistencia en base de datos por usuario.
- **Estadísticas y análisis:** gráficas de consumo real, proyecciones de ahorro y cálculo de huella de CO2.
- **Historial:** registro histórico de usos programados y consumos anteriores.
- **Autenticación completa:** registro, login con JWT y recuperación de contraseña vía email (Brevo/SMTP).
- **Notificaciones push:** alertas proactivas sobre franjas baratas usando Firebase Cloud Messaging (FCM).
- **Perfil de usuario:** gestión del perfil, dispositivos asociados y preferencias.

---

## 🛠️ Stack tecnológico

### Backend

| Tecnología | Detalle |
|---|---|
| **Framework** | [NestJS](https://nestjs.com/) v11 (Node.js) |
| **Lenguaje** | TypeScript |
| **Base de datos** | PostgreSQL (Supabase) vía TypeORM |
| **Autenticación** | JWT + Passport |
| **Notificaciones push** | Firebase Admin SDK (FCM) |
| **Email** | Nodemailer + Brevo (SMTP) |
| **API externa** | ESIOS — Red Eléctrica de España |
| **Documentación API** | Swagger / OpenAPI |
| **Despliegue** | [Render](https://render.com/) |

### Mobile

| Tecnología | Detalle |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) con [Expo](https://expo.dev/) ~55 |
| **Lenguaje** | TypeScript |
| **Navegación** | React Navigation v7 (Bottom Tabs + Native Stack) |
| **HTTP** | Axios |
| **Almacenamiento seguro** | Expo Secure Store (tokens JWT) |
| **Notificaciones** | Firebase-Notificaciones |
| **Gráficas** | react-native-chart-kit + react-native-svg |
| **Build/distribución** | EAS Build |

### Infraestructura

| Servicio | Uso |
|---|---|
| **Supabase** | Base de datos PostgreSQL en la nube |
| **Render** | Hosting del backend NestJS |
| **Firebase** | Notificaciones push (FCM) |
| **Brevo** | Envío de emails transaccionales |

---

## 📂 Estructura del repositorio
```text
ecowatt/
├── backend/ # Servidor NestJS
│ └── src/
│ ├── auth/ # Autenticación JWT, registro, login, recuperación contraseña
│ ├── users/ # Gestión de usuarios
│ ├── devices/ # Electrodomésticos del usuario
│ ├── esios/ # Integración con API ESIOS (precios PVPC)
│ ├── prices/ # Lógica de precios y clasificación de franjas
│ ├── simulator/ # Motor de simulación de costes
│ ├── programaciones/ # Gestión de usos programados
│ ├── dashboard/ # Datos agregados para el dashboard
│ └── notifications/ # Notificaciones push vía Firebase
├── mobile/ # App React Native / Expo
│ └── src/
│ ├── screens/ # Dashboard, Simulador, Estadísticas, Historial, Perfil...
│ ├── navigation/ # Configuración de navegación
│ ├── api/ # Capa de comunicación con el backend
│ └── types/ # Tipos TypeScript compartidos
└── docker-compose.yml # Entorno de desarrollo local (opcional)


```
---

## ⚙️ Configuración e instalación

### Requisitos previos

- Node.js v18+
- Cuenta en [Supabase](https://supabase.com/) con un proyecto PostgreSQL
- Token de la [API ESIOS](https://www.esios.ree.es/) (solicitar en consultasios@ree.es)
- Proyecto en [Firebase](https://firebase.google.com/) para notificaciones push (opcional)
- Cuenta en [Brevo](https://www.brevo.com/) para envío de emails (opcional)

### 1. Clonar el repositorio

```bash
git clone https://github.com/rdiazm95/ecowatt.git
cd ecowatt
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
# Edita el .env con tus credenciales
npm run start:dev
```

#### Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_HOST` | Host de Supabase (`db.xxxx.supabase.co`) |
| `DATABASE_PORT` | Puerto PostgreSQL (por defecto `5432`) |
| `DATABASE_USER` | Usuario de la BD (`postgres`) |
| `DATABASE_PASSWORD` | Contraseña de la BD en Supabase |
| `DATABASE_NAME` | Nombre de la BD (`postgres`) |
| `DATABASE_URL` | URL completa de conexión (alternativa a los campos anteriores) |
| `ESIOS_TOKEN` | Token de autenticación de la API ESIOS |
| `ESIOS_BASE_URL` | `https://api.esios.ree.es` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de la clave de servicio Firebase (en una línea) |
| `MAIL_HOST` | Host SMTP Brevo (`smtp-relay.brevo.com`) |
| `MAIL_PORT` | Puerto SMTP (`2525`) |
| `MAIL_USER` | Tu email registrado en Brevo |
| `MAIL_PASSWORD` | Clave SMTP de Brevo |
| `PORT` | Puerto del servidor (Render lo asigna automáticamente) |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT |

> Genera el `JWT_SECRET` con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Configurar la app móvil

```bash
cd ../mobile
npm install
# Actualiza la URL del backend en src/api/ si usas entorno local (http://localhost:3000)
npx expo start
```

---

## 🚢 Despliegue

### Backend en Render

1. Crea un **Web Service** en [Render](https://render.com/) apuntando al directorio `backend/`.
2. Build command: `npm install && npm run build`
3. Start command: `npm run start:prod`
4. Añade todas las variables del `.env.example` en el panel de Render.

### Base de datos en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Copia las credenciales desde **Project Settings → Database**.
3. TypeORM usa `synchronize: true` en desarrollo — en producción se recomienda migraciones.

### App móvil — Build Android

#### Opción A: Build nativo con Gradle (recomendado)

Requiere tener el entorno Android SDK configurado (Android Studio).

```bash
cd mobile
npx expo prebuild --platform android   # Genera la carpeta android/ nativa
cd android
.\gradlew.bat assembleRelease           # Windows
# ./gradlew assembleRelease             # Linux / macOS
```

El APK firmado se genera en: mobile/android/app/build/outputs/apk/release/app-release.apk
### App móvil con EAS Build

```bash
cd mobile
npx eas build --platform android
npx eas build --platform ios
```

---

## 📜 Licencia

Copyright (c) 2026 Rubén

Este proyecto ha sido desarrollado como Trabajo de Fin de Grado (TFG). 
Todos los derechos reservados. Queda prohibida su reproducción, distribución  
o uso comercial sin autorización expresa del autor.
