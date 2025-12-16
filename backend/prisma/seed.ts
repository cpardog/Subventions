import { PrismaClient, Rol, TipoDocumento } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (en orden por dependencias)
  await prisma.registroDescarga.deleteMany();
  await prisma.historialPdf.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.eventoAuditoria.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.proceso.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.tokenRecuperacion.deleteMany();
  await prisma.cambioRol.deleteMany();
  await prisma.passwordHistorial.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.catalogoDocumento.deleteMany();
  await prisma.configuracion.deleteMany();
  await prisma.convocatoria.deleteMany();

  console.log('✅ Datos existentes eliminados');

  // Crear catálogo de documentos
  const catalogoDocumentos = await Promise.all([
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.CEDULA_IDENTIDAD,
        nombre: 'Cédula de Identidad',
        descripcion: 'Documento de identificación personal vigente',
        obligatorio: true,
        formatosPermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
        tamanoMaximoMb: 5,
        orden: 1,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.CONTRATO_ARRENDAMIENTO,
        nombre: 'Contrato de Arrendamiento',
        descripcion: 'Contrato de arriendo vigente firmado por ambas partes',
        obligatorio: true,
        formatosPermitidos: ['application/pdf'],
        tamanoMaximoMb: 10,
        vigenciaDias: 365,
        orden: 2,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.CERTIFICADO_RESIDENCIA,
        nombre: 'Certificado de Residencia',
        descripcion: 'Certificado que acredita domicilio actual',
        obligatorio: true,
        formatosPermitidos: ['application/pdf'],
        tamanoMaximoMb: 5,
        vigenciaDias: 90,
        orden: 3,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.RECIBO_SERVICIO,
        nombre: 'Recibo de Servicio',
        descripcion: 'Recibo de agua, luz o gas del último mes',
        obligatorio: true,
        formatosPermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
        tamanoMaximoMb: 5,
        vigenciaDias: 60,
        orden: 4,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.CERTIFICADO_INGRESOS,
        nombre: 'Certificado de Ingresos',
        descripcion: 'Documentación que acredite ingresos mensuales',
        obligatorio: true,
        formatosPermitidos: ['application/pdf'],
        tamanoMaximoMb: 5,
        vigenciaDias: 30,
        orden: 5,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.DECLARACION_JURADA,
        nombre: 'Declaración Jurada',
        descripcion: 'Declaración jurada de veracidad de información',
        obligatorio: true,
        formatosPermitidos: ['application/pdf'],
        tamanoMaximoMb: 5,
        orden: 6,
      },
    }),
    prisma.catalogoDocumento.create({
      data: {
        tipo: TipoDocumento.OTRO,
        nombre: 'Documento Adicional',
        descripcion: 'Documentos adicionales que respalden la solicitud',
        obligatorio: false,
        formatosPermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
        tamanoMaximoMb: 10,
        orden: 7,
      },
    }),
  ]);

  console.log(`✅ ${catalogoDocumentos.length} tipos de documento creados`);

  // Hash de contraseñas para usuarios de prueba
  const passwordHash = await argon2.hash('DigerAdmin123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Crear usuarios del sistema
  const usuarioDiger = await prisma.usuario.create({
    data: {
      cedula: '12345678',
      email: 'diger@sistema.local',
      nombreCompleto: 'Usuario DIGER',
      passwordHash,
      rol: Rol.DIGER,
    },
  });

  const passwordHashDirectora = await argon2.hash('DirectoraAdmin123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuarioDirectora = await prisma.usuario.create({
    data: {
      cedula: '23456789',
      email: 'directora@sistema.local',
      nombreCompleto: 'Directora del Sistema',
      passwordHash: passwordHashDirectora,
      rol: Rol.DIRECTORA,
    },
  });

  const passwordHashOrdenador = await argon2.hash('OrdenadorAdmin123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuarioOrdenador = await prisma.usuario.create({
    data: {
      cedula: '34567890',
      email: 'ordenador@sistema.local',
      nombreCompleto: 'Ordenador del Gasto',
      passwordHash: passwordHashOrdenador,
      rol: Rol.ORDENADOR_GASTO,
    },
  });

  const passwordHashCri = await argon2.hash('CriAdmin123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuarioCri = await prisma.usuario.create({
    data: {
      cedula: '45678901',
      email: 'cri@sistema.local',
      nombreCompleto: 'Usuario CRI',
      passwordHash: passwordHashCri,
      rol: Rol.CRI,
    },
  });

  // Crear beneficiario de ejemplo
  const passwordHashBeneficiario = await argon2.hash('Beneficiario123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuarioBeneficiario = await prisma.usuario.create({
    data: {
      cedula: '56789012',
      email: 'beneficiario@example.com',
      nombreCompleto: 'Juan Pérez García',
      passwordHash: passwordHashBeneficiario,
      rol: Rol.BENEFICIARIO,
      creadoPorId: usuarioDiger.id,
    },
  });

  // Crear arrendador de ejemplo
  const passwordHashArrendador = await argon2.hash('Arrendador123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const usuarioArrendador = await prisma.usuario.create({
    data: {
      cedula: '67890123',
      email: 'arrendador@example.com',
      nombreCompleto: 'María López Rodríguez',
      passwordHash: passwordHashArrendador,
      rol: Rol.ARRENDADOR,
      creadoPorId: usuarioDiger.id,
    },
  });

  console.log('✅ 6 usuarios creados');

  // Crear configuración del sistema
  await prisma.configuracion.createMany({
    data: [
      {
        clave: 'PASSWORD_MIN_LENGTH',
        valor: '10',
        descripcion: 'Longitud mínima de contraseña',
      },
      {
        clave: 'PASSWORD_HISTORY_COUNT',
        valor: '5',
        descripcion: 'Cantidad de contraseñas anteriores a verificar',
      },
      {
        clave: 'ACCOUNT_LOCKOUT_ATTEMPTS',
        valor: '5',
        descripcion: 'Intentos fallidos antes de bloqueo',
      },
      {
        clave: 'ACCOUNT_LOCKOUT_DURATION_MINUTES',
        valor: '30',
        descripcion: 'Duración del bloqueo en minutos',
      },
      {
        clave: 'SESSION_TIMEOUT_MINUTES',
        valor: '60',
        descripcion: 'Tiempo de inactividad para expirar sesión',
      },
      {
        clave: 'MFA_REQUIRED_ROLES',
        valor: 'DIRECTORA,ORDENADOR_GASTO,CRI,DIGER',
        descripcion: 'Roles que requieren MFA',
      },
    ],
  });

  console.log('✅ Configuración del sistema creada');

  // Crear convocatoria de ejemplo
  const convocatoria = await prisma.convocatoria.create({
    data: {
      nombre: 'Subvención Arriendo 2024',
      descripcion: 'Programa de apoyo al pago de arriendo para familias vulnerables',
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-12-31'),
      activa: true,
      formularioJson: {
        version: '1.0',
        campos: [
          { nombre: 'montoSolicitado', tipo: 'number', obligatorio: true, min: 0, max: 500000 },
          { nombre: 'montoArriendo', tipo: 'number', obligatorio: true, min: 0 },
          { nombre: 'ingresoFamiliar', tipo: 'number', obligatorio: true, min: 0 },
          { nombre: 'cantidadIntegrantes', tipo: 'number', obligatorio: true, min: 1, max: 20 },
          { nombre: 'direccionPropiedad', tipo: 'text', obligatorio: true, maxLength: 500 },
          { nombre: 'comunaPropiedad', tipo: 'text', obligatorio: true },
          { nombre: 'motivoSolicitud', tipo: 'textarea', obligatorio: true, maxLength: 2000 },
        ],
      },
    },
  });

  console.log('✅ Convocatoria de ejemplo creada');

  // Crear proceso de ejemplo en borrador
  const procesoEjemplo = await prisma.proceso.create({
    data: {
      codigo: 'SUB-2024-000001',
      beneficiarioId: usuarioBeneficiario.id,
      arrendadorId: usuarioArrendador.id,
      formulario: {
        montoSolicitado: 150000,
        montoArriendo: 250000,
        ingresoFamiliar: 400000,
        cantidadIntegrantes: 4,
        direccionPropiedad: 'Av. Principal 123, Depto 45',
        comunaPropiedad: 'Santiago Centro',
        motivoSolicitud: 'Solicito apoyo para el pago de arriendo debido a reducción de ingresos familiares.',
      },
    },
  });

  // Crear evento de auditoría inicial
  await prisma.eventoAuditoria.create({
    data: {
      procesoId: procesoEjemplo.id,
      usuarioId: usuarioDiger.id,
      tipo: 'CREACION',
      descripcion: 'Proceso de subvención creado',
      detalles: { codigo: procesoEjemplo.codigo },
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
  });

  console.log('✅ Proceso de ejemplo creado');

  console.log('\n🎉 Seed completado exitosamente!\n');
  console.log('Usuarios creados:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Rol              | Email                      | Contraseña          |');
  console.log('|------------------|----------------------------|---------------------|');
  console.log('| DIGER            | diger@sistema.local        | DigerAdmin123!      |');
  console.log('| DIRECTORA        | directora@sistema.local    | DirectoraAdmin123!  |');
  console.log('| ORDENADOR_GASTO  | ordenador@sistema.local    | OrdenadorAdmin123!  |');
  console.log('| CRI              | cri@sistema.local          | CriAdmin123!        |');
  console.log('| BENEFICIARIO     | beneficiario@example.com   | Beneficiario123!    |');
  console.log('| ARRENDADOR       | arrendador@example.com     | Arrendador123!      |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
