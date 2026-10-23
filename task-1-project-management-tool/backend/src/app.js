'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const { router: userRoutes, adminRouter } = require('./modules/users/users.routes');
const projectRoutes = require('./modules/projects/projects.routes');
const { projectTasksRouter, taskRouter } = require('./modules/tasks/tasks.routes');
const commentRoutes = require('./modules/comments/comments.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IP behind a reverse proxy (used by the log-in limiter)
app.use(helmet());
// NFR-SEC-07: only the application's own front-end origin(s) may call the API from a browser.
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/projects/:projectId/tasks', projectTasksRouter);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);
app.use('/api/tasks', taskRouter);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
