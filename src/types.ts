/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Account {
  username: string;
  passwordHash: string; // Stored locally to verify login
  securityQuestion: string;
  securityAnswerHash: string; // Hash of the lowercased security answer to verify recovery
  createdAt: number;
}

export interface Note {
  id: string;
  accountId: string;
  profileId: 'personal' | 'work'; // Isolated profile per user
  title: string;
  content: string;
  folderId?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  background?: string;
  isDeleted?: boolean;
  deletedAt?: number;
  isLocked?: boolean;
  pinHash?: string;
}

export interface Folder {
  id: string;
  accountId: string;
  profileId: 'personal' | 'work';
  name: string;
  createdAt: number;
  icon?: string;
  color?: string;
  order?: number;
}

export interface Tag {
  id: string;
  accountId: string;
  profileId: 'personal' | 'work';
  name: string;
  createdAt: number;
}

export interface BackupData {
  version: number;
  username: string;
  account?: Account;
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  exportedAt: number;
  preferences?: {
    viewMode?: 'list' | 'grid';
    sortBy?: 'updated' | 'created';
  };
}

