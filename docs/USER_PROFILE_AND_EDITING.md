# 👤 User Profile & Editing Mode Implementation

## 📋 Overview

This document describes the implementation of user profile pages and editing mode functionality for the Dropz project. These features enable users to have personal workspaces and make changes to their content with a backup/restore system.

**Status**: ✅ **COMPLETE**

---

## 🎯 Features Implemented

### 1. User Workspaces
- **One User = One Workspace**: Each user has exactly one planet (workspace) that contains all their files
- **Automatic Workspace Creation**: Workspaces are automatically created when users first access the system
- **User Profile Fields**: Added email, avatar_url, and bio fields to user profiles

### 2. Editing Mode
- **Toggle On/Off**: Users can activate editing mode to make changes
- **Backup Before Modification**: All changes are backed up before being applied
- **Apply or Discard**: Users can either apply all changes or discard them to restore original state
- **Session Tracking**: Editing sessions are tracked in the database

### 3. Node Management (CRUD Operations)
- **Create**: Add new files or folders to workspace (only in editing mode)
- **Update**: Modify existing content (only in editing mode)
- **Delete**: Remove nodes (only in editing mode)
- **Automatic Backup**: All modifications create backups before changes

---

## 🗄️ Database Changes

### New Tables

#### `editing_sessions`
Tracks when users enter editing mode for backup/apply/discard lifecycle.

