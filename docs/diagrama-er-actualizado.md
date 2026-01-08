# Diagrama Entidad-Relación (Actualizado)

## Sistema de Gestión de Subvenciones - Modelo de Datos v2.0

---

## Diagrama General

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SISTEMA DE GESTIÓN DE SUBVENCIONES                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │              USUARIO                │
                    ├─────────────────────────────────────┤
                    │ PK id                    UUID       │
                    │    cedula                UK         │
                    │    email                 UK         │
                    │    nombreCompleto        string     │
                    │    passwordHash          string     │
                    │    rol                   Rol        │
                    │    estado                EstadoUsr  │
                    │    mfaSecret             string?    │
                    │    mfaHabilitado         boolean    │
                    │    intentosFallidos      int        │
                    │    bloqueadoHasta        datetime?  │
                    │    ultimoAcceso          datetime?  │
                    │ FK creadoPorId           UUID?      │
                    │    creadoEn              datetime   │
                    │    actualizadoEn         datetime   │
                    └─────────────────────────────────────┘
                          │ │ │ │ │ │
         ┌────────────────┘ │ │ │ │ └─────────────────────────────┐
         │      ┌───────────┘ │ │ └───────────────┐               │
         │      │     ┌───────┘ └───────┐         │               │
         ▼      ▼     ▼                 ▼         ▼               ▼
┌────────────┐┌────────────┐┌─────────────┐┌───────────┐┌──────────┐┌──────────────┐
│PASSWORD    ││TOKEN       ││  SESION     ││CAMBIO_ROL ││EVENTO    ││  DECISION    │
│HISTORIAL   ││RECUPERACION││             ││           ││AUDITORIA ││              │
├────────────┤├────────────┤├─────────────┤├───────────┤├──────────┤├──────────────┤
│PK id       ││PK id       ││PK id        ││PK id      ││PK id     ││PK id         │
│FK usuarioId││FK usuarioId││FK usuarioId ││FK userId  ││FK userId?││FK procesoId  │
│  passHash  ││   token UK ││   tokenHash ││  rolAnt   ││FK procId?││FK usuarioId  │
│  creadoEn  ││   expiraEn ││   ipAddress ││  rolNuevo ││  tipo    ││  estadoAnt   │
│            ││   usado    ││   userAgent ││  motivo   ││  descrip ││  estadoNuevo │
│            ││   creadoEn ││   expiraEn  ││  cambById ││  detalles││  aprobado    │
│            ││            ││   creadoEn  ││  creadoEn ││  ip/ua   ││  motivo      │
│            ││            ││   ultimaAct ││           ││  creadoEn││  rol,ip,ua   │
└────────────┘└────────────┘└─────────────┘└───────────┘└──────────┘└──────────────┘

                    ┌─────────────────────────────────────┐
                    │              PROCESO                 │
                    ├─────────────────────────────────────┤
                    │ PK id                    UUID       │
                    │    codigo                UK         │
                    │ FK beneficiarioId        UUID       │──────────► USUARIO
                    │ FK arrendadorId          UUID?      │──────────► USUARIO
                    │    estado                EstadoProc │
                    │    formulario            JSON?      │
                    │    pdfPath               string?    │
                    │    pdfHash               string?    │
                    │    pdfVersion            int        │
                    │    firmado               boolean    │
                    │    firmadoEn             datetime?  │
                    │ FK firmadoPorId          UUID?      │
                    │    firmaHash             string?    │
                    │    firmaIp               string?    │
                    │    firmaUserAgent        string?    │
                    │    cerradoEn             datetime?  │
                    │ FK cerradoPorId          UUID?      │
                    │    creadoEn              datetime   │
                    │    actualizadoEn         datetime   │
                    │    enviadoEn             datetime?  │
                    └─────────────────────────────────────┘
                          │ │ │ │
         ┌────────────────┘ │ │ └────────────────┐
         │          ┌──────┘ └──────┐            │
         ▼          ▼               ▼            ▼
┌──────────────┐┌──────────────┐┌──────────┐┌──────────────┐
│  DOCUMENTO   ││HISTORIAL_PDF ││ DECISION ││EVENTO_AUDIT  │
├──────────────┤├──────────────┤├──────────┤├──────────────┤
│PK id         ││PK id         ││(ver arr) ││(ver arriba)  │
│FK procesoId  ││FK procesoId  ││          ││              │
│FK catalogoId ││   version    ││          ││              │
│FK cargadoById││   pdfPath    ││          ││              │
│FK validById? ││   pdfHash    ││          ││              │
│  nombreOrig  ││   creadoEn   ││          ││              │
│  nombreAlm   ││              ││          ││              │
│  rutaArchivo ││              ││          ││              │
│  mimeType    ││              ││          ││              │
│  tamanoBytes ││              ││          ││              │
│  hashArchivo ││              ││          ││              │
│  estado      ││              ││          ││              │
│  validadoEn  ││              ││          ││              │
│  motivoRech  ││              ││          ││              │
│  version     ││              ││          ││              │
│  esActivo    ││              ││          ││              │
│  creadoEn    ││              ││          ││              │
└──────────────┘└──────────────┘└──────────┘└──────────────┘
        │
        ▼
