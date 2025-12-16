# Diagrama Entidad-Relación

## Modelo de Datos del Sistema de Gestión de Subvenciones

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SISTEMA DE SUBVENCIONES                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│     USUARIO       │       │    CONVOCATORIA   │       │  TIPO_DOCUMENTO   │
├───────────────────┤       ├───────────────────┤       ├───────────────────┤
│ PK id             │       │ PK id             │       │ PK id             │
│    cedula (UK)    │       │    nombre         │       │    codigo (UK)    │
│    email (UK)     │       │    anio           │       │    nombre         │
│    passwordHash   │       │    fechaInicio    │       │    descripcion    │
│    nombreCompleto │       │    fechaFin       │       │    obligatorio    │
│    rol            │       │    activa         │       │    extensiones[]  │
│    estado         │       │    creadoEn       │       │    activo         │
│    mfaHabilitado  │       └───────────────────┘       └───────────────────┘
│    mfaSecret      │               │                           │
│    intentosFallid │               │                           │
│    bloqueadoHasta │               │                           │
│    ultimoAcceso   │               │                           │
│    creadoEn       │               │                           │
│    actualizadoEn  │               │                           │
└───────────────────┘               │                           │
        │                           │                           │
        │ 1:N (beneficiario)        │                           │
        │ 1:N (arrendador)          │                           │
        │ 1:N (creadoPor)           │ 1:N                       │ 1:N
        ▼                           ▼                           │
┌───────────────────────────────────────────────────┐           │
│                     PROCESO                        │           │
├───────────────────────────────────────────────────┤           │
│ PK id                                             │           │
│ FK beneficiarioId ─────────────────────► USUARIO  │           │
│ FK arrendadorId ───────────────────────► USUARIO  │           │
│ FK convocatoriaId ─────────────────► CONVOCATORIA │           │
│ FK creadoPorId ────────────────────────► USUARIO  │           │
│    codigo (UK)     "SUB-2024-000001"              │           │
│    estado          enum EstadoProceso             │           │
│    formulario      JSON                           │           │
│    hashDocumento   string (hash PDF firmado)      │           │
│    firmadoEn       datetime                       │           │
│    creadoEn        datetime                       │           │
│    actualizadoEn   datetime                       │           │
└───────────────────────────────────────────────────┘           │
        │                                                       │
        │ 1:N                     1:N                           │
        ▼                         │                             │
┌───────────────────┐             │                             │
│     DECISION      │             │                             │
├───────────────────┤             │                             │
│ PK id             │             │                             │
│ FK procesoId ─────┼─────────────┘                             │
│ FK responsableId ─┼─────────────────────────────► USUARIO     │
│    tipo           │  enum: APROBADO, RECHAZADO,               │
│                   │        CORRECCION_SOLICITADA              │
│    estadoAnterior │  estado del proceso antes                 │
│    estadoNuevo    │  estado del proceso después               │
│    observaciones  │  texto libre                              │
│    fecha          │  datetime                                 │
└───────────────────┘                                           │
                                                                │
        ┌───────────────────────────────────────────────────────┘
        │
        │ 1:N
        ▼
