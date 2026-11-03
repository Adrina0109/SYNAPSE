import express from 'express';
import { createTask, deleteTask, getTasks, toggleTask, updateTask } from '../controllers/taskController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id/toggle', toggleTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
