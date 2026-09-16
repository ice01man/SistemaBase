import express from 'express';
import { getConfig, updateConfig } from '../controllers/configController.js';
// import { tuMiddlewareAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getConfig);                        // público
router.patch('/', /* tuMiddlewareAdmin, */ updateConfig);  // ⚠️ ver nota

export default router;