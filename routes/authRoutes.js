import express from 'express';
import { uploadFile, googleAuthentication, logoutUser, verifyUser } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // Assuming you have authentication middleware

const router = express.Router();

router.get('/upload', authenticateToken, uploadFile);
router.post('/upload', authenticateToken, uploadFile);

router.post('/auth/google', googleAuthentication);
router.post('/auth/logout', logoutUser);
router.get('/auth/verify', authenticateToken, verifyUser);

export default router;
