import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import router from './routes.js';
import './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API routes
app.use('/api', router);

// Static frontend
const publicDir = path.resolve('.');
app.use(express.static(publicDir));

// Fallback to index.html for root
app.get('/', (req, res) => {
	res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});