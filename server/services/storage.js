/**
 * Storage Service (Auto-Switch)
 * 
 * When DATABASE_URL is set, delegates to services/db.js (Postgres).
 * Otherwise, falls back to local JSON file storage.
 * 
 * Every consumer just imports from this file -- the backend doesn't
 * need to know or care which storage engine is in use.
 */

import { USE_POSTGRES } from '../config/index.js';

// Dynamic import based on environment
let backend;

if (USE_POSTGRES) {
  backend = await import('./db.js');
  console.log('💾 Storage: PostgreSQL');
} else {
  backend = await import('./fileStorage.js');
  console.log('💾 Storage: Local JSON files');
}

// Re-export everything from whichever backend was loaded
export const readUser       = backend.readUser;
export const writeUser      = backend.writeUser;
export const userExists     = backend.userExists;
export const listUsers      = backend.listUsers;
export const findUserBySubscriptionId = backend.findUserBySubscriptionId;
export const readProject    = backend.readProject;
export const writeProject   = backend.writeProject;
export const deleteProject  = backend.deleteProject;
export const listProjects   = backend.listProjects;
export const ensureDataDirs = backend.ensureDataDirs;

// ESA / ClassWallet helpers
export const createEsaOrder        = backend.createEsaOrder;
export const getEsaOrder           = backend.getEsaOrder;
export const updateEsaOrderStatus  = backend.updateEsaOrderStatus;
export const listEsaOrders         = backend.listEsaOrders;
export const addEsaWaitlist        = backend.addEsaWaitlist;
export const listEsaWaitlist       = backend.listEsaWaitlist;
export const countEsaWaitlist      = backend.countEsaWaitlist;
export const logOutOfScopeRequest  = backend.logOutOfScopeRequest;