```sql
CREATE TABLE editing_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planet_id INTEGER NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

#### `node_backups`
Stores snapshots of nodes before editing for restore on discard.

```sql
CREATE TABLE node_backups (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES editing_sessions(id) ON DELETE CASCADE,
  node_id INTEGER REFERENCES nodes(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('create', 'update', 'delete')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Modified Tables

#### `users`
Added profile fields:
- `email VARCHAR(255)` - User email address
- `avatar_url TEXT` - URL to user's avatar image
- `bio TEXT` - User biography/description

#### `planets`
Added ownership field:
- `user_id INTEGER` - References the user who owns this workspace

---

## 🔌 API Endpoints

### User Profile Management

#### `GET /api/user/profile`
Get current user's profile information.

**Response:**
```json
{
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Software developer",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-02T00:00:00Z"
}
```

#### `PUT /api/user/profile`
Update current user's profile.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "bio": "Updated bio"
}
```

#### `GET /api/user/workspace`
Get current user's workspace.

**Response:**
```json
{
  "id": 1,
  "name": "John's Workspace",
  "slug": "john-workspace",
  "description": "Personal workspace for john",
  "user_id": 1,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### `POST /api/user/workspace`
Create workspace for current user (if it doesn't exist).

### Editing Mode Management

#### `GET /api/editing/status`
Check if there's an active editing session.

**Response:**
```json
{
  "is_active": true,
  "session": {
    "id": 1,
    "started_at": "2025-01-01T12:00:00Z"
  }
}
```

#### `POST /api/editing/start`
Start editing mode for the user's workspace.

**Response:**
```json
{
  "success": true,
  "session": {
    "id": 1,
    "started_at": "2025-01-01T12:00:00Z",
    "is_active": true
  }
}
```

#### `POST /api/editing/apply`
Apply all changes and end editing mode.

**Response:**
```json
{
  "success": true,
  "message": "Changes applied successfully"
}
```

#### `POST /api/editing/discard`
Discard all changes and restore from backups.

**Response:**
```json
{
  "success": true,
  "message": "Changes discarded successfully"
}
```

### Node CRUD Operations

#### `POST /api/nodes`
Create a new node (requires active editing session).

**Request Body:**
```json
{
  "slug": "my-page",
  "title": "My Page",
  "namespace": "guides",
  "type": "file",
  "content": "# My Page\n\nContent here...",
  "metadata": {
    "cover": "https://example.com/cover.jpg"
  }
}
```

#### `GET /api/nodes/[id]`
Get a specific node by ID.

#### `PUT /api/nodes/[id]`
Update a node (requires active editing session).

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "# Updated Content",
  "metadata": {
    "cover": "https://example.com/new-cover.jpg"
  }
}
```

#### `DELETE /api/nodes/[id]`
Delete a node (requires active editing session).

---

## 🖥️ User Interface Components

### Profile Pages

#### `/profile`
View user profile and workspace information.

Features:
- Display user information (username, email, bio, avatar)
- Show workspace details
- Link to workspace
- Link to edit profile

#### `/profile/edit`
Edit user profile.

Features:
- Update email, avatar URL, bio
- Avatar preview
- Form validation
- Success/error messages

### Editing Components

#### `EditingToolbar`
Floating toolbar for editing mode management.

Features:
- Toggle editing mode on/off
- Apply changes button (with confirmation)
- Discard changes button (with confirmation)
- Visual indicator when editing mode is active

Usage:
```tsx
import { EditingToolbar } from "@/components/editing-toolbar";

<EditingToolbar workspaceSlug="my-workspace" />
```

#### `NodeEditor`
Component for creating/editing nodes.

Features:
- Create new files or folders
- Edit existing nodes
- Markdown content editor
- Form validation
- Error handling

Usage:
```tsx
import { NodeEditor } from "@/components/node-editor";

<NodeEditor
  node={existingNode} // Optional: for editing
  namespace="guides"
  onSave={() => {/* handle save */}}
  onCancel={() => {/* handle cancel */}}
/>
```

---

## 📝 Query Functions

### User Workspace Queries

```typescript
// Get user's workspace
const workspace = await getUserWorkspace(userId);

// Create or get user's workspace
const workspace = await ensureUserWorkspace(userId, username);

// Update user profile
await updateUserProfile(userId, {
  email: "new@example.com",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Updated bio"
});
```

### Editing Session Queries

```typescript
// Get active editing session
const session = await getActiveEditingSession(userId, planetId);

// Start editing mode
const session = await startEditingSession(userId, planetId);

// End editing session (apply changes)
await endEditingSession(sessionId);

// Create backup before modification
await createNodeBackup(sessionId, node, "update");

// Get all backups for a session
const backups = await getSessionBackups(sessionId);

// Discard changes and restore from backups
await discardEditingSession(sessionId);
```

---

## 🔄 Editing Mode Workflow

### 1. Start Editing Mode

1. User clicks "Edit Mode" button
2. System creates new `editing_session` record
3. UI shows editing toolbar and enables editing features

### 2. Make Changes

When user modifies content:

1. System creates backup of original node in `node_backups` table
2. Changes are applied to the `nodes` table
3. UI updates to reflect changes

Backup types:
- **create**: Node was newly created (will be deleted on discard)
- **update**: Node was modified (will be restored to original on discard)
- **delete**: Node was deleted (will be recreated on discard)

### 3. Apply Changes

1. User clicks "Apply Changes" button
2. System marks `editing_session` as inactive
3. Backups are kept for history
4. Page reloads to show final state

### 4. Discard Changes

1. User clicks "Discard" button
2. System restores all nodes from backups:
   - Deletes newly created nodes
   - Restores modified nodes to original state
   - Recreates deleted nodes
3. Editing session and backups are deleted
4. Page reloads to show restored state

---

## 🚀 Usage Examples

### Creating User Workspace

```typescript
// In a server component or API route
const user = await getUser();
if (user) {
  const workspace = await ensureUserWorkspace(user.id, user.username);
  console.log(`Workspace: ${workspace.slug}`);
}
```

### Ingesting Files to User Workspace

```typescript
// CLI usage
npm run ingest -- --planet my-docs --directory ./content

// API usage with user context
await ingestFolder({
  planetSlug: workspace.slug,
  rootPath: "./content",
  clearExisting: false,
  userId: user.id, // Assigns to user's workspace
});
```

### Creating a New Page (with Editing Mode)

```typescript
// 1. Start editing mode
const response = await fetch("/api/editing/start", { method: "POST" });
const { session } = await response.json();

// 2. Create new node
await fetch("/api/nodes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    slug: "my-new-page",
    title: "My New Page",
    namespace: "guides",
    type: "file",
    content: "# My New Page\n\nContent here...",
  }),
});

