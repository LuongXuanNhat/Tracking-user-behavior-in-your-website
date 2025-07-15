// app.js
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
// Static files (nếu cần)
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'public')));

// Routes
import userRoutes from './app/routes/user';
app.use('/api/users', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('API is working!');
});

export default app;
