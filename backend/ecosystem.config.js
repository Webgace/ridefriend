// Ficheiro: backend/ecosystem.config.js | Função: configuração PM2 da API em produção (P9)
module.exports = {
  apps: [
    {
      name: 'ridefriend-api',
      script: 'dist/app.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        APP_VERSION: '0.1.0',
        // As restantes variáveis (SUPABASE_*, AT_*, CORS_ORIGINS) ficam no /etc/ridefriend.env
        // e são carregadas via `pm2 start ecosystem.config.js --env production --update-env`
        // depois de fazer `set -a && source /etc/ridefriend.env && set +a`.
      },
      out_file: '/var/log/ridefriend/out.log',
      error_file: '/var/log/ridefriend/err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