┌──────────────────┐
│REGISTRO_DESCARGA │
├──────────────────┤
│PK id             │
│FK documentoId    │
│   usuarioId      │
│   ipAddress      │
│   userAgent      │
│   creadoEn       │
└──────────────────┘

┌───────────────────────┐        ┌───────────────────────┐
│  CATALOGO_DOCUMENTO   │        │     CONVOCATORIA      │
├───────────────────────┤        ├───────────────────────┤
│ PK id          UUID   │        │ PK id          UUID   │
│    tipo        UK     │◄───────│    nombre      string │
│    nombre      string │        │    descripcion string?│
│    descripcion string?│        │    fechaInicio datetime│
│    obligatorio bool   │        │    fechaFin    datetime│
│    formatosPerm []    │        │    activa      bool   │
│    tamanoMaxMb int    │        │    formularioJson JSON?│
│    vigenciaDias int?  │        │    creadoEn    datetime│
│    activo      bool   │        │    actualizadoEn datetime│
│    orden       int    │        └───────────────────────┘
│    creadoEn    datetime│
│    actualizadoEn datetime│
└───────────────────────┘

┌───────────────────────┐
│    CONFIGURACION      │
├───────────────────────┤
│ PK id          UUID   │
│    clave       UK     │
│    valor       string │
│    descripcion string?│
│    creadoEn    datetime│
│    actualizadoEn datetime│
└───────────────────────┘
```

---

## Enumeraciones (Enums)

### Rol
```typescript
enum Rol {
  BENEFICIARIO     // Solicitante de la subvención
  ARRENDADOR       // Propietario del inmueble
  DIGER            // Personal administrativo
  DIRECTORA        // Directora que aprueba
  ORDENADOR_GASTO  // Firma final
  CRI              // Auditoría (solo lectura)
}
```

### EstadoUsuario
```typescript
enum EstadoUsuario {
  ACTIVO      // Usuario puede acceder
  INACTIVO    // Usuario desactivado
  BLOQUEADO   // Bloqueado por intentos fallidos
}
```

### EstadoProceso
```typescript
enum EstadoProceso {
  BORRADOR                  // Inicial, editable
  ENVIADA                   // Enviada por beneficiario
  DOCUMENTOS_EN_VALIDACION  // DIGER validando docs
  REQUIERE_CORRECCION       // Devuelta para corrección
  VALIDADA_DIGER            // Docs validados
  REVISION_DIRECTORA        // Esperando directora
  REVISION_ORDENADOR        // Ordenador revisando
  FIRMADA                   // Firmada digitalmente
  FINALIZADA                // Proceso completado
  RECHAZADA                 // Rechazada
}
```

### TipoDocumento
```typescript
enum TipoDocumento {
  CEDULA_IDENTIDAD
  CONTRATO_ARRENDAMIENTO
  CERTIFICADO_RESIDENCIA
  RECIBO_SERVICIO
  CERTIFICADO_INGRESOS
  DECLARACION_JURADA
  OTRO
}
```

### EstadoDocumento
```typescript
enum EstadoDocumento {
  PENDIENTE   // Sin validar
  APROBADO    // Validado por DIGER
  RECHAZADO   // Rechazado, requiere resubir
}
```

### TipoEvento (Auditoría)
```typescript
enum TipoEvento {
  CREACION
  EDICION
  ENVIO
  VALIDACION
  APROBACION
  RECHAZO
  CORRECCION_SOLICITADA
  CORRECCION_ENVIADA
  FIRMA
  CIERRE
  CAMBIO_ESTADO
}
```

---

## Flujo de Estados del Proceso

```
                                    ┌────────────────────────┐
                                    │       BORRADOR         │
                                    │  (Beneficiario edita)  │
                                    └───────────┬────────────┘
                                                │ Enviar
                                                ▼
                                    ┌────────────────────────┐
                                    │        ENVIADA         │
                                    │ (Esperando validación) │
                                    └───────────┬────────────┘
                                                │ DIGER toma
                                                ▼
                                    ┌────────────────────────┐
                       ┌───────────►│DOCUMENTOS_EN_VALIDACION│◄──────────┐
                       │            │    (DIGER valida)      │           │
                       │            └───────────┬────────────┘           │
                       │                   ┌────┴────┐                   │
                       │                   ▼         ▼                   │
              ┌────────┴───────┐   ┌────────────┐   │                   │
              │REQUIERE_       │   │VALIDADA_   │   │                   │
              │CORRECCION      │   │DIGER       │   │ Rechazar          │
              │(Ben. corrige)  │   └─────┬──────┘   │                   │
              └────────┬───────┘         │          │                   │
                       │                 ▼          │                   │
                       │       ┌────────────────┐   │                   │
                       │       │REVISION_       │   │                   │
                       │       │DIRECTORA       │───┤                   │
                       │       └────────┬───────┘   │                   │
                       │                │           │                   │
                       │    ┌───────────┴───────────┤                   │
                       │    ▼                       ▼                   │
                       │ ┌────────────────┐  ┌───────────┐             │
                       │ │REVISION_       │  │RECHAZADA  │             │
                       │ │ORDENADOR       │  └───────────┘             │
                       │ └────────┬───────┘                            │
                       │          │                                    │
                       │    ┌─────┴─────┐                              │
                       │    ▼           ▼                              │
                       │ ┌───────┐  ┌───────────┐                      │
                       │ │FIRMADA│  │Devolver   │──────────────────────┘
                       │ └───┬───┘  └───────────┘
                       │     │
                       │     ▼
                       │ ┌───────────┐
                       └─┤FINALIZADA │
                         └───────────┘
