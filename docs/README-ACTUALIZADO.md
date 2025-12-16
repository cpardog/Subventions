# Sistema de Gestión de Subvenciones

## 📋 Descripción

Sistema web completo para la gestión de solicitudes de subvenciones de alquiler. Permite a los beneficiarios solicitar ayudas, cargar documentación, y seguir el proceso de aprobación a través de múltiples niveles jerárquicos.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│              React 18 + TypeScript + Vite                       │
│         TailwindCSS + Radix UI + React Query                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│              Node.js + Express + TypeScript                     │
│                   Prisma ORM + Zod                              │
└─────────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌───────────────────────┐   ┌───────────────────────┐
│     PostgreSQL 15     │   │       Redis 7         │
│    Base de datos      │   │   Caché + Sesiones    │
└───────────────────────┘   └───────────────────────┘
```

---

## 🚀 Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20 LTS | Runtime |
| Express | 4.18 | Framework HTTP |
| TypeScript | 5.3 | Tipado estático |
| Prisma | 5.7 | ORM |
| PostgreSQL | 15+ | Base de datos |
| Redis | 7+ | Caché y sesiones |
| Argon2 | 0.31 | Hash de contraseñas |
| JWT | 9.0 | Autenticación |
| Multer | 1.4 | Carga de archivos |
| PDFKit | 0.14 | Generación de PDF |
| Zod | 3.22 | Validación |
| Winston | 3.11 | Logging |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.2 | UI Framework |
| Vite | 5.0 | Build tool |
| TypeScript | 5.3 | Tipado estático |
| TailwindCSS | 3.3 | Estilos |
| Radix UI | Latest | Componentes accesibles |
| React Query | 5.13 | Estado servidor |
| React Hook Form | 7.49 | Formularios |
| Zustand | 4.4 | Estado global |
| Axios | 1.6 | Cliente HTTP |
| Lucide | 0.294 | Iconos |

---

## 📁 Estructura del Proyecto

```
Subvenciones/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Esquema de BD
│   │   └── seed.ts            # Datos iniciales
│   ├── src/
│   │   ├── config/            # Configuración (DB, Redis, env)
│   │   ├── middlewares/       # Auth, CSRF, rate-limit, errors
│   │   ├── routes/            # Endpoints API
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── proceso.routes.ts
│   │   │   ├── documento.routes.ts
│   │   │   ├── catalogo.routes.ts
│   │   │   └── auditoria.routes.ts
│   │   ├── services/          # Lógica de negocio
│   │   ├── types/             # Tipos TypeScript
│   │   ├── utils/             # Utilidades
│   │   └── index.ts           # Entrada principal
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # Vistas
│   │   │   ├── auth/          # Login, registro
│   │   │   ├── dashboard/     # Panel principal
│   │   │   ├── procesos/      # Gestión de procesos
│   │   │   ├── usuarios/      # Gestión de usuarios
│   │   │   └── perfil/        # Perfil de usuario
│   │   ├── services/          # API clients
│   │   ├── stores/            # Estado Zustand
│   │   └── lib/               # Utilidades
│   └── package.json
├── docs/
│   ├── diagrama-er.md         # Modelo de datos
│   ├── guia-despliegue.md     # Guía de despliegue
│   └── openapi.yaml           # Especificación API
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 👥 Roles del Sistema

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `BENEFICIARIO` | Solicitante de subvención | Crear proceso, cargar documentos, firmar |
| `ARRENDADOR` | Propietario del inmueble | Ver proceso asociado |
| `DIGER` | Personal administrativo | Validar documentos, gestionar procesos |
| `DIRECTORA` | Directora del área | Aprobar/rechazar procesos |
| `ORDENADOR_GASTO` | Ordenador de gasto | Firma final, aprobar pagos |
| `CRI` | Control interno | Auditoría (solo lectura) |

---

## 📊 Estados del Proceso

```
BORRADOR ──► ENVIADA ──► DOCUMENTOS_EN_VALIDACION ──► VALIDADA_DIGER
    │                            │                          │
    │                            ▼                          ▼
    │                  REQUIERE_CORRECCION          REVISION_DIRECTORA
    │                            │                          │
    │                            │                          ▼
    └────────────────────────────┘                  REVISION_ORDENADOR
                                                            │
                                           ┌────────────────┼────────────────┐
                                           ▼                ▼                ▼
                                       FIRMADA         RECHAZADA        (volver)
                                           │
                                           ▼
                                      FINALIZADA
```