┌───────────────────────────────────────────────────┐
│                    DOCUMENTO                       │
├───────────────────────────────────────────────────┤
│ PK id                                             │
│ FK procesoId ──────────────────────────► PROCESO  │
│ FK catalogoId ─────────────────────► TIPO_DOCUMEN │
│ FK subidoPorId ────────────────────────► USUARIO  │
│ FK validadoPorId ──────────────────────► USUARIO  │
│    nombreOriginal   string                        │
│    nombreAlmacenad  string (UUID.ext)             │
│    mimeType         string                        │
│    tamanoBytes      integer                       │
│    hash             SHA-256 del archivo           │
│    rutaAlmacenamie  path en disco                 │
│    estado           enum: PENDIENTE, APROBADO,    │
│                           RECHAZADO               │
│    observaciones    texto libre (si rechazado)    │
│    creadoEn         datetime                      │
│    actualizadoEn    datetime                      │
└───────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────┐
│                    AUDITORIA                       │
├───────────────────────────────────────────────────┤
│ PK id                                             │
│ FK usuarioId ──────────────────────────► USUARIO  │
│    accion          string (LOGIN, CREATE_PROCESO, │
│                           UPDATE_FORMULARIO, etc) │
│    entidad         string (proceso, documento...) │
│    entidadId       UUID de la entidad afectada    │
│    detalles        JSON con datos adicionales     │
│    ip              string                         │
│    userAgent       string                         │
│    fecha           datetime                       │
└───────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────┐
│                 REFRESH_TOKEN                      │
├───────────────────────────────────────────────────┤
│ PK id                                             │
│ FK usuarioId ──────────────────────────► USUARIO  │
│    token           string (UK)                    │
│    expiraEn        datetime                       │
│    revocado        boolean                        │
│    creadoEn        datetime                       │
└───────────────────────────────────────────────────┘
```

## Enumeraciones

### Rol
```
BENEFICIARIO     - Solicitante de la subvención
ARRENDADOR       - Propietario del inmueble
DIGER            - Personal administrativo
DIRECTORA        - Directora que aprueba
ORDENADOR_GASTO  - Firma final
CRI              - Auditoría (solo lectura)
```

### EstadoUsuario
```
ACTIVO           - Usuario puede acceder
INACTIVO         - Usuario desactivado
BLOQUEADO        - Bloqueado por intentos fallidos
```

### EstadoProceso
```
BORRADOR              - Inicial, editable
ENVIADA               - Enviada por beneficiario
EN_VALIDACION         - DIGER revisando
CORRECCION_SOLICITADA - Devuelta al beneficiario
PENDIENTE_DIRECTORA   - Esperando aprobación directora
APROBADA_DIRECTORA    - Aprobada, pendiente firma
REVISION_ORDENADOR    - Ordenador revisando
APROBADA              - Firmada y aprobada
RECHAZADA             - Rechazada en cualquier paso
CERRADA               - Proceso finalizado
```

### EstadoDocumento
```
PENDIENTE  - Sin validar
APROBADO   - Validado por DIGER
RECHAZADO  - Rechazado, requiere resubir
```

## Flujo de Estados del Proceso

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌────────────┐  │
│BORRADOR │───►│ ENVIADA │───►│EN_VALIDACION │───►│PENDIENTE_  │  │
└─────────┘    └─────────┘    └──────────────┘    │ DIRECTORA  │  │
     ▲                              │             └────────────┘  │
     │                              │                    │        │
     │              ┌───────────────┘                    │        │
     │              ▼                                    ▼        │
     │    ┌──────────────────┐              ┌────────────────┐   │
     └────│CORRECCION_       │              │APROBADA_       │   │
          │SOLICITADA        │              │DIRECTORA       │   │
          └──────────────────┘              └────────────────┘   │
                                                    │            │
                                                    ▼            │
                                            ┌────────────────┐   │
                                            │REVISION_       │   │
                                            │ORDENADOR       │   │
                                            └────────────────┘   │
                                                    │            │
                              ┌─────────────────────┼────────────┘
                              │                     │
                              ▼                     ▼
                      ┌─────────────┐       ┌─────────────┐
                      │  RECHAZADA  │       │  APROBADA   │
                      └─────────────┘       └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   CERRADA   │
                                            └─────────────┘
```

## Índices Recomendados

### Usuario
- `idx_usuario_cedula` - UNIQUE en cedula
- `idx_usuario_email` - UNIQUE en email
- `idx_usuario_rol` - Para filtros por rol
- `idx_usuario_estado` - Para filtros por estado

### Proceso
- `idx_proceso_codigo` - UNIQUE en codigo
- `idx_proceso_beneficiario` - FK beneficiarioId
- `idx_proceso_estado` - Para filtros por estado
- `idx_proceso_convocatoria` - FK convocatoriaId
- `idx_proceso_creado` - Para ordenamiento

### Documento
- `idx_documento_proceso` - FK procesoId
- `idx_documento_tipo` - FK catalogoId
- `idx_documento_estado` - Para filtros

### Auditoria
- `idx_auditoria_usuario` - FK usuarioId
- `idx_auditoria_fecha` - Para rangos de fecha
- `idx_auditoria_entidad` - Para filtrar por entidad
- `idx_auditoria_accion` - Para filtrar por acción

## Relaciones

| Tabla Origen | Relación | Tabla Destino | Descripción |
|--------------|----------|---------------|-------------|
| Proceso | N:1 | Usuario | Beneficiario del proceso |
| Proceso | N:1 | Usuario | Arrendador (opcional) |
| Proceso | N:1 | Usuario | Creado por (DIGER) |
| Proceso | N:1 | Convocatoria | Convocatoria asociada |
| Documento | N:1 | Proceso | Proceso al que pertenece |
| Documento | N:1 | TipoDocumento | Tipo de documento |
| Documento | N:1 | Usuario | Subido por |
| Documento | N:1 | Usuario | Validado por (opcional) |
| Decision | N:1 | Proceso | Proceso evaluado |
| Decision | N:1 | Usuario | Responsable de la decisión |
| Auditoria | N:1 | Usuario | Usuario que realizó la acción |
| RefreshToken | N:1 | Usuario | Usuario propietario del token |