```

---

## Relaciones Detalladas

| Origen | Tipo | Destino | Campo FK | Descripción |
|--------|------|---------|----------|-------------|
| Usuario | 1:N | Usuario | creadoPorId | Usuario creador (DIGER crea beneficiarios) |
| Usuario | 1:N | PasswordHistorial | usuarioId | Historial de contraseñas |
| Usuario | 1:N | TokenRecuperacion | usuarioId | Tokens de reset password |
| Usuario | 1:N | Sesion | usuarioId | Sesiones activas |
| Usuario | 1:N | CambioRol | usuarioId | Historial de cambios de rol |
| Usuario | 1:N | Proceso | beneficiarioId | Procesos como beneficiario |
| Usuario | 1:N | Proceso | arrendadorId | Procesos como arrendador |
| Usuario | 1:N | Documento | cargadoPorId | Documentos subidos |
| Usuario | 1:N | Documento | validadoPorId | Documentos validados |
| Usuario | 1:N | EventoAuditoria | usuarioId | Eventos de auditoría |
| Usuario | 1:N | Decision | usuarioId | Decisiones tomadas |
| Proceso | 1:N | Documento | procesoId | Documentos del proceso |
| Proceso | 1:N | Decision | procesoId | Decisiones del proceso |
| Proceso | 1:N | EventoAuditoria | procesoId | Eventos del proceso |
| Proceso | 1:N | HistorialPdf | procesoId | Versiones de PDF |
| CatalogoDocumento | 1:N | Documento | catalogoId | Tipo de documento |
| Documento | 1:N | RegistroDescarga | documentoId | Descargas del documento |

---

## Índices

### Usuario
```sql
CREATE UNIQUE INDEX idx_usuario_cedula ON usuarios(cedula);
CREATE UNIQUE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_usuario_rol ON usuarios(rol);
CREATE INDEX idx_usuario_estado ON usuarios(estado);
```

### Proceso
```sql
CREATE UNIQUE INDEX idx_proceso_codigo ON procesos(codigo);
CREATE INDEX idx_proceso_beneficiario ON procesos(beneficiario_id);
CREATE INDEX idx_proceso_estado ON procesos(estado);
CREATE INDEX idx_proceso_creado ON procesos(creado_en);
```

### Documento
```sql
CREATE INDEX idx_documento_proceso ON documentos(proceso_id);
CREATE INDEX idx_documento_catalogo ON documentos(catalogo_id);
CREATE INDEX idx_documento_estado ON documentos(estado);
```

### EventoAuditoria
```sql
CREATE INDEX idx_evento_proceso ON eventos_auditoria(proceso_id);
CREATE INDEX idx_evento_usuario ON eventos_auditoria(usuario_id);
CREATE INDEX idx_evento_tipo ON eventos_auditoria(tipo);
CREATE INDEX idx_evento_creado ON eventos_auditoria(creado_en);
```

### Decision
```sql
CREATE INDEX idx_decision_proceso ON decisiones(proceso_id);
CREATE INDEX idx_decision_usuario ON decisiones(usuario_id);
CREATE INDEX idx_decision_creado ON decisiones(creado_en);
```

---

## Mapeo de Tablas (Prisma → PostgreSQL)

| Modelo Prisma | Tabla PostgreSQL |
|---------------|------------------|
| Usuario | usuarios |
| PasswordHistorial | password_historial |
| TokenRecuperacion | tokens_recuperacion |
| Sesion | sesiones |
| CambioRol | cambios_rol |
| CatalogoDocumento | catalogo_documentos |
| Proceso | procesos |
| Documento | documentos |
| RegistroDescarga | registro_descargas |
| HistorialPdf | historial_pdf |
| Decision | decisiones |
| EventoAuditoria | eventos_auditoria |
| Configuracion | configuracion |
| Convocatoria | convocatorias |

---

## Notas de Diseño

### Seguridad
- Contraseñas hasheadas con Argon2
- Historial de últimas 5 contraseñas
- Bloqueo automático tras 5 intentos fallidos
- Tokens de sesión con hash

### Auditoría
- Todos los eventos críticos se registran
- IP y User-Agent en cada acción
- Eventos inmutables (solo INSERT)

### Documentos
- Hash SHA-256 para integridad
- Nombre aleatorio UUID en almacenamiento
- Versionamiento de documentos
- Soft delete con flag `esActivo`

### Procesos
- Código único auto-generado
- Formulario flexible en JSON
- Historial completo de PDF
- Firma digital con metadatos

---

*Última actualización: Diciembre 2024*
