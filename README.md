# Sistema Predictivo de Gestión del Tiempo

Proyecto de titulación en Desarrollo de Software (YAVIRAC, 2026), desarrollado en equipo.

## Descripción
Plataforma que combina un asistente conversacional con IA y un dashboard para ayudar a estudiantes a planificar su trabajo académico. El asistente entiende lenguaje natural y agenda eventos directamente en Google Calendar; el dashboard consolida alertas sobre exámenes sin repaso y días con carga académica excesiva para anticiparse a los cuellos de botella.

## Funcionalidades
- Conversación guiada por IA que transforma solicitudes libres (fecha, hora y propósito) en eventos de Google Calendar.
- Confirmación automática del evento creada por el flujo n8n y verificación de coincidencia entre lo solicitado y lo agendado.
- Registro en MongoDB de cada interacción, duración estimada y categoría (clases, exámenes, entregas, estudio personal, trabajos en grupo o personal).
- Dashboard React que resalta días sobrecargados, exámenes sin repaso detectados y tendencias de estudio.

## Arquitectura
La capa de presentación (React/Vite) consume el backend Node/Express y las APIs de chat que se reenvían a n8n. n8n orquesta el modelo IA y las herramientas externas para crear eventos y almacenar la evidencia en MongoDB.

```mermaid
flowchart LR
    React[React + Vite (dashboard y alertas)] --> Node[Node/Express BFF (auth, JWT, chat proxy)]
    Node --> n8n[n8n (chat trigger + AI Agent + HTTP Request)]
    n8n --> Azure[Azure OpenAI GPT-4o]
    n8n --> Google[Google Calendar API]
    n8n --> Mongo[MongoDB (eventos, tokens)]
```

## Stack
| Capa | Tecnologías |
|---|---|
| Frontend | React 19 + Vite + TypeScript + TanStack Query + Recharts |
| Backend/BFF | Node.js 20 + Express + Passport + JWT + Axios |
| Orquestación | n8n (Chat Trigger, LangChain AI Agent, HTTP Request tool) |
| IA | Azure OpenAI modelo gpt-4o configurado desde el flujo n8n |
| Calendario y Auth | Google OAuth 2.0 + Google Calendar API |
| Persistencia | MongoDB 5.6 gestionado con contenedor Docker |
| Infraestructura | Docker Compose para n8n y MongoDB (el frontend y backend se levantan por separado) |

## Requisitos
- Docker y docker-compose instalados en el entorno (la versión incluida en Docker Desktop es suficiente).
- Node.js 20+ y npm 10+ para instalar las dependencias de backend y frontend.
- Cuenta Google Cloud con OAuth 2.0 en modo Testing y acceso a la API de Google Calendar.
- Credenciales de Azure OpenAI que permitan usar el modelo gpt-4o desde n8n.
- Conectividad local entre backend, frontend y el contenedor de n8n/MongoDB.

## Cómo levantar el proyecto
```bash
docker-compose up -d
```
Este comando levanta MongoDB y n8n. Una vez en funcionamiento puedes acceder a las interfaces:
- n8n: http://localhost:5678
- MongoDB: mongodb://localhost:27017 (base de datos `tiempo_db`)

**Backend:**
```bash
cd backend
npm install
npm run dev
```
La API escucha en http://localhost:4000 y expone `/auth/google`, `/chat`, `/eventos` y `/predicciones`.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
El dashboard corre típicamente en http://localhost:5173 y consume el backend mediante JWT.

## Configuración
Antes de arrancar backend y frontend copia el archivo de ejemplo de variables de entorno:
```bash
cd backend
copy .env.example .env  # en Unix: cp .env.example .env
```
Luego completa las variables con los secretos reales. En particular:
- `N8N_WEBHOOK_URL` debe apuntar a la URL del trigger “When chat message received” que importa n8n.
- `N8N_INTERNAL_SECRET` tiene que coincidir con el valor que luego usará la credencial Header Auth en n8n (`x-internal-secret`).
- `CALENDAR_TOKEN_KEY_BASE64` es la clave AES-256-GCM en base64 de 32 bytes que protege los tokens de Google; se puede generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

## Autenticación
El backend usa Google OAuth 2.0 en modo Testing, lo que exige agregar cada cuenta como tester en la consola de Google Cloud y mantiene un límite de 100 testers. Además, los tokens caducan cada 7 días cuando se está en Testing, por lo que es necesario volver a autorizar el flujo periódicamente. Las credenciales devuelven un JWT con validez de 7 días que se consume desde el frontend.

## Cómo importar n8n/flujo.json
1. Inicia sesión en n8n (http://localhost:5678 en el contenedor levantado por Docker) y usa el botón de importar para cargar `n8n/flujo.json` desde el repositorio.
2. Crea estas credenciales en n8n y asígnalas a los nodos correspondientes:
   - **Azure OpenAI** (modelo `gpt-4o`) para el nodo `AI Agent` y sus herramientas de LangChain.
   - **MongoDB** apuntando a `mongodb://localhost:27017/tiempo_db` para el nodo `Insert documents`.
   - **Header Auth** con el encabezado `x-internal-secret` y el valor definido en `N8N_INTERNAL_SECRET`; así se protege el nodo `HTTP Request` que llama al backend.
3. Reasigna las credenciales en cada nodo (por ejemplo, la herramienta `Google Calendar` usa su propia credencial OAuth, el node `HTTP Request` usa el Header Auth y el insert en Mongo usa la nueva conexión).
4. Copia la URL completa del trigger `When chat message received` (visible en el panel de webhook del nodo) y pégala en `N8N_WEBHOOK_URL` dentro de `backend/.env`. Ese endpoint recibe `{ mensaje, sessionId }` y el backend lo reenvía automáticamente con el header protegido.

## Estructura de carpetas actualizada
```text
.
├── docker-compose.yml
├── n8n/
├── database/
│   └── modelos/
├── backend/
└── frontend/
```

## Limitaciones conocidas
- Google OAuth 2.0 en modo Testing sólo permite a los testers registrados usar la aplicación y requiere reautorización al expirar los tokens (cada 7 días), por lo que no está listo para producción sin migrar a modo “en producción”.
- El flujo n8n depende de los secretos locales (`N8N_INTERNAL_SECRET` y las credenciales de Azure/OpenAI) y no incluye un mecanismo de replicación automática; es necesario validar manualmente las credenciales tras importar el flujo.
- La capa actual sólo permite crear eventos nuevos y consulta indicadores básicos de carga académica; no se pueden listar ni modificar eventos existentes ni automatizar recordatorios fuera del dashboard.
