// server.js
import app from './backend/app';
import { createServer } from 'http';

const PORT = 3001;

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
