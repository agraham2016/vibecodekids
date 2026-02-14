/**
 * File-Based Storage Service
 * 
 * Original flat-file implementation. Used when DATABASE_URL is not set.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DATA_DIR, USERS_DIR, PROJECTS_DIR } from '../config/index.js';

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

// ========== DATA DIRECTORY SETUP ==========

export async function ensureDataDirs() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
  } catch {
    // Directories already exist
  }

  // Fix volume permissions (Railway and Docker volume mounts can have
  // ownership mismatches between deploys)
  try {
    execSync(`chmod -R 777 "${DATA_DIR}" 2>/dev/null || true`);
    console.log('🔧 Fixed data directory permissions');
  } catch {
    // chmod not available or not needed (Windows, etc.)
  }
}
