import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Roles Table (Dynamic permissions mapping)
export const roles = sqliteTable('roles', {
  name: text('name').primaryKey(), // Role name: e.g. 'ADMIN', 'TECH', 'USER', 'APPROVER', or custom ones
  menusJson: text('menus_json').notNull(), // JSON array of allowed menu hrefs, e.g. ["/dashboard", "/dashboard/tickets"]
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Departments Table (Defined first to allow reference)
export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  approverUserId: integer('approver_user_id'), // Referencing users.id (Mapped in code to prevent TS circular inference loop)
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Settings Table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(), // Generic role text to support custom roles
  lineUserId: text('line_user_id'),
  telegramChatId: text('telegram_chat_id'),
  departmentId: integer('department_id'), // Referencing departments.id (Mapped in code to prevent TS circular inference loop)
  profilePicture: text('profile_picture'), // Base64 profile avatar
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// IT Assets Table
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetTag: text('asset_tag').notNull().unique(), // e.g. AST-0001
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  category: text('category').notNull(), // e.g. Hardware, Software, Network
  status: text('status').notNull().$type<'Active' | 'In_Repair' | 'Retired'>().default('Active'),
  assignedToUserId: integer('assigned_to_user_id').references(() => users.id),
  purchaseDate: text('purchase_date'),
  purchaseCost: real('purchase_cost'),
  imagesJson: text('images_json'), // JSON array of up to 3 base64 images
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// IT Tickets Table
export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNo: text('ticket_no').notNull().unique(), // e.g. TCK-2026-0001
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull().$type<'Low' | 'Medium' | 'High' | 'Critical'>().default('Medium'),
  status: text('status').notNull().$type<'Open' | 'In_Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Pending_Approval'>().default('Open'),
  reporterId: integer('reporter_id').notNull().references(() => users.id),
  assigneeId: integer('assignee_id').references(() => users.id),
  assetId: integer('asset_id').references(() => assets.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  resolvedAt: text('resolved_at'),
  satisfactionRating: integer('satisfaction_rating'), // CSAT 1-5
  resolutionNote: text('resolution_note'), // Technician's closing comment
});

// Preventive Maintenance (PM) Plans Table
export const pmPlans = sqliteTable('pm_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planName: text('plan_name').notNull(),
  departmentId: integer('department_id'), // Link to departments table
  assetId: integer('asset_id').notNull().references(() => assets.id),
  frequency: text('frequency').notNull().$type<'Monthly' | 'Quarterly' | 'Yearly'>(),
  nextDueDate: text('next_due_date').notNull(),
  checklistJson: text('checklist_json').notNull(), // JSON array of checklists e.g. ["Check disk space", "Clean dust"]
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// PM Logs / Executions Table
export const pmLogs = sqliteTable('pm_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pmPlanId: integer('pm_plan_id').notNull().references(() => pmPlans.id),
  ticketId: integer('ticket_id').references(() => tickets.id), // The auto-generated Ticket ID
  executionDate: text('execution_date').notNull(),
  status: text('status').notNull().$type<'Pending' | 'Completed' | 'Skipped'>().default('Pending'),
});

// Spare Parts Table (Inventory)
export const spareParts = sqliteTable('spare_parts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  partNumber: text('part_number').unique(),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity').notNull().default(0), // Reorder point
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Ticket Spare Parts Table (Parts consumed in repairs)
export const ticketSpareParts = sqliteTable('ticket_spare_parts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id),
  partId: integer('part_id').notNull().references(() => spareParts.id),
  quantity: integer('quantity').notNull().default(1),
  usedAt: text('used_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Audit Logs Table
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // e.g. CREATE_ASSET, UPDATE_USER_ROLE
  details: text('details').notNull(), // text description or JSON string
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Knowledge Base Table (FAQ)
export const knowledgeBase = sqliteTable('knowledge_base', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(), // e.g. Software, Hardware, Network, General
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
