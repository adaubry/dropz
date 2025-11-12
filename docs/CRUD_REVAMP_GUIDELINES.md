Migration from Log-Based to Patch-Based Versioning
Project Overview

Goal:
Migrate the existing system from a log-based (event sourcing) versioning system to a patch-based, diff-centric system that enables efficient navigation between versions, simplified rollback, and better diff visualization, using diff-match-patch as the core engine.

Motivation:

The current log-based system focuses on “what happened” (semantic events) but complicates version reconstruction, rollback, and diff visualization.

The new patch-based system will focus on “what changed”, improving user experience, storage efficiency, and integrity of edits.

1️⃣ Current State Analysis (Log-Based System)
1.1 Architecture Overview

Storage model: Each version represented as an ordered sequence of events (CREATE_DOC, EDIT_PARAGRAPH, DELETE_BLOCK, etc.).

Version reconstruction: Derived by replaying all events sequentially.

1.2 Known Issues

Slow version reconstruction as documents and folders grow.

Difficult rollback or branching.

Hard to compute or visualize diffs between versions.

Redundant event chains increase storage load.

2️⃣ New Core Idea

Our app serves files organized in folders, which can be nested. We want to track changes without storing full copies of everything for each edit.

Conceptual Solution

Keep only what is necessary to represent changes.

Represent each modification as a diff using diff-match-patch, not a full snapshot.

Maintain a current tree of all files/folders and a chain of diffs linking all changes — a lightweight blockchain.

CRUD operations are fool-proof by design, restricted to owners, atomic, repeat-safe, and text-only.

3️⃣ Privileges Redesign

Workspace ownership model:

Only two statuses: owner or non-owner.

Owners can edit their workspaces; non-owners can only view.

Public view:

All workspaces are viewable by everyone.

On the homepage:

Remove “Sign In” / “Sign Up” buttons.

Display all workspaces (planets) from the database, allowing navigation.

If logged in, a link to /profile appears next to the refresh button.

CRUD enforcement:

Only workspace owners can perform Create, Update, Delete operations.

All modifications are text-only.

All operations are atomic (fully succeed or fully fail).

All operations are idempotent (repeat-safe).

4️⃣ Key Concepts
Node (File or Folder)

Each file or folder is a node in the system:

Type: file or folder

Name

Location in hierarchy (parent folder)

For files: content

Last modification time

Folders are mostly metadata containers; files hold text content.

Diff

A diff represents a single change to a node:

Files: minimal content changes (diff-match-patch)

Folders: rename or move operations

Other operations: create or delete

Each diff records who made the change and when.

5️⃣ Minimal Storage Principle

At any moment, each node only stores:

Current version: the visible state.

Previous version: backup for undo/revert.

Patch/diff to next version: describes the upcoming change (diff-match-patch).

This forms a chain of diffs, like a blockchain: every change links backward to the previous state.

6️⃣ How Changes Are Tracked

Whenever a user edits a file or moves/renames a folder:

Capture the change as a diff (diff-match-patch).

Update the current state with the change.

Move the current state to previous version for rollback.

Keep the diff linked to the next modification.

All changes are minimal, atomic, and text-only, ensuring repeat safety.

7️⃣ Version History Mechanics

Current version: simply read the current tree.

Undo last change: revert previous version into current version and update/remove the diff.

Reconstruct past versions: follow the chain of diffs backward and apply in reverse.

Folder hierarchy is implicitly tracked via parent IDs. Moves and renames are stored as diffs.

8️⃣ Advantages of This Approach
Feature Benefit
Minimal storage Only current, previous, and patch per node
Full version history Can reconstruct any past state using diff chains
Efficient No need for full snapshots at every edit
Supports hierarchy Moves and renames tracked as diffs
Blockchain-like Each diff links to the previous state, ensuring integrity
Fool-proof CRUD Atomic, idempotent, text-only, owner-restricted edits
Diff-centric All operations rely on diff-match-patch for maximal precision
