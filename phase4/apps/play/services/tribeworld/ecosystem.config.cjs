module.exports = {
  apps: [{
    name: 'tribeworld-save',
    script: '/opt/play/services/tribeworld/server.mjs',
    cwd: '/opt/play/services/tribeworld',
    interpreter: 'node',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    max_memory_restart: '180M',
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: 3491,
      PUBLIC_ORIGIN: 'https://play.febro.id',
      DATA_DIR: '/opt/play/storage/tribeworld'
    }
  }]
};
