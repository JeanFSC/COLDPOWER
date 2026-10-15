const apps = [
    {
      name: "coldpower",
      cwd: "/var/www/coldpower/current",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      out_file: "/var/log/coldpower/out.log",
      error_file: "/var/log/coldpower/error.log",
      merge_logs: true,
    },
  ];

// Scheduled reports, notifications, order expiry and reservation expiry use
// protected cron routes. Production injects CRON_SECRET before PM2 reloads apps.
if (process.env.CRON_SECRET?.trim()) {
  apps.push({
    name: "coldpower-scheduler",
    cwd: "/var/www/coldpower/current",
    script: "ops/cron-worker.mjs",
    interpreter: "node",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "128M",
    time: true,
    out_file: "/var/log/coldpower/scheduler.out.log",
    error_file: "/var/log/coldpower/scheduler.error.log",
    merge_logs: true,
    env: {
      NODE_ENV: "production",
      CRON_SECRET: process.env.CRON_SECRET.trim(),
      COLDPOWER_INTERNAL_BASE_URL: "http://127.0.0.1:3000",
      COLDPOWER_CRON_INTERVAL_MS: "300000",
    },
  });
} else {
  console.warn("ColdPower: CRON_SECRET no está configurado; los procesos programados no se iniciarán.");
}

module.exports = { apps };
