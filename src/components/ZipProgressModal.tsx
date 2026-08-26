import React from 'react';
import { ProgressModal } from './ProgressModal';

export interface ZipProgressModalProps {
  isOpen: boolean;
  mode: 'compressing' | 'extracting' | 'uploading';
  progressPercent: number;
  currentFileName: string;
  processedCount?: number;
  totalCount?: number;
}

export const ZipProgressModal: React.FC<ZipProgressModalProps> = (props) => {
  return <ProgressModal {...props} />;
};
