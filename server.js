// server.js
const app = require('./backend/app');
const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
