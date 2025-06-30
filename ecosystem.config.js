// 这是阿里云的PM2配置文件，用于部署到阿里云服务器上
// 执行命令：pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'listenly',
    script: './start-with-env.sh',
    cwd: '/var/www/listenly',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    min_uptime: '10s',
    max_restarts: 5,
    restart_delay: 2000
  }]
}
