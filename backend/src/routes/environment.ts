import { Router } from 'express';
import { executeCommand } from '../utils/process-utils';

const router = Router();

router.get('/check', async (req, res) => {
  const nodeVersion = process.version;
  
  // Debug: log PATH and which openclaw
  console.log('[Environment Check] PATH:', process.env.PATH);
  const { stdout: whichOutput, exitCode: whichExitCode } = await executeCommand('which openclaw');
  console.log('[Environment Check] which openclaw:', whichOutput.trim(), 'exitCode:', whichExitCode);
  
  const { exitCode, stdout: openclawVersion } = await executeCommand('openclaw --version');
  console.log('[Environment Check] openclaw --version exitCode:', exitCode, 'stdout:', openclawVersion.trim());
  
  res.json({
    nodeVersion,
    openClawInstalled: exitCode === 0,
    openClawVersion: exitCode === 0 ? openclawVersion.trim() : null
  });
});

export default router;
