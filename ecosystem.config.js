module.exports = {
  apps: [
    {
      name: 'chavales-frontend',
      cwd: '/var/www/chavaleslegales/frontend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'chavales-backend',
      cwd: '/var/www/chavaleslegales/backend',
      script: '/var/www/chavaleslegales/backend/venv/bin/uvicorn',
      interpreter: 'none',
      args: 'main:app --host 127.0.0.1 --port 8000',
      env: {
        PYTHONPATH: '/var/www/chavaleslegales/backend'
      }
    }
  ]
};
