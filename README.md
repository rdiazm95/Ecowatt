# EcoWatt ⚡

**EcoWatt** es una solución integral (**Mobile + Backend**) diseñada para ayudar a los usuarios a optimizar su consumo eléctrico doméstico.

A través de la integración con los precios oficiales de la luz (**PVPC vía ESIOS**), la aplicación permite simular costes, programar usos y obtener recomendaciones inteligentes de ahorro.

## 🚀 Características principales

- **Simulador inteligente:** calcula el coste real de usar cualquier electrodoméstico en diferentes franjas horarias.
- **Aviso de franjas:** clasificación visual (**Verde / Amarillo / Rojo**) según el precio actual frente a la media del día.
- **Recomendaciones proactivas:** el sistema escanea las próximas 24 horas, incluyendo el día siguiente si los datos están disponibles, para sugerir el momento de mayor ahorro.
- **Programador diario:** gestión local de los usos previstos para el día con persistencia de datos.
- **Estadísticas reales:** análisis de consumo y coste basado estrictamente en el uso programado, con proyecciones de ahorro y cálculo de huella de CO2.

## 🛠️ Stack tecnológico

### Backend

- **Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL / TypeORM
- **Integración:** API ESIOS (Red Eléctrica de España)

### Mobile

- **Framework:** [React Native](https://reactnative.dev/) con [Expo](https://expo.dev/)
- **Lenguaje:** TypeScript
- **Estado y almacenamiento:** AsyncStorage para persistencia local
- **Gráficas:** React Native Chart Kit

## 📂 Estructura del repositorio

```bash
ecowatt/
├── backend/            # Servidor NestJS y lógica de negocio
├── mobile/             # Aplicación móvil en React Native
└── docker-compose.yml  # Configuración para despliegue rápido
```

## ⚙️ Configuración e instalación

### Requisitos previos

- Node.js (v18+)
- Docker (opcional, para la base de datos)

### 1. Clonar el repositorio

```bash
git clone https://github.com/rdiazm95/ecowatt.git
cd ecowatt
```

### 2. Configurar el backend

```bash
cd backend
npm install
# Configura tu archivo .env basado en .env.example
npm run start:dev
```

### 3. Configurar el mobile

```bash
cd ../mobile
npm install
npx expo start
```