### Descripción de Estados

| Estado | Descripción |
|--------|-------------|
| `BORRADOR` | Proceso iniciado, editable por beneficiario |
| `ENVIADA` | Enviada para revisión |
| `DOCUMENTOS_EN_VALIDACION` | DIGER validando documentación |
| `REQUIERE_CORRECCION` | Devuelta al beneficiario para correcciones |
| `VALIDADA_DIGER` | Documentos aprobados por DIGER |
| `REVISION_DIRECTORA` | Pendiente aprobación de directora |
| `REVISION_ORDENADOR` | Pendiente firma del ordenador |
| `FIRMADA` | Firmada digitalmente |
| `FINALIZADA` | Proceso completado |
| `RECHAZADA` | Solicitud rechazada |

---

## 🔐 Seguridad

### Autenticación
- **JWT** con tokens de acceso (1h) y refresh (7d)
- **MFA** opcional con TOTP (Google Authenticator)
- **Argon2** para hash de contraseñas
- **Historial de contraseñas** para evitar reutilización
- **Bloqueo automático** tras intentos fallidos

### Protección API
- **Helmet.js** - Headers de seguridad
- **CORS** - Orígenes controlados
- **CSRF** - Tokens de protección
- **Rate Limiting** - Límite de peticiones
- **Validación** - Zod + express-validator

### Documentos
- **Hash SHA-256** para integridad
- **Almacenamiento seguro** con nombres UUID
- **Validación de tipos MIME**
- **Límite de tamaño** configurable

---

## 🗄️ Modelo de Datos

### Entidades Principales

| Modelo | Descripción |
|--------|-------------|
| `Usuario` | Usuarios del sistema con roles |
| `Proceso` | Solicitud de subvención |
| `Documento` | Archivos adjuntos al proceso |
| `Decision` | Registro de aprobaciones/rechazos |
| `EventoAuditoria` | Log de acciones del sistema |
| `CatalogoDocumento` | Tipos de documentos requeridos |
| `Convocatoria` | Períodos de solicitud |
| `Sesion` | Sesiones activas de usuario |

### Modelos de Soporte

| Modelo | Descripción |
|--------|-------------|
| `PasswordHistorial` | Historial de contraseñas |
| `TokenRecuperacion` | Tokens de reset password |
| `CambioRol` | Log de cambios de rol |
| `HistorialPdf` | Versiones de PDF generados |
| `RegistroDescarga` | Log de descargas de documentos |
| `Configuracion` | Parámetros del sistema |

---

## 🔌 API Endpoints

### Autenticación (`/api/auth`)
```
POST   /login              # Iniciar sesión
POST   /logout             # Cerrar sesión
POST   /refresh            # Renovar token
POST   /forgot-password    # Solicitar reset
POST   /reset-password     # Cambiar contraseña
POST   /mfa/setup          # Configurar MFA
POST   /mfa/verify         # Verificar código MFA
DELETE /mfa/disable        # Desactivar MFA
```

### Usuarios (`/api/users`)
```
GET    /                   # Listar usuarios
GET    /:id                # Obtener usuario
POST   /                   # Crear usuario
PUT    /:id                # Actualizar usuario
DELETE /:id                # Desactivar usuario
PUT    /:id/password       # Cambiar contraseña
PUT    /:id/rol            # Cambiar rol
```

### Procesos (`/api/procesos`)
```
GET    /                   # Listar procesos
GET    /:id                # Obtener proceso
POST   /                   # Crear proceso
PUT    /:id                # Actualizar proceso
PUT    /:id/enviar         # Enviar proceso
PUT    /:id/validar        # Validar (DIGER)
PUT    /:id/aprobar        # Aprobar
PUT    /:id/rechazar       # Rechazar
PUT    /:id/corregir       # Solicitar corrección
PUT    /:id/firmar         # Firmar proceso
GET    /:id/pdf            # Descargar PDF
GET    /:id/historial      # Historial de cambios
```

