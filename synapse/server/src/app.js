import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mentorRoutes from './routes/mentorRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import plannerRoutes from './routes/plannerRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
app.disable('etag');
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
}));
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
