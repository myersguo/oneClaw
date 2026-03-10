import { ReadFileTool } from './read-file';
import { WriteFileTool } from './write-file';
import { EditFileTool } from './edit-file';
import { GlobFileTool } from './glob-file';
import { GrepFileTool } from './grep-file';
import { CheckStatusTool } from './check-openclaw-status';
import { ExecShellTool } from './exec-shell';

export const allTools = [
  ReadFileTool,
  WriteFileTool,
  EditFileTool,
  GlobFileTool,
  GrepFileTool,
  CheckStatusTool,
  ExecShellTool
];
