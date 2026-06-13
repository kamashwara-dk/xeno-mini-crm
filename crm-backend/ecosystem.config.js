module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env_production: { NODE_ENV: 'production', PORT: 4000 }
  }]
};
