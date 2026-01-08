# Changelog

Todos los cambios notables del Sistema de Gestión de Subvenciones se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2024-12-16

### Añadido

#### Backend
- **Autenticación completa**
  - Login con JWT (access + refresh tokens)
  - MFA opcional con TOTP (Google Authenticator)
  - Recuperación de contraseña por email
  - Bloqueo automático tras intentos fallidos
  - Historial de contraseñas

- **Gestión de Usuarios**
  - CRUD completo de usuarios
  - Roles: BENEFICIARIO, ARRENDADOR, DIGER, DIRECTORA, ORDENADOR_GASTO, CRI
  - Estados: ACTIVO, INACTIVO, BLOQUEADO
  - Cambio de contraseña con validación

- **Gestión de Procesos**
  - Flujo completo de solicitud de subvención
  - 10 estados de proceso
  - Formulario dinámico en JSON
  - Generación de PDF con PDFKit
  - Firma digital con hash y metadatos

- **Gestión de Documentos**
  - Carga de archivos con Multer
  - Validación de tipos MIME
  - Hash SHA-256 para integridad
  - Versionamiento de documentos
  - Validación por DIGER

- **Seguridad**
  - Helmet.js para headers seguros
  - CSRF protection
  - Rate limiting por endpoint
  - Validación con Zod
  - Logging con Winston

- **Auditoría**
  - Registro de todos los eventos
  - IP y User-Agent en cada acción
  - Historial de decisiones
  - Registro de descargas

#### Frontend
- **Interfaz de Usuario**
  - Diseño responsive con TailwindCSS
  - Componentes accesibles con Radix UI
  - Iconografía con Lucide React

- **Autenticación**
  - Formulario de login
  - Soporte MFA
  - Recuperación de contraseña

- **Dashboard**
  - Vista según rol del usuario
  - Estadísticas de procesos
  - Accesos rápidos

- **Gestión de Procesos**
  - Lista de procesos con filtros
  - Detalle de proceso
  - Formulario de solicitud
  - Carga de documentos
  - Historial de cambios

- **Gestión de Usuarios** (admin)
  - Lista de usuarios
  - Creación de beneficiarios

#### Infraestructura
- **Docker Compose**
  - PostgreSQL 15
  - Redis 7
  - Backend Node.js
  - Frontend Nginx

- **Base de Datos**
  - Schema Prisma completo
  - Migraciones
  - Seed con datos de prueba

### Documentación
- README principal
- Diagrama ER
- Guía de despliegue
- Especificación OpenAPI
- Guía de API

---

## [Próximas Versiones]

### Planificado para v1.1.0
- [ ] Notificaciones por email
- [ ] Dashboard mejorado con gráficos
- [ ] Exportación de reportes Excel
- [ ] Búsqueda avanzada de procesos

### Planificado para v1.2.0
- [ ] Integración con sistema de pagos
- [ ] Firma electrónica avanzada
- [ ] API pública documentada
- [ ] Módulo de convocatorias

### Planificado para v2.0.0
- [ ] Multi-tenancy
- [ ] App móvil
- [ ] Integración con sistemas gubernamentales
- [ ] Machine learning para detección de fraude

---

## Guía de Versionado

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nueva funcionalidad compatible hacia atrás
- **PATCH** (0.0.X): Correcciones de bugs compatibles

---

## Enlaces

- [Repositorio](#)
- [Documentación](./docs/)
- [Issues](#)

---

*Mantenido por el equipo de desarrollo*
