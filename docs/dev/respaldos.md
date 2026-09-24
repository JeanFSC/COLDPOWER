# Respaldos completos de ColdPower

El respaldo completo se genera manualmente con `pg_dump` en formato custom. Incluye el esquema y los datos de PostgreSQL, incluidas tablas, secuencias y tipos enum. La restauración de validación usa una base local separada y compara el conteo de todas las tablas públicas.

## Regla operativa

Los respaldos son **manuales** y solo se ejecutan cuando Jean los solicita. El script no registra tareas, no se ejecuta en segundo plano y no borra respaldos antiguos: no existe limpieza automática por 14 días ni otra retención implícita. La conservación, copia externa y eliminación son decisiones operativas explícitas.

## Crear un respaldo local

El comando normal usa `.env.localdb`, PostgreSQL 18 y el puerto `5433`:

```powershell
corepack pnpm db:backup:full
```

El archivo se guarda en `C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump`. El script usa los binarios de `C:\PostgreSQL\18\bin` y deja intactos los respaldos existentes.

También se puede invocar directamente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-full.ps1 `
  -DatabaseUrl $env:DATABASE_URL `
  -Environment local `
  -Port 5433
```

En este ticket la URL debe salir de `.env.localdb` y apuntar a `127.0.0.1:5433`. No ejecutar respaldos contra Neon ni contra otro entorno remoto.

## Restaurar y comparar en local

La restauración rechaza cualquier host que no sea `localhost`, `127.0.0.1` o `::1`, fuerza el puerto `5433` y no reutiliza una base existente por accidente:

```powershell
dotenv -e .env.localdb -- powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\restore-full.ps1 `
  -BackupPath C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump `
  -Port 5433
```

Si `coldpower_restore_test` ya existe, el script se detiene. `-Recreate` solo debe usarse cuando esa base de prueba local sea prescindible:

```powershell
dotenv -e .env.localdb -- powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\restore-full.ps1 `
  -BackupPath C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump `
  -Port 5433 `
  -Recreate
```

El resultado incluye el número de tablas, los conteos de origen/restauración y `differences: []` cuando coinciden. La base `coldpower_restore_test` se conserva para inspección posterior; el script no borra el respaldo.

## Copia manual a OneDrive

La copia a nube es un paso operativo manual. Después de verificar `differences: []`, copia el `.dump` a la carpeta OneDrive corporativa de respaldos de ColdPower y conserva la misma convención de nombre. Verifica que la sincronización terminó y que el archivo puede verse desde el equipo autorizado. No subas `.env.local`, `.env.localdb`, contraseñas ni archivos de configuración con credenciales.

## Programador de tareas

No se registra ninguna tarea programada. `ops/register-backup-task.ps1` es una herramienta explícita heredada y no debe ejecutarse para este flujo manual; su existencia no implica que haya una tarea activa.
