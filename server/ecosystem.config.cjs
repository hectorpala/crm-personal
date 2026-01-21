module.exports = {
  apps: [{
    name: 'crm-server',
    script: './dist/index.js',
    cwd: '/root/crm/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      WHATSAPP_DEBUG_LOG: 'true'
    }
  }]
}
