import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
    updateUserToken,
    getUserItems,
    checkLoginStatus,
    manageUserFavorites,
    getUserFavorites,
    registerOrUpdateUser,
    updatePhoneNumber,
    hasFcmToken
} from '../controllers/userController.js';

const router = express.Router();

router.post('/user/token', authenticateToken, updateUserToken);
router.get('/user/items', authenticateToken, getUserItems);
router.get('/user/checkLogin', authenticateToken, checkLoginStatus);
router.post('/user/favorites', authenticateToken, manageUserFavorites);
router.get('/user/favorites', authenticateToken, getUserFavorites);
router.post('/user/registerOrUpdate', registerOrUpdateUser);
router.patch('/user/updatePhoneNumber', authenticateToken, updatePhoneNumber);
router.get('/user/hasFcmToken', authenticateToken, hasFcmToken);

export default router;
