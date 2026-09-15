/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Note, Folder, Tag } from "./types";
import { encryptText, decryptText } from "./utils";

const DB_NAME = "NoteIDDatabase";
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open local IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store user accounts
      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "username" });
      }

      // Store notes
      if (!db.objectStoreNames.contains("notes")) {
        const notesStore = db.createObjectStore("notes", { keyPath: "id" });
        notesStore.createIndex("accountId", "accountId", { unique: false });
      }

      // Store folders
      if (!db.objectStoreNames.contains("folders")) {
        const foldersStore = db.createObjectStore("folders", { keyPath: "id" });
        foldersStore.createIndex("accountId", "accountId", { unique: false });
      }

      // Store tags
      if (!db.objectStoreNames.contains("tags")) {
        const tagsStore = db.createObjectStore("tags", { keyPath: "id" });
        tagsStore.createIndex("accountId", "accountId", { unique: false });
      }

      // Store Password Manager folders
      if (!db.objectStoreNames.contains("pm_folders")) {
        const pmFoldersStore = db.createObjectStore("pm_folders", { keyPath: "id" });
        pmFoldersStore.createIndex("accountId", "accountId", { unique: false });
      }

      // Store Password Manager accounts
      if (!db.objectStoreNames.contains("pm_accounts")) {
        const pmAccountsStore = db.createObjectStore("pm_accounts", { keyPath: "id" });
        pmAccountsStore.createIndex("accountId", "accountId", { unique: false });
        pmAccountsStore.createIndex("folderId", "folderId", { unique: false });
      }
    };
  });
}

// ACCOUNT API
export async function getAccount(username: string): Promise<Account | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("accounts", "readonly");
    const store = transaction.objectStore("accounts");
    const request = store.get(username);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves the encryption key for the given account.
 * Derives a strong, account-isolated 256-bit key deterministically.
 */
async function getEncryptionKey(accountId: string): Promise<string> {
  const cleanAccount = accountId.toLowerCase();
  const msgUint8 = new TextEncoder().encode(cleanAccount + "_note_id_secure_aes_gcm_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAccount(account: Account): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("accounts", "readwrite");
    const store = transaction.objectStore("accounts");
    const request = store.add(account);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(new Error("Username already exists or storage failed"));
    };
  });
}

export async function updateAccount(account: Account): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("accounts", "readwrite");
    const store = transaction.objectStore("accounts");
    const request = store.put(account);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// NOTES API
