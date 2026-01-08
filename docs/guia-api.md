# Guía de API

## Sistema de Gestión de Subvenciones - API REST

---

## Información General

| Propiedad | Valor |
|-----------|-------|
| Base URL | `http://localhost:4000/api` |
| Formato | JSON |
| Autenticación | JWT Bearer Token |
| Content-Type | `application/json` |

---

## Autenticación

### Headers Requeridos

```http
Authorization: Bearer <access_token>
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

### Obtener CSRF Token

```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123..."
}
```

---

## Endpoints de Autenticación

### POST /api/auth/login

Iniciar sesión en el sistema.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombreCompleto": "Juan Pérez",
    "rol": "BENEFICIARIO",
    "mfaHabilitado": false
  }
}
```

**Response MFA Requerido (200):**
```json
{
  "requireMFA": true,
  "tempToken": "temp_token_123"
}
```

**Errores:**
- `401` - Credenciales inválidas
- `403` - Usuario bloqueado
- `429` - Demasiados intentos

---

### POST /api/auth/mfa/verify

Verificar código MFA.

**Request:**
```json
{
  "tempToken": "temp_token_123",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

### POST /api/auth/refresh

Renovar token de acceso.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "nuevo_access_token...",
  "refreshToken": "nuevo_refresh_token..."
}
```

---

### POST /api/auth/logout

Cerrar sesión.

**Response (200):**
```json
{
  "message": "Sesión cerrada correctamente"
}
```

---

### POST /api/auth/forgot-password

Solicitar recuperación de contraseña.

