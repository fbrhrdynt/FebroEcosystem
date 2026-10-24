module.exports = {
  apps: [{
    name: 'febro-arcade-api',
    script: '/opt/play/services/leaderboard/server.mjs',
    cwd: '/opt/play/services/leaderboard',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    max_memory_restart: '160M',
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '3488',
      PUBLIC_ORIGIN: 'https://play.febro.id',
      DATA_DIR: '/opt/play/storage/leaderboard'
    }
  }]
};