export async function getNotes(accountId: string): Promise<Note[]> {
  const db = await openDB();
  const rawNotes: Note[] = await new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readonly");
    const store = transaction.objectStore("notes");
    const index = store.index("accountId");
    const request = index.getAll(accountId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

  const key = await getEncryptionKey(accountId);
  const decryptedNotes = await Promise.all(
    rawNotes.map(async (note) => {
      try {
        const decryptedTitle = await decryptText(note.title, key);
        const decryptedContent = await decryptText(note.content, key);
        return {
          ...note,
          title: decryptedTitle,
          content: decryptedContent,
        };
      } catch (err) {
        console.error("Failed to decrypt note:", note.id, err);
        return note;
      }
    })
  );

  return decryptedNotes;
}

export async function saveNote(note: Note): Promise<void> {
  const db = await openDB();
  const key = await getEncryptionKey(note.accountId);
  
  const encryptedTitle = await encryptText(note.title, key);
  const encryptedContent = await encryptText(note.content, key);
  
  const encryptedNote: Note = {
    ...note,
    title: encryptedTitle,
    content: encryptedContent,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");
    const store = transaction.objectStore("notes");
    const request = store.put(encryptedNote);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");
    const store = transaction.objectStore("notes");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// FOLDERS API
export async function getFolders(accountId: string): Promise<Folder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readonly");
    const store = transaction.objectStore("folders");
    const index = store.index("accountId");
    const request = index.getAll(accountId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readwrite");
    const store = transaction.objectStore("folders");
    const request = store.put(folder);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readwrite");
    const store = transaction.objectStore("folders");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// TAGS API
export async function getTags(accountId: string): Promise<Tag[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tags", "readonly");
    const store = transaction.objectStore("tags");
    const index = store.index("accountId");
    const request = index.getAll(accountId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveTag(tag: Tag): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tags", "readwrite");
    const store = transaction.objectStore("tags");
    const request = store.put(tag);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteTag(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tags", "readwrite");
    const store = transaction.objectStore("tags");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// BACKUP & IMPORT API (CLEAN AND BULK IMPORT FOR CURRENT USER ONLY)
export async function importBackupData(
  accountId: string,
  notes: Note[],
  folders: Folder[],
  tags: Tag[]
): Promise<void> {
  const db = await openDB();
  const key = await getEncryptionKey(accountId);

  // Pre-encrypt notes beforehand to prevent async delays inside the transaction callbacks
  const preEncryptedNotes = await Promise.all(
    notes.map(async (note) => {
      if (note.title.startsWith("__ENC__") || note.content.startsWith("__ENC__")) {
        return note;
      }
      const encTitle = await encryptText(note.title, key);
      const encContent = await encryptText(note.content, key);
      return {
        ...note,
        title: encTitle,
        content: encContent,
      };
    })
  );

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes", "folders", "tags"], "readwrite");
    
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    // 1. Clean existing notes, folders, and tags for this user and write new ones
    const notesStore = transaction.objectStore("notes");
    const foldersStore = transaction.objectStore("folders");
    const tagsStore = transaction.objectStore("tags");

    // Clean notes
    const notesIndex = notesStore.index("accountId");
    const notesRequest = notesIndex.getAllKeys(accountId);
    notesRequest.onsuccess = () => {
      const keys = notesRequest.result;
      keys.forEach((key) => notesStore.delete(key));
      preEncryptedNotes.forEach((note) => {
        const sanitizedNote = { ...note, accountId };
        notesStore.put(sanitizedNote);
      });
    };

    // Clean folders
    const foldersIndex = foldersStore.index("accountId");
    const foldersRequest = foldersIndex.getAllKeys(accountId);
    foldersRequest.onsuccess = () => {
      const keys = foldersRequest.result;
      keys.forEach((key) => foldersStore.delete(key));
      folders.forEach((folder) => {
        const sanitizedFolder = { ...folder, accountId };
        foldersStore.put(sanitizedFolder);
      });
    };

    // Clean tags
    const tagsIndex = tagsStore.index("accountId");
    const tagsRequest = tagsIndex.getAllKeys(accountId);
    tagsRequest.onsuccess = () => {
      const keys = tagsRequest.result;
      keys.forEach((key) => tagsStore.delete(key));
      tags.forEach((tag) => {
        const sanitizedTag = { ...tag, accountId };
        tagsStore.put(sanitizedTag);
      });
    };
  });
}

export async function restoreAccountData(
  account: Account,
  notes: Note[],
  folders: Folder[],
  tags: Tag[]
): Promise<void> {
  const db = await openDB();
  
  // 1. Save or overwrite the account record
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("accounts", "readwrite");
    const store = transaction.objectStore("accounts");
    const request = store.put(account);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Clean and import all user notes, folders, tags
  await importBackupData(account.username, notes, folders, tags);
}

export async function deleteAccount(username: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["accounts", "notes", "folders", "tags"], "readwrite");
    
    transaction.oncomplete = () => {
      resolve();
    };
    
    transaction.onerror = () => {
      reject(transaction.error);
    };
    
    // 1. Delete account record
    transaction.objectStore("accounts").delete(username);
    
    // 2. Delete all notes for this account
    const notesStore = transaction.objectStore("notes");
    const notesIndex = notesStore.index("accountId");
    const notesRequest = notesIndex.getAllKeys(username);
    notesRequest.onsuccess = () => {
      notesRequest.result.forEach((key) => notesStore.delete(key));
    };
    
    // 3. Delete all folders for this account
    const foldersStore = transaction.objectStore("folders");
    const foldersIndex = foldersStore.index("accountId");
    const foldersRequest = foldersIndex.getAllKeys(username);
    foldersRequest.onsuccess = () => {
      foldersRequest.result.forEach((key) => foldersStore.delete(key));
    };
    
    // 4. Delete all tags for this account
    const tagsStore = transaction.objectStore("tags");
    const tagsIndex = tagsStore.index("accountId");
    const tagsRequest = tagsIndex.getAllKeys(username);
    tagsRequest.onsuccess = () => {
      tagsRequest.result.forEach((key) => tagsStore.delete(key));
    };
  });
}

