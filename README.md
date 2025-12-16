# Sistema de Gestión de Subvenciones

Sistema web para la postulación, validación, aprobación y cierre de subvenciones económicas.

## Características Principales

- **Autenticación segura** con bcrypt, rate limiting, MFA (TOTP)
- **Control de acceso RBAC** con 6 roles: Beneficiario, Arrendador, Diger, Directora, Ordenador del Gasto, CRI
- **Gestión documental** con almacenamiento seguro fuera del webroot
- **Flujo de aprobaciones** secuencial con trazabilidad completa
- **Generación de PDF** con hash de integridad
- **Firma electrónica** con evidencia técnica
- **Auditoría completa** inmutable de todas las acciones

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + TailwindCSS + shadcn/ui |
| Base de datos | PostgreSQL 15 |
| ORM | Prisma |
| Cache/Sesiones | Redis |
| Contenedores | Docker + Docker Compose |

## Requisitos Previos

- Docker y Docker Compose
- Node.js 20+ (para desarrollo local)
- Git

## Inicio Rápido

### 1. Clonar y configurar

```bash
git clone <repositorio>
cd subvenciones

# Copiar variables de entorno
cp .env.example .env
```

### 2. Iniciar con Docker Compose

```bash
# Construir e iniciar todos los servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

### 3. Acceder a la aplicación

- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:4000
- **Documentación API**: http://localhost:4000/api/docs

### Usuarios de prueba

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Diger | diger@sistema.local | DigerAdmin123! |
| Directora | directora@sistema.local | DirectoraAdmin123! |
| Ordenador | ordenador@sistema.local | OrdenadorAdmin123! |
| CRI | cri@sistema.local | CriAdmin123! |

## Estructura del Proyecto

```
subvenciones/
├── backend/                 # API REST (Express + TypeScript)
│   ├── src/
│   │   ├── config/         # Configuración
│   │   ├── controllers/    # Controladores HTTP
│   │   ├── middlewares/    # Middlewares (auth, RBAC, rate-limit)
│   │   ├── models/         # Modelos Prisma
│   │   ├── routes/         # Rutas API
│   │   ├── services/       # Lógica de negocio
│   │   ├── utils/          # Utilidades
│   │   └── types/          # Tipos TypeScript
│   ├── prisma/             # Schema y migraciones
│   └── uploads/            # Almacenamiento de documentos (fuera webroot)
├── frontend/               # SPA React
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── pages/          # Páginas/Vistas
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Clientes API
│   │   ├── stores/         # Estado global (Zustand)
│   │   └── types/          # Tipos TypeScript
├── docs/                   # Documentación
│   ├── api/               # OpenAPI spec
│   ├── database/          # Modelo ER
│   └── deployment/        # Guías de despliegue
├── docker-compose.yml
└── README.md
```

## Flujo del Proceso

```
┌─────────────┐    ┌──────────┐    ┌────────────────────┐
│  Borrador   │───▶│ Enviada  │───▶│ Docs en Validación │
└─────────────┘    └──────────┘    └────────────────────┘
                                            │
        ┌───────────────────────────────────┤
        │                                   ▼
        │                          ┌────────────────┐
        │                          │ Requiere       │
        │                          │ Corrección     │
        │                          └────────────────┘
        │                                   │
        ▼                                   │
┌────────────────┐                         │
│ Validada Diger │◀────────────────────────┘
└────────────────┘
        │
        ▼
┌────────────────────┐
│ Revisión Directora │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Revisión Ordenador │
└────────────────────┘
        │
        ▼
┌──────────┐    ┌───────────────┐
│ Firmada  │───▶│ Finalizada CRI│
└──────────┘    └───────────────┘
```

## Estados del Proceso

| Estado | Descripción |
|--------|-------------|
| BORRADOR | Beneficiario completa formulario |
| ENVIADA | Postulación enviada, edición bloqueada |
| DOCUMENTOS_EN_VALIDACION | Diger valida documentos |
| REQUIERE_CORRECCION | Devuelto al beneficiario |
| VALIDADA_DIGER | Aprobada por Diger |
| REVISION_DIRECTORA | En revisión por Directora |
| REVISION_ORDENADOR | En revisión por Ordenador |
| FIRMADA | PDF firmado electrónicamente |
| FINALIZADA | Cerrada por CRI |
| RECHAZADA | Rechazada (terminal) |

## Seguridad

### Implementado

- ✅ HTTPS obligatorio (configurar en producción)
- ✅ Cookies Secure/HttpOnly/SameSite
- ✅ Protección CSRF
- ✅ Content Security Policy (CSP)
- ✅ Consultas preparadas (Prisma)
- ✅ Hash bcrypt para contraseñas
- ✅ Rate limiting en autenticación
- ✅ Almacenamiento de archivos fuera del webroot
- ✅ Validación MIME y tamaño de archivos
- ✅ Nombres UUID para archivos
- ✅ Auditoría completa de acciones

### Checklist de Seguridad para Producción

- [ ] Configurar certificados SSL/TLS
- [ ] Habilitar MFA para roles críticos
- [ ] Configurar escaneo antimalware
- [ ] Configurar backups automáticos
- [ ] Revisar y ajustar rate limits
- [ ] Configurar monitoreo y alertas

## API Documentation

La documentación OpenAPI está disponible en `/api/docs` cuando el servidor está corriendo.

## Desarrollo Local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Base de datos

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Licencia

Propietario - Todos los derechos reservados.

## Soporte

Para reportar problemas o solicitar ayuda, contactar al equipo de desarrollo.
