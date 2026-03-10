import { create } from 'zustand';
import { api } from '../api';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface OpenFile {
  id: string;
  name: string;
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  loading: boolean;
}

interface CodeStore {
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFileId: string | null;
  loadFileTree: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  reloadFile: (fileId: string) => Promise<void>;
  saveFile: (fileId: string) => Promise<void>;
}

function buildFileTree(files: string[]): FileNode[] {
  const root: FileNode[] = [];
  
  files.forEach(filePath => {
    // Normalize path separators if needed (though glob usually returns /)
    const parts = filePath.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      // Avoid empty parts from leading/trailing slashes or double slashes
      if (!part) return;

      const isFile = index === parts.length - 1;
      
      // Update current path for the node we are about to process
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      // Find if node exists in current level
      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        const newNode: FileNode = {
          name: part,
          path: currentPath,
          isDirectory: !isFile,
          children: isFile ? undefined : []
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      } else {
        // If we encounter a node that was previously marked as a file but is now being used as a directory
        // (e.g. "a" and "a/b"), convert it to a directory.
        if (!isFile) {
            if (!existingNode.isDirectory) {
               existingNode.isDirectory = true;
            }
            if (!existingNode.children) {
               existingNode.children = [];
            }
        }
      }

      if (!isFile) {
        // Safe check before descending
        if (existingNode.children) {
           currentLevel = existingNode.children;
        } else {
           // Should ideally not happen due to logic above, but safety first
           existingNode.children = [];
           currentLevel = existingNode.children;
        }
      }
    });
  });
  
  // Sort: directories first, then files
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });
    nodes.forEach(node => {
      if (node.children) sortNodes(node.children);
    });
  };
  
  sortNodes(root);
  return root;
}

export const useCodeStore = create<CodeStore>((set, get) => ({
  fileTree: [],
  openFiles: [],
  activeFileId: null,

  loadFileTree: async (path: string) => {
    console.log('[CodeStore] Loading tree for:', path);
    try {
      const response = await api.file.tree(path);
      console.log('[CodeStore] Tree response:', response.data);
      const files = response.data.files || [];
      const tree = buildFileTree(files);
      set({ fileTree: tree }); 
    } catch (error) {
      console.error('Failed to load file tree:', error);
      set({ fileTree: [] });
    }
  },

  openFile: async (path: string) => {
    const existing = get().openFiles.find(f => f.path === path);
    if (existing) {
      set({ activeFileId: existing.id });
      // Smart reload: if file is not dirty (not modified by user), reload it to get latest content
      if (existing.content === existing.originalContent && !existing.loading) {
          await get().reloadFile(existing.id);
      }
      return;
    }

    // Use path as ID to ensure uniqueness and prevent collisions (Date.now() is not safe)
    const fileId = path;
    const fileName = path.split('/').pop() || path;

    set({
      openFiles: [...get().openFiles, { 
        id: fileId, 
        name: fileName, 
        path, 
        content: '', 
        originalContent: '', 
        isDirty: false,
        loading: true 
      }],
      activeFileId: fileId
    });

    try {
      const response = await api.file.read(path);
      const files = get().openFiles.map(f =>
        f.id === fileId ? { 
            ...f, 
            content: response.data.content, 
            originalContent: response.data.content, 
            isDirty: false,
            loading: false 
        } : f
      );
      set({ openFiles: files });
    } catch (error) {
      console.error('Failed to read file:', error);
      // Don't close file on error, let user see it failed or empty
      const files = get().openFiles.map(f =>
        f.id === fileId ? { ...f, content: 'Error loading file', loading: false } : f
      );
      set({ openFiles: files });
    }
  },

  closeFile: (fileId: string) => {
    const newFiles = get().openFiles.filter(f => f.id !== fileId);
    set({ openFiles: newFiles });
    if (get().activeFileId === fileId) {
      set({ activeFileId: newFiles[0]?.id || null });
    }
  },

  setActiveFile: (fileId: string) => {
    set({ activeFileId: fileId });
  },

  updateFileContent: (fileId: string, content: string) => {
    set(state => ({
      openFiles: state.openFiles.map(f =>
        f.id === fileId ? { 
            ...f, 
            content,
            isDirty: content !== f.originalContent
        } : f
      )
    }));
  },

  reloadFile: async (fileId: string) => {
    const file = get().openFiles.find(f => f.id === fileId);
    if (!file) return;

    set(state => ({
      openFiles: state.openFiles.map(f =>
        f.id === fileId ? { ...f, loading: true } : f
      )
    }));

    try {
      const response = await api.file.read(file.path);
      set(state => ({
        openFiles: state.openFiles.map(f =>
          f.id === fileId ? { 
              ...f, 
              content: response.data.content, 
              originalContent: response.data.content,
              isDirty: false,
              loading: false 
            } : f
        )
      }));
    } catch (error) {
      console.error('Failed to reload file:', error);
      set(state => ({
        openFiles: state.openFiles.map(f =>
          f.id === fileId ? { ...f, loading: false } : f
        )
      }));
    }
  },

  saveFile: async (fileId: string) => {
    const file = get().openFiles.find(f => f.id === fileId);
    if (!file) return;

    try {
      await api.file.write(file.path, file.content);
      // Update originalContent after save
      set(state => ({
        openFiles: state.openFiles.map(f =>
            f.id === fileId ? { 
                ...f, 
                originalContent: file.content,
                isDirty: f.content !== file.content 
            } : f
        )
      }));
    } catch (error) {
      console.error('Failed to save file:', error);
      // Optional: Show error
    }
  }
}));
