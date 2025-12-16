require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Creando usuarios de prueba...');

  const users = [
    { cedula: '12345678', email: 'diger@sistema.local', nombre: 'Usuario DIGER', password: 'DigerAdmin123!', rol: 'DIGER' },
    { cedula: '23456789', email: 'directora@sistema.local', nombre: 'Directora del Sistema', password: 'DirectoraAdmin123!', rol: 'DIRECTORA' },
    { cedula: '34567890', email: 'ordenador@sistema.local', nombre: 'Ordenador del Gasto', password: 'OrdenadorAdmin123!', rol: 'ORDENADOR_GASTO' },
    { cedula: '45678901', email: 'cri@sistema.local', nombre: 'Usuario CRI', password: 'CriAdmin123!', rol: 'CRI' },
    { cedula: '56789012', email: 'beneficiario@example.com', nombre: 'Juan Pérez García', password: 'Beneficiario123!', rol: 'BENEFICIARIO' },
  ];

  for (const user of users) {
    const hash = await argon2.hash(user.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.usuario.upsert({
      where: { email: user.email },
      update: {},
      create: {
        cedula: user.cedula,
        email: user.email,
        nombreCompleto: user.nombre,
        passwordHash: hash,
        rol: user.rol,
      },
    });
    console.log(`✅ Usuario ${user.rol} creado: ${user.email}`);
  }

  console.log('🎉 Seed completado!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
