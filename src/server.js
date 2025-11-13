const http = require('http');
const app = require('./app');
const { port } = require('./config/env');
const { connectDB } = require('./config/db');
const { initIO } = require('./sockets');

const server = http.createServer(app);

function start() {
  initIO(server);

  connectDB()
    .then(() => {
      server.listen(port, () => {
        console.log('Server listening on', port);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

// Start immediately if run directly
if (require.main === module) {
  start();
}

module.exports = { server, start };
