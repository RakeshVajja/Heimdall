import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { connectDatabase } from './db/connection.js';
import { skillEngine } from './skills/SkillEngine.js';
import { mcpManager } from './mcp/MCPManager.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { rateLimitMiddleware } from './auth/middleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import mcpRoutes from './routes/mcpRoutes.js';
import toolRoutes from './routes/toolRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import evalRoutes from './routes/evalRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimitMiddleware);

// Request Logger
app.use((req, _res, next) => {
  if (req.path !== '/api/system/health') {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/eval', evalRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/system', systemRoutes);

// Root Status
app.get('/', (_req, res) => {
  res.json({
    platform: 'Heimdall AI Agent Platform',
    version: '1.0.0',
    status: 'online',
    docs: '/api/system/health',
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : String(err),
  });
});

// Bootstrap & Listen
async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('⚡ Initializing Heimdall AI Agent Platform (TypeScript)');
  console.log('----------------------------------------------------');

  await connectDatabase();
  await skillEngine.initialize();
  await mcpManager.initialize();
  setupSocketHandlers(io);

  httpServer.listen(config.port, () => {
    console.log(`[Heimdall Server] 🚀 Running on port ${config.port} (http://localhost:${config.port})`);
    console.log(`[Heimdall Server] Real-time Socket.IO gateway active on port ${config.port}`);
  });
}

bootstrap().catch(err => {
  console.error('[Fatal Bootstrap Error]:', err);
  process.exit(1);
});

export { app, httpServer, io };
