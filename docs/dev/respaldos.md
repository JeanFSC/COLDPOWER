# Respaldos completos de ColdPower

El respaldo operativo completo se genera con `pg_dump` en formato custom. Incluye el esquema y los datos de PostgreSQL, incluidas tablas, secuencias y tipos enum. La restauración de validación siempre usa una base local separada y compara el conteo de todas las tablas públicas.

## Crear un respaldo

El comando normal del worktree usa `.env.localdb` y el entorno `local`:

```powershell
corepack pnpm db:backup:full
```

El archivo se guarda en `C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump`. Se conservan durante 14 días los respaldos del entorno seleccionado; únicamente se eliminan archivos que coinciden con `coldpower-<entorno>-*.dump` y superan esa antigüedad.

También se puede invocar el script directamente con otra URL y entorno:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-full.ps1 `
  -DatabaseUrl $env:DATABASE_URL `
  -Environment staging
```

Antes de un respaldo remoto, confirma explícitamente el entorno y el destino. En este ticket las pruebas se ejecutan únicamente contra PostgreSQL local; no se ejecuta ningún respaldo contra Neon.

## Restaurar y comparar en local

La restauración rechaza cualquier host que no sea `localhost`, `127.0.0.1` o `::1`. No reutiliza una base existente por accidente:

```powershell
dotenv -e .env.localdb -- powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\restore-full.ps1 `
  -BackupPath C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump
```

Si `coldpower_restore_test` ya existe, el script se detiene. `-Recreate` solo debe usarse cuando esa base de prueba local sea prescindible:

```powershell
dotenv -e .env.localdb -- powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\restore-full.ps1 `
  -BackupPath C:\Users\jean_\ColdPowerBackups\coldpower-local-<fecha>.dump `
  -Recreate
```

El resultado incluye el número de tablas, los conteos de origen/restauración y `differences: []` cuando coinciden. La base `coldpower_restore_test` se conserva para inspección posterior; el script no borra el respaldo.

## Copia manual a OneDrive

La copia a nube es un paso operativo manual. Después de verificar `differences: []`, copia el `.dump` a la carpeta OneDrive corporativa de respaldos de ColdPower y conserva la misma convención de nombre. Verifica que la sincronización terminó y que el archivo puede verse desde el equipo autorizado. No subas `.env.local`, contraseñas ni archivos de configuración con credenciales.

## Programador de tareas

`ops/register-backup-task.ps1` describe una tarea diaria a las 02:00, pero **no se registra automáticamente**. Jean decide cuándo habilitarla, con qué cuenta y cómo manejar la copia a OneDrive.
