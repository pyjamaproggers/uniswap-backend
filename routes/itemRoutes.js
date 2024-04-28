import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
    updateItem,
    getItems,
    deleteItem,
    createItem,
    toggleItemLive
} from '../controllers/itemController.js';

const router = express.Router();

router.patch('/items/:itemId', authenticateToken, updateItem);
router.get('/items', getItems);
router.delete('/items/:itemId', authenticateToken, deleteItem);
router.post('/items', authenticateToken, createItem);
router.patch('/items/:itemId/live', authenticateToken, toggleItemLive);

export default router;
