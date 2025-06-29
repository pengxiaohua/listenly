module.exports = {
  apps: [{
    name: 'listenly',
    script: 'pnpm',
    args: 'start',
    cwd: process.cwd(),  // 自动使用当前项目目录
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',    // 错误日志路径
    out_file: './logs/out.log',      // 输出日志路径
    log_file: './logs/combined.log', // 组合日志路径
    time: true
  }]
}
