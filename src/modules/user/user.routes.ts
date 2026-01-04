import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getStats,
  createUser,
  createUserWithProfile,
  updateUser,
  deleteUser,
} from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: No autorizado
 */
router.get('/', authMiddleware, getAllUsers);

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     summary: Obtener estadísticas de usuarios
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: No autorizado
 */
router.get('/stats', authMiddleware, getStats);

/**
 * @swagger
 * /api/user/id/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: ID inválido o faltante
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/id/:id', authMiddleware, getUserById);

/**
 * @swagger
 * /api/user/email/{email}:
 *   get:
 *     summary: Obtener usuario por email
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Email inválido o faltante
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/email/:email', authMiddleware, getUserByEmail);

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - email
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Datos inválidos o faltantes
 *       401:
 *         description: No autorizado
 *       409:
 *         description: Usuario ya existe
 */
router.post('/', authMiddleware, createUser);

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registrar nuevo usuario con perfil
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     profile:
 *                       type: object
 *       400:
 *         description: Datos inválidos o faltantes
 *       409:
 *         description: Usuario ya existe
 */
router.post('/register', createUserWithProfile);

/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Actualizar usuario (PUT)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Email ya en uso
 */
router.put('/:id', authMiddleware, updateUser);

/**
 * @swagger
 * /api/user/{id}:
 *   patch:
 *     summary: Actualizar usuario (PATCH)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Email ya en uso
 */
router.patch('/:id', authMiddleware, updateUser);

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Eliminar usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *     responses:
 *       204:
 *         description: Usuario eliminado exitosamente
 *       400:
 *         description: ID inválido o faltante
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', authMiddleware, deleteUser);

export default router;
