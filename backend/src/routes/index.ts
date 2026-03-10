import { Router } from 'express';
import environmentRoutes from './environment';
import openclawRoutes from './openclaw';
import agentRoutes from './agent';
import fileRoutes from './file';

const router = Router();

router.use('/environment', environmentRoutes);
router.use('/openclaw', openclawRoutes);
router.use('/agent', agentRoutes);
router.use('/file', fileRoutes);

export default router;
