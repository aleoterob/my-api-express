import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import userRoutes from './modules/user/user.routes';
import authRoutes from './modules/auth/auth.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { swaggerSpec } from './config/swagger';

const app = express();

const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);

app.use(errorMiddleware);

export default app;
