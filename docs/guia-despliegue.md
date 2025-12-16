# Guía de Despliegue

## Sistema de Gestión de Subvenciones

---

## Requisitos

### Hardware Mínimo (Producción)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disco**: 100 GB SSD

### Software
- Docker 24.0+ y Docker Compose 2.20+
- Node.js 20 LTS (para despliegue manual)
- PostgreSQL 15+
- Redis 7+

---

## Despliegue con Docker (Recomendado)

### 1. Clonar y configurar

```bash
git clone https://github.com/organizacion/subvenciones.git
cd subvenciones
cp .env.example .env
```

### 2. Editar `.env` con valores de producción

```env
DATABASE_URL=postgresql://subvenciones:PASSWORD@postgres:5432/subvenciones
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
STORAGE_PATH=/data/documentos
NODE_ENV=production
```

### 3. Construir y levantar

```bash
docker-compose -f docker-compose.yml build
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

### 4. Verificar

```bash
docker-compose ps
curl http://localhost:4000/api/health
```

---

## Despliegue Manual

### Backend

```bash
cd backend
npm ci --production
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start dist/index.js --name subvenciones-api -i max
```

### Frontend

```bash
cd frontend
npm ci
npm run build
# Servir dist/ con Nginx
```

---

## Configuración Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name subvenciones.ejemplo.com;

    ssl_certificate /etc/ssl/certs/cert.crt;
    ssl_certificate_key /etc/ssl/private/cert.key;

    root /var/www/subvenciones/frontend/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL PostgreSQL | Sí |
| `REDIS_URL` | URL Redis | Sí |
| `JWT_SECRET` | Clave JWT (64+ chars) | Sí |
| `JWT_REFRESH_SECRET` | Clave refresh (64+ chars) | Sí |
| `STORAGE_PATH` | Ruta documentos | Sí |
| `PORT` | Puerto backend | No (4000) |
| `NODE_ENV` | Entorno | No |

---

## Backup

```bash
# Base de datos
pg_dump -U subvenciones subvenciones | gzip > backup_$(date +%Y%m%d).sql.gz

# Documentos
tar -czf docs_$(date +%Y%m%d).tar.gz /data/documentos
```

---

## Troubleshooting

### Backend no inicia
```bash
docker-compose logs backend
# Verificar DATABASE_URL y conexión a PostgreSQL
```

### Error de conexión DB
```bash
docker-compose exec backend pg_isready -h postgres
```

### Documentos no se suben
```bash
ls -la /data/documentos
chmod -R 755 /data/documentos
```

---

## Actualizaciones

```bash
# 1. Backup
pg_dump -U subvenciones subvenciones > backup.sql

# 2. Actualizar
git pull origin main
docker-compose build
docker-compose exec backend npx prisma migrate deploy
docker-compose up -d
```