### Documentos (`/api/documentos`)
```
GET    /proceso/:procesoId # Listar por proceso
POST   /                   # Subir documento
GET    /:id                # Obtener metadatos
GET    /:id/download       # Descargar archivo
PUT    /:id/validar        # Validar documento
PUT    /:id/rechazar       # Rechazar documento
DELETE /:id                # Eliminar documento
```

### Catálogo (`/api/catalogo`)
```
GET    /documentos         # Tipos de documentos
GET    /documentos/:id     # Obtener tipo
POST   /documentos         # Crear tipo
PUT    /documentos/:id     # Actualizar tipo
```

### Auditoría (`/api/auditoria`)
```
GET    /eventos            # Listar eventos
GET    /eventos/:id        # Detalle evento
GET    /proceso/:procesoId # Eventos de proceso
GET    /usuario/:usuarioId # Eventos de usuario
```

### Health Check
```
GET    /health             # Estado básico
GET    /health/ready       # Estado con dependencias
```

---

## ⚙️ Configuración

### Variables de Entorno

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/subvenciones_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<clave-secreta-64-chars>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Sesión
SESSION_SECRET=<clave-secreta>

# CORS
CORS_ORIGIN=http://localhost:3000

# Archivos
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE_MB=10

# MFA
MFA_ISSUER=SistemaSubvenciones

# Servidor
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
```

---

## 🛠️ Instalación

### Requisitos Previos
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (opcional)

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Subvenciones

# 2. Configurar variables
cp .env.example .env
# Editar .env con valores locales

# 3. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 4. Base de datos
cd ../backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 5. Iniciar desarrollo
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd ../frontend
npm run dev
```

### Con Docker

```bash
# Construir e iniciar
docker-compose up -d --build

# Ejecutar migraciones
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 🧪 Testing

```bash
# Backend
cd backend
npm test              # Ejecutar tests
npm run test:watch    # Watch mode
npm run test:coverage # Con cobertura

# Linting
npm run lint          # Verificar
npm run lint:fix      # Corregir
```

---

## 📦 Scripts Disponibles

### Backend
| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Producción |
| `npm test` | Ejecutar tests |
| `npm run prisma:studio` | UI de base de datos |
| `npm run db:reset` | Reset completo BD |

### Frontend
| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo con Vite |
| `npm run build` | Build producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Verificar código |

---

## 🔄 Flujo de Trabajo

### 1. Beneficiario
1. Registrarse / Iniciar sesión
2. Crear nueva solicitud
3. Completar formulario
4. Cargar documentos requeridos
5. Enviar solicitud
6. Corregir si es solicitado
7. Firmar digitalmente

### 2. DIGER
1. Ver procesos pendientes
2. Validar documentos uno a uno
3. Aprobar o solicitar correcciones
4. Pasar a directora cuando completo

### 3. Directora
1. Revisar proceso validado
2. Aprobar o rechazar
3. Pasar a ordenador si aprobado

### 4. Ordenador de Gasto
1. Revisión final
2. Aprobar y firmar
3. Proceso finalizado

---

## 📝 Documentación Adicional

- [Diagrama ER](./docs/diagrama-er.md) - Modelo de datos detallado
- [Guía de Despliegue](./docs/guia-despliegue.md) - Instrucciones producción
- [OpenAPI](./docs/openapi.yaml) - Especificación completa de la API

---

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready -h localhost -p 5432

# Con Docker
docker-compose exec postgres pg_isready
```

### Error de conexión a Redis
```bash
# Verificar Redis
redis-cli ping

# Con Docker
docker-compose exec redis redis-cli ping
```

### Documentos no se suben
```bash
# Verificar permisos del directorio
ls -la /app/uploads
chmod -R 755 /app/uploads
```

### Prisma no sincroniza
```bash
npx prisma generate
npx prisma migrate dev --name fix_sync
```

---

## 📄 Licencia

Propiedad de la organización. Todos los derechos reservados.

---

## 👨‍💻 Contacto

Para soporte técnico o consultas sobre el sistema, contactar al equipo de desarrollo.

---

*Última actualización: Diciembre 2024*
