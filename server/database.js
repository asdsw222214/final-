import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Helper function to run query that doesn't return rows (INSERT, UPDATE, DELETE)
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper function to query rows (SELECT)
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper function to query a single row (SELECT LIMIT 1)
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// 避免容易混淆的字元（0/O、1/l/I）
const ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';
const generateShortId = (length) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return result;
};

const DEFAULT_PERIODS = [
  { id: '1', name: '第 1 節', startTime: '08:10', endTime: '09:00' },
  { id: '2', name: '第 2 節', startTime: '09:10', endTime: '10:00' },
  { id: '3', name: '第 3 節', startTime: '10:10', endTime: '11:00' },
  { id: '4', name: '第 4 節', startTime: '11:10', endTime: '12:00' },
  { id: '5', name: '第 5 節', startTime: '12:10', endTime: '13:00' },
  { id: '6', name: '第 6 節', startTime: '13:10', endTime: '14:00' },
  { id: '7', name: '第 7 節', startTime: '14:10', endTime: '15:00' },
  { id: '8', name: '第 8 節', startTime: '15:10', endTime: '16:00' },
  { id: '9', name: '第 9 節', startTime: '16:10', endTime: '17:00' },
  { id: '10', name: '第 10 節', startTime: '17:10', endTime: '18:00' },
  { id: '11', name: '第 11 節', startTime: '18:30', endTime: '19:20' },
  { id: '12', name: '第 12 節', startTime: '19:25', endTime: '20:15' },
  { id: '13', name: '第 13 節', startTime: '20:25', endTime: '21:15' },
  { id: '14', name: '第 14 節', startTime: '21:20', endTime: '22:10' }
];

export const initDb = async () => {
  // Enable foreign keys
  await dbRun('PRAGMA foreign_keys = ON');

  // Groups table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      exclude_weekends INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Periods table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS periods (
      id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      PRIMARY KEY (group_id, id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);

  // Members table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);

  // Busy slots table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS busy_slots (
      member_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period_id TEXT NOT NULL,
      reason TEXT,
      PRIMARY KEY (member_id, day, period_id),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);
};

export const createGroup = async (name) => {
  const groupId = generateShortId(7);
  await dbRun(
    'INSERT INTO groups (id, name, exclude_weekends) VALUES (?, ?, 1)',
    [groupId, name.trim() || '未命名小組']
  );

  // Insert default periods
  for (const period of DEFAULT_PERIODS) {
    await dbRun(
      'INSERT INTO periods (id, group_id, name, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [period.id, groupId, period.name, period.startTime, period.endTime]
    );
  }

  return groupId;
};

export const getGroup = async (groupId) => {
  const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return null;

  const periods = await dbAll(
    'SELECT id, name, start_time as startTime, end_time as endTime FROM periods WHERE group_id = ? ORDER BY CAST(id as INTEGER), id',
    [groupId]
  );

  const dbMembers = await dbAll(
    'SELECT id, name, color, is_active FROM members WHERE group_id = ? ORDER BY created_at ASC',
    [groupId]
  );

  const members = [];
  for (const m of dbMembers) {
    const dbSlots = await dbAll(
      'SELECT day, period_id, reason FROM busy_slots WHERE member_id = ?',
      [m.id]
    );

    // Format busySlots like { M: { '1': 'Math', '2': '' }, T: { ... } }
    const busySlots = {};
    dbSlots.forEach(slot => {
      if (!busySlots[slot.day]) {
        busySlots[slot.day] = {};
      }
      busySlots[slot.day][slot.period_id] = slot.reason || '';
    });

    members.push({
      id: m.id,
      name: m.name,
      color: m.color,
      isActive: Boolean(m.is_active),
      busySlots
    });
  }

  return {
    id: group.id,
    name: group.name,
    excludeWeekends: Boolean(group.exclude_weekends),
    periods,
    members
  };
};

export const updateGroup = async (groupId, settings) => {
  const { name, excludeWeekends, periods } = settings;

  if (name !== undefined) {
    await dbRun('UPDATE groups SET name = ? WHERE id = ?', [name, groupId]);
  }

  if (excludeWeekends !== undefined) {
    await dbRun('UPDATE groups SET exclude_weekends = ? WHERE id = ?', [excludeWeekends ? 1 : 0, groupId]);
  }

  if (periods !== undefined) {
    // Delete existing periods
    await dbRun('DELETE FROM periods WHERE group_id = ?', [groupId]);
    // Insert new periods
    for (const period of periods) {
      await dbRun(
        'INSERT INTO periods (id, group_id, name, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [period.id, groupId, period.name, period.startTime, period.endTime]
      );
    }
  }
};

export const addMember = async (groupId, name, color) => {
  const memberId = generateShortId(8);
  await dbRun(
    'INSERT INTO members (id, group_id, name, color, is_active) VALUES (?, ?, ?, ?, 1)',
    [memberId, groupId, name.trim() || '未命名成員', color]
  );
  return memberId;
};

export const updateMember = async (memberId, data) => {
  const { name, color, isActive, busySlots } = data;

  if (name !== undefined) {
    await dbRun('UPDATE members SET name = ? WHERE id = ?', [name, memberId]);
  }

  if (color !== undefined) {
    await dbRun('UPDATE members SET color = ? WHERE id = ?', [color, memberId]);
  }

  if (isActive !== undefined) {
    await dbRun('UPDATE members SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, memberId]);
  }

  if (busySlots !== undefined) {
    // Delete existing busy slots for this member
    await dbRun('DELETE FROM busy_slots WHERE member_id = ?', [memberId]);

    // Insert new slots
    // busySlots is formatted as { M: { '1': 'Math', '2': '' }, ... }
    for (const day of Object.keys(busySlots)) {
      const daySlots = busySlots[day];
      for (const periodId of Object.keys(daySlots)) {
        const reason = daySlots[periodId];
        await dbRun(
          'INSERT INTO busy_slots (member_id, day, period_id, reason) VALUES (?, ?, ?, ?)',
          [memberId, day, periodId, reason]
        );
      }
    }
  }
};

export const deleteMember = async (memberId) => {
  await dbRun('DELETE FROM members WHERE id = ?', [memberId]);
};

export const checkGroupExists = async (groupId) => {
  const group = await dbGet('SELECT 1 FROM groups WHERE id = ?', [groupId]);
  return !!group;
};
