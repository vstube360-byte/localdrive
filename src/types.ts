export type FileCategory = 
  | 'all'
  | 'documents'
  | 'images'
  | 'audio'
  | 'video'
  | 'code'
  | 'archives'
  | 'other';

export type ColorTag = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null;

export interface VFile {
  id: string;
  name: string;
  mimeType: string;
  size: number; // size in bytes
  blob?: Blob; // stored in IndexedDB
  textContent?: string; // cached text content for text/code files
  createdAt: number;
  updatedAt: number;
  favorite?: boolean;
  trashed?: boolean;
  trashedAt?: number;
  tags?: string[];
  colorTag?: ColorTag;
  description?: string;
  notes?: string;
  hash?: string; // SHA-256 hash
  exif?: {
    width?: number;
    height?: number;
    camera?: string;
    dateTaken?: string;
    [key: string]: any;
  };
  // Optional parentId kept as null for backwards compatibility
  parentId?: string | null;
  type?: 'file' | 'folder';
  folderColor?: string;
}

export type ViewMode = 'grid' | 'list' | 'compact';

export type SortField = 'name' | 'size' | 'updatedAt' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

export interface StorageStats {
  usage: number; // bytes used
  quota: number; // estimated quota
  fileCount: number;
  categoryBreakdown: Record<FileCategory, number>;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetItem: VFile | null;
  selectedItems: VFile[];
}

export interface ClipboardState {
  items: VFile[];
  action: 'copy' | 'cut';
}
