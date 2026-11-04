import express from 'express';
import {
    assignMentor,
    deleteUser,
    getMentors,
    getUsers,
    unassignMentor,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', getUsers);
router.get('/mentors', getMentors);
router.patch('/assign', assignMentor);
router.patch('/unassign', unassignMentor);
router.delete('/users/:id', deleteUser);

export default router;
