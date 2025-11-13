import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import timetableRoutes from './routes/timetable.js';

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [config.corsOrigin || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors({ origin: allowedOrigins, credentials: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/timetable', timetableRoutes);

// Simple health
app.get('/api/health', (_req,res) => res.json({ ok:true }));

mongoose.connect(config.mongoUri).then(() => {
  console.log('MongoDB connected');
  app.listen(config.port, () => console.log('Server on :' + config.port));
}).catch((e) => {
  console.error('Mongo connection error', e);
  process.exit(1);
});