// 3. Apply changes
await fetch("/api/editing/apply", { method: "POST" });
```

---

## 🧪 Testing the Implementation

### Test User Profile

1. Navigate to `/profile`
2. Verify user information is displayed
3. Click "Edit Profile"
4. Update email, avatar URL, and bio
5. Save changes
6. Verify updates are reflected

### Test Editing Mode

1. Navigate to your workspace
2. Click "Edit Mode" button
3. Editing toolbar should appear
4. Make some changes (create/edit/delete nodes)
5. Click "Apply Changes" - changes should be saved
6. OR click "Discard" - changes should be reverted

### Test Workspace Creation

1. Log in as a new user
2. Navigate to `/profile`
3. Workspace should be automatically created
4. Click "View Workspace" to see your content

---

## 📁 Files Modified/Created

### Schema & Database

- ✅ `src/db/schema.ts` - Added editing_sessions, node_backups tables, user profile fields
- ✅ `drizzle/migration-user-workspaces.sql` - Migration SQL for new schema

### Queries & API

- ✅ `src/lib/queries.ts` - Added user workspace and editing mode queries
- ✅ `src/app/api/user/profile/route.ts` - User profile management API
- ✅ `src/app/api/user/workspace/route.ts` - User workspace API
- ✅ `src/app/api/editing/start/route.ts` - Start editing mode
- ✅ `src/app/api/editing/apply/route.ts` - Apply changes
- ✅ `src/app/api/editing/discard/route.ts` - Discard changes
- ✅ `src/app/api/editing/status/route.ts` - Check editing status
- ✅ `src/app/api/nodes/route.ts` - Create node
- ✅ `src/app/api/nodes/[id]/route.ts` - Get/update/delete node
- ✅ `src/app/api/ingest/route.ts` - User-specific ingestion

### Pages & Components

- ✅ `src/app/profile/page.tsx` - View profile page
- ✅ `src/app/profile/edit/page.tsx` - Edit profile page
- ✅ `src/components/editing-toolbar.tsx` - Editing mode toolbar
- ✅ `src/components/node-editor.tsx` - Node creation/editing component

### Ingestion

- ✅ `src/lib/ingestion/ingest-folder.ts` - Added userId support

---

## ⚠️ Important Notes

### Security

- All API endpoints check user authentication
- Users can only modify their own workspace
- Editing mode is required for all modifications
- Backups ensure data safety

### Limitations

- One workspace per user (by design)
- Editing mode is workspace-specific
- Cannot edit other users' workspaces
- Login/signup flow not implemented (as per requirements)

### Future Enhancements

- Collaborative editing (multiple users per workspace)
- Version history (keep all editing sessions for history)
- Real-time updates (WebSocket for live collaboration)
- File upload interface (drag & drop markdown files)
- Export workspace (download all files as ZIP)

---

## 🎉 Success Criteria

✅ **User Workspaces**: Each user has one workspace with all their files
✅ **User Profiles**: Users can view and edit their profile information
✅ **Editing Mode**: Users can toggle editing mode on/off
✅ **CRUD Operations**: Users can add, modify, and remove content
✅ **Backup System**: All changes are backed up before modification
✅ **Apply/Discard**: Users can apply changes or restore to previous state
✅ **Ingestion**: Files can be ingested to user-specific workspaces

---

## 📞 Next Steps

1. **Apply Migration**: Run the migration SQL to update the database schema
   ```bash
   psql $POSTGRES_URL < drizzle/migration-user-workspaces.sql
   ```

2. **Test the Flow**: Log in as a user and test the complete workflow

3. **Customize UI**: Adjust the styling of profile and editing components to match your design

4. **Add File Upload**: Implement drag & drop file upload for easier content management

5. **Documentation**: Share this document with your team

---

**Implementation Date**: 2025-11-08
**Status**: Ready for testing and deployment
**Author**: Claude Assistant

🌊 **Enjoy your new user profile and editing capabilities!** 🌊
