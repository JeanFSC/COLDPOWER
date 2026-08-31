module.exports = {
  apps: [
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
  ],
};
