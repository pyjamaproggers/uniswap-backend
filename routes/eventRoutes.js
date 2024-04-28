import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
    createEvent,
    updateEventNotifications,
    getEvents
} from '../controllers/eventController.js';

const router = express.Router();

router.post('/events', authenticateToken, createEvent);
router.patch('/events/:eventId/notifications', authenticateToken, updateEventNotifications);
router.get('/events', getEvents);

export default router;