**Request:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Si el email existe, recibirás instrucciones"
}
```

---

### POST /api/auth/reset-password

Restablecer contraseña con token.

**Request:**
```json
{
  "token": "token_recuperacion",
  "password": "nueva_contraseña_123"
}
```

**Response (200):**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

---

## Endpoints de Usuarios

### GET /api/users

Listar usuarios (requiere rol DIGER o superior).

**Query Parameters:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| page | int | Página (default: 1) |
| limit | int | Por página (default: 20) |
| rol | string | Filtrar por rol |
| estado | string | Filtrar por estado |
| search | string | Buscar por nombre/email |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "cedula": "12345678",
      "email": "usuario@ejemplo.com",
      "nombreCompleto": "Juan Pérez",
      "rol": "BENEFICIARIO",
      "estado": "ACTIVO",
      "creadoEn": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

### GET /api/users/:id

Obtener usuario por ID.

**Response (200):**
```json
{
  "id": "uuid",
  "cedula": "12345678",
  "email": "usuario@ejemplo.com",
  "nombreCompleto": "Juan Pérez",
  "rol": "BENEFICIARIO",
  "estado": "ACTIVO",
  "mfaHabilitado": true,
  "ultimoAcceso": "2024-12-15T14:30:00Z",
  "creadoEn": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/users

Crear nuevo usuario (requiere rol DIGER).

**Request:**
```json
{
  "cedula": "12345678",
  "email": "nuevo@ejemplo.com",
  "nombreCompleto": "María García",
  "password": "temporal_123",
  "rol": "BENEFICIARIO"
}
```

**Response (201):**
```json
{
  "id": "nuevo_uuid",
  "cedula": "12345678",
  "email": "nuevo@ejemplo.com",
  "nombreCompleto": "María García",
  "rol": "BENEFICIARIO",
  "estado": "ACTIVO"
}
```

---

### PUT /api/users/:id

Actualizar usuario.

**Request:**
```json
{
  "nombreCompleto": "María García López",
  "email": "maria.garcia@ejemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Usuario actualizado correctamente"
}
```

---

### PUT /api/users/:id/password

Cambiar contraseña.

**Request:**
```json
{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña_123"
}
```

**Response (200):**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

---

## Endpoints de Procesos

### GET /api/procesos

Listar procesos según rol del usuario.

**Query Parameters:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| page | int | Página |
| limit | int | Por página |
| estado | string | Filtrar por estado |
| desde | date | Fecha desde |
| hasta | date | Fecha hasta |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "codigo": "SUB-2024-000123",
      "estado": "DOCUMENTOS_EN_VALIDACION",
      "beneficiario": {
        "id": "uuid",
        "nombreCompleto": "Juan Pérez"
      },
      "documentosTotal": 6,
      "documentosValidados": 4,
      "creadoEn": "2024-12-01T10:00:00Z",
      "actualizadoEn": "2024-12-10T15:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### GET /api/procesos/:id

Obtener proceso completo.

**Response (200):**
```json
{
  "id": "uuid",
  "codigo": "SUB-2024-000123",
  "estado": "DOCUMENTOS_EN_VALIDACION",
  "formulario": {
    "datosPersonales": { ... },
    "datosVivienda": { ... },
    "datosBancarios": { ... }
  },
  "beneficiario": {
    "id": "uuid",
    "cedula": "12345678",
    "nombreCompleto": "Juan Pérez",
    "email": "juan@ejemplo.com"
  },
  "arrendador": {
    "id": "uuid",
    "nombreCompleto": "Pedro Propietario"
  },
  "documentos": [
    {
      "id": "uuid",
      "tipo": "CEDULA_IDENTIDAD",
      "nombreOriginal": "cedula.pdf",
      "estado": "APROBADO"
    }
  ],
  "decisiones": [
    {
      "tipo": "APROBADO",
      "motivo": "Documentación completa",
      "usuario": "Ana Validadora",
      "fecha": "2024-12-05T14:00:00Z"
    }
  ],
  "firmado": false,
  "creadoEn": "2024-12-01T10:00:00Z"
}
```

---

### POST /api/procesos

Crear nuevo proceso.

**Request:**
```json
{
  "beneficiarioId": "uuid_beneficiario",
  "arrendadorId": "uuid_arrendador",
  "formulario": {
    "datosPersonales": {
      "telefono": "555-1234",
      "direccion": "Calle Principal 123"
    },
    "datosVivienda": {
      "tipoVivienda": "APARTAMENTO",
      "montoAlquiler": 500
    }
  }
}
```

**Response (201):**
```json
{
  "id": "nuevo_uuid",
  "codigo": "SUB-2024-000124",
  "estado": "BORRADOR"
}
```

---

### PUT /api/procesos/:id

Actualizar formulario del proceso (solo en BORRADOR).

**Request:**
```json
{
  "formulario": {
    "datosPersonales": {
      "telefono": "555-9999"
    }
  }
}
```

**Response (200):**
```json
{
  "message": "Proceso actualizado correctamente"
}
```

---

### PUT /api/procesos/:id/enviar

Enviar proceso para validación.

**Response (200):**
```json
{
  "message": "Proceso enviado correctamente",
  "nuevoEstado": "ENVIADA"
}
```

---

### PUT /api/procesos/:id/validar

Aprobar documentación (rol DIGER).

**Request:**
```json
{
  "observaciones": "Documentación completa y correcta"
}
```

**Response (200):**
```json
{
  "message": "Proceso validado",
  "nuevoEstado": "VALIDADA_DIGER"
}
```

---

### PUT /api/procesos/:id/corregir

Solicitar correcciones al beneficiario.

**Request:**
```json
{
  "motivo": "Falta el certificado de ingresos actualizado"
}
```

**Response (200):**
```json
{
  "message": "Corrección solicitada",
  "nuevoEstado": "REQUIERE_CORRECCION"
}
```

---

### PUT /api/procesos/:id/aprobar

Aprobar proceso (DIRECTORA u ORDENADOR).

**Request:**
```json
{
  "observaciones": "Aprobado conforme a normativa"
}
```

**Response (200):**
```json
{
  "message": "Proceso aprobado",
  "nuevoEstado": "REVISION_ORDENADOR"
}
```

---

### PUT /api/procesos/:id/rechazar

Rechazar proceso.

**Request:**
```json
{
  "motivo": "No cumple con los requisitos de ingresos máximos"
}
```

**Response (200):**
```json
{
  "message": "Proceso rechazado",
  "nuevoEstado": "RECHAZADA"
}
```

---

### PUT /api/procesos/:id/firmar

Firmar proceso digitalmente (ORDENADOR_GASTO).

**Response (200):**
```json
{
  "message": "Proceso firmado correctamente",
  "nuevoEstado": "FIRMADA",
  "firmaHash": "sha256:abc123...",
  "firmadoEn": "2024-12-15T16:00:00Z"
}
```

---

### GET /api/procesos/:id/pdf

Descargar PDF del proceso.

**Response:** Archivo PDF binario

**Headers:**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="SUB-2024-000123.pdf"
```

---

## Endpoints de Documentos

### GET /api/documentos/proceso/:procesoId

Listar documentos de un proceso.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "CEDULA_IDENTIDAD",
      "nombreOriginal": "mi_cedula.pdf",
      "mimeType": "application/pdf",
      "tamanoBytes": 245678,
      "estado": "PENDIENTE",
      "version": 1,
      "creadoEn": "2024-12-01T11:00:00Z"
    }
  ],
  "requeridos": [
    {
      "tipo": "CONTRATO_ARRENDAMIENTO",
      "nombre": "Contrato de Arrendamiento",
      "obligatorio": true,
      "subido": false
    }
  ]
}
```

---

### POST /api/documentos

Subir documento.

**Request:** `multipart/form-data`
```
procesoId: uuid_proceso
tipo: CEDULA_IDENTIDAD
file: [archivo]
```

**Response (201):**
```json
{
  "id": "uuid_documento",
  "nombreOriginal": "cedula.pdf",
  "tipo": "CEDULA_IDENTIDAD",
  "estado": "PENDIENTE"
}
```

---

### GET /api/documentos/:id/download

Descargar documento.

**Response:** Archivo binario

---

### PUT /api/documentos/:id/validar

Aprobar documento (rol DIGER).

**Response (200):**
```json
{
  "message": "Documento aprobado",
  "estado": "APROBADO"
}
```

---

### PUT /api/documentos/:id/rechazar

Rechazar documento.

**Request:**
```json
{
  "motivo": "Documento ilegible, por favor suba una copia clara"
}
```

**Response (200):**
```json
{
  "message": "Documento rechazado",
  "estado": "RECHAZADO"
}
```

---

## Endpoints de Catálogo

### GET /api/catalogo/documentos

Listar tipos de documentos.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "CEDULA_IDENTIDAD",
      "nombre": "Cédula de Identidad",
      "descripcion": "Documento de identidad vigente",
      "obligatorio": true,
      "formatosPermitidos": ["pdf", "jpg", "png"],
      "tamanoMaximoMb": 10,
      "vigenciaDias": 365
    }
  ]
}
```

---

## Endpoints de Auditoría

### GET /api/auditoria/eventos

Listar eventos de auditoría (rol CRI o DIGER).

**Query Parameters:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| procesoId | uuid | Filtrar por proceso |
| usuarioId | uuid | Filtrar por usuario |
| tipo | string | Filtrar por tipo evento |
| desde | datetime | Fecha desde |
| hasta | datetime | Fecha hasta |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "VALIDACION",
      "descripcion": "Documento CEDULA_IDENTIDAD aprobado",
      "proceso": {
        "id": "uuid",
        "codigo": "SUB-2024-000123"
      },
      "usuario": {
        "id": "uuid",
        "nombreCompleto": "Ana Validadora"
      },
      "ipAddress": "192.168.1.100",
      "creadoEn": "2024-12-05T14:30:00Z"
    }
  ]
}
```

---

## Health Check

### GET /health

Estado básico del servidor.

```json
{
  "status": "ok",
  "timestamp": "2024-12-15T10:00:00Z"
}
```

### GET /health/ready

Estado con verificación de dependencias.

```json
{
  "status": "ready",
  "timestamp": "2024-12-15T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no existe |
| 409 | Conflict - Conflicto (ej: email duplicado) |
| 422 | Unprocessable Entity - Validación fallida |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error |

**Formato de Error:**
```json
{
  "error": "Mensaje descriptivo",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## Rate Limiting

| Endpoint | Límite |
|----------|--------|
| /api/auth/login | 5 por minuto |
| /api/auth/* | 20 por minuto |
| /api/* (general) | 100 por minuto |
| /api/documentos (upload) | 10 por minuto |

---

## Ejemplos con cURL

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"123456"}'
```

### Listar Procesos
```bash
curl http://localhost:4000/api/procesos \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf>"
```

### Subir Documento
```bash
curl -X POST http://localhost:4000/api/documentos \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf>" \
  -F "procesoId=uuid" \
  -F "tipo=CEDULA_IDENTIDAD" \
  -F "file=@/ruta/documento.pdf"
```

---

*Última actualización: Diciembre 2024*
