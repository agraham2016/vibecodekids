/**
 * File-Based Storage Service
 * 
 * Original flat-file implementation. Used when DATABASE_URL is not set.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { USERS_DIR, PROJECTS_DIR } from '../config/index.js';

// ========== USER OPERATIONS ==========

export async function readUser(userId) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function writeUser(userId, userData) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
}

export async function userExists(userId) {
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listUsers() {
  const files = await fs.readdir(USERS_DIR);
  const users = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
      users.push(JSON.parse(data));
    } catch {
      // Skip invalid files
    }
  }
  return users;
}

export async function findUserBySubscriptionId(subscriptionId) {
  const users = await listUsers();
  return users.find(u => u.stripeSubscriptionId === subscriptionId) || null;
}

// ========== PROJECT OPERATIONS ==========

export async function readProject(projectId) {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function writeProject(projectId, projectData) {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  await fs.writeFile(filePath, JSON.stringify(projectData, null, 2));
}

export async function deleteProject(projectId) {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  await fs.unlink(filePath);
}

export async function listProjects() {
  const files = await fs.readdir(PROJECTS_DIR);
  const projects = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8');
      projects.push(JSON.parse(data));
    } catch {
      // Skip invalid files
    }
  }
  return projects;
}

// ========== ESA ORDER OPERATIONS (file-based) ==========

const ESA_ORDERS_FILE = path.join(path.dirname(USERS_DIR), 'esa_orders.json');
const ESA_WAITLIST_FILE = path.join(path.dirname(USERS_DIR), 'esa_waitlist.json');

async function readJsonFile(filePath, fallback = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch { return fallback; }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function createEsaOrder({ orderRef, userId, tier, billingPeriod, amountCents }) {
  const orders = await readJsonFile(ESA_ORDERS_FILE);
  orders.push({
    order_ref: orderRef, user_id: userId, tier, billing_period: billingPeriod,
    amount_cents: amountCents, status: 'pending', classwallet_txn: null,
    created_at: new Date().toISOString(), confirmed_at: null, paid_at: null,
  });
  await writeJsonFile(ESA_ORDERS_FILE, orders);
}

export async function getEsaOrder(orderRef) {
  const orders = await readJsonFile(ESA_ORDERS_FILE);
  return orders.find(o => o.order_ref === orderRef) || null;
}

export async function updateEsaOrderStatus(orderRef, status, extra = {}) {
  const orders = await readJsonFile(ESA_ORDERS_FILE);
  const order = orders.find(o => o.order_ref === orderRef);
  if (!order) return;
  order.status = status;
  if (status === 'confirmed') order.confirmed_at = new Date().toISOString();
  if (status === 'paid') order.paid_at = new Date().toISOString();
  if (extra.classwalletTxn) order.classwallet_txn = extra.classwalletTxn;
  await writeJsonFile(ESA_ORDERS_FILE, orders);
}

export async function listEsaOrders(statusFilter) {
  const orders = await readJsonFile(ESA_ORDERS_FILE);
  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function addEsaWaitlist(email) {
  const list = await readJsonFile(ESA_WAITLIST_FILE);
  if (list.some(e => e.email === email)) return;
  list.push({ email, created_at: new Date().toISOString() });
  await writeJsonFile(ESA_WAITLIST_FILE, list);
}

export async function listEsaWaitlist() {
  const list = await readJsonFile(ESA_WAITLIST_FILE);
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function countEsaWaitlist() {
  const list = await readJsonFile(ESA_WAITLIST_FILE);
  return list.length;
}

// ========== DATA DIRECTORY SETUP ==========

export async function ensureDataDirs() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
  } catch {
    // Directories already exist
  }
}
