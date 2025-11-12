# **Migration from Log-Based to Patch-Based Versioning**

## **Project Overview**

**Goal:**  
 Migrate the existing system that currently relies on a **log-based (event sourcing)** versioning system to a **patch-based (diff \+ snapshot)** system that enables efficient navigation between versions, simplified rollback, and better diff visualization.

**Motivation:**  
 The current log-based system focuses on “what happened” (semantic events) but complicates version reconstruction and rollback.  
 The new patch-based system will focus on “what changed” (syntactic diffs between versions), improving user experience and storage efficiency.

---

## **1\. 📂 Current State Analysis (Log-Based System)**

### **1.1 Architecture Overview**

* **Storage model:** Each version represented as an ordered sequence of *events* (e.g. `CREATE_DOC`, `EDIT_PARAGRAPH`, `DELETE_BLOCK`, etc.).

* **Version reconstruction:** Derived by replaying all events sequentially

### **1.2 Known Issues**

* Slow version reconstruction as documents grow.

* Difficult rollback or branching.

* Hard to compute or visualize diffs between versions.

* Redundant event chains increasing storage load.

---

## **1️⃣New Core Idea**

### 

In our app, we serve **files organized in folders**, which can be nested. we want to **track changes over time** without storing full copies of everything for every change.

The conceptual solution is:

1. Keep **only what is necessary** to represent changes.

2. Represent each modification as a **diff** (what changed), not a full snapshot.

3. Maintain a **current tree** of all files/folders and a chain of diffs that links all changes — like a lightweight blockchain.

---

## **2️⃣ Key Concepts**

### **Node (File or Folder)**

* Every file or folder is a **node** in your system.

* Each node stores:

  * Its **type** (file or folder)

  * Its **name**

  * Its **location in the hierarchy** (which folder it belongs to)

  * For files, the **content**

  * The **last modification time**

Folders are mostly metadata containers (name, location, timestamps), while files have actual content.

---

### **Diff**

A **diff** represents a **single change** to a node:

* For files: the diff contains only the **minimal difference in content**.

* For folders: the diff might indicate a **rename** or **move** to another folder, DO WHAT YOU WANT

* Other operations include **create** or **delete** for files or folders, or **others**, the whole CRUD thing.

Each diff also records **who made the change** and **when**.

---

## **3️⃣ Minimal Storage Principle**

Instead of storing all historical snapshots:

1. Maintain the **current state** of all nodes (the complete current tree).

2. Maintain **the previous version** of each modified node (to allow undo/revert).

3. Record **the diff that leads to the next change**.

In other words, at any moment, you only need **three things per node**:

1. **Current version** — what users see now.

2. **Previous version** — backup of the last state for undo.

3. **Patch/diff to the next version** — describes the upcoming change.

This forms a **chain of diffs**, similar to a blockchain: every change links backward to the previous state.

---

## **4️⃣ How Changes Are Tracked**

Whenever a user edits a file or moves/renames a folder:

1. **Capture the change as a diff** — only what changed is stored.

2. **Update the current state** with the change.

3. **Move the current state to the previous state slot** (for potential rollback).

4. Keep the diff so that the next modification can be linked to it.

This way, you **never store more than necessary**, but can reconstruct past versions by reversing diffs.

---

## **5️⃣ How Version History Works**

* To see the **current version**, you simply read the current tree.

* To **undo the last change**, you revert the previous version into the current version and discard or update the diff.

* To **reconstruct a past version beyond the previous one**, you can follow the chain of diffs backward, applying them in reverse.

The **folder hierarchy** is implicitly tracked by storing each node’s parent folder, so moving or renaming folders is also just a diff.

---

## **6️⃣ Advantages of This Approach**

| Feature | Benefit |
| ----- | ----- |
| Minimal storage | Only store current, previous, and patch per node |
| Full version history | Can reconstruct any past state using the diff chain |
| Efficient | No need to store full snapshots of entire tree for every edit |
| Supports hierarchy | Moves and renames are tracked as diffs |
| Blockchain-like | Each diff links to previous state, ensuring integrity |

# **Testing and Success Plan — Minimal Diff Versioning for Cloud Files**

## **1️⃣ Core Goals for Testing**

The revamp has three main goals:

1. **Correctness:** All diffs accurately capture changes to files or folders, and applying/reversing them reconstructs the correct states.

2. **Integrity:** Folder structure, file content, and metadata remain consistent, even after multiple edits, moves, or deletes.

3. **Performance:** The system efficiently handles diffs, rollback, and reconstruction without excessive memory or storage.

---

## **2️⃣ Types of Tests**

### **2.1 Unit Tests**

* **Diff Generation:**

  * Verify that the diff created for a file content change exactly represents the change.

  * Check that a diff applied to the previous content produces the correct current content.

* **Node Updates:**

  * Moving, renaming, creating, deleting nodes produce correct diffs.

  * Ensure parent-child relationships remain consistent for folder moves.

* **Diff Reversal:**

  * Applying a reversed diff returns the node to the previous state.

* **Edge Cases:**

  * Empty files or folders.

  * Large files or deeply nested folders.

  * Multiple simultaneous operations on the same node.

---

### **2.2 Integration Tests**

* **Tree Reconstruction:**

  * Apply a chain of diffs sequentially to reconstruct the current state.

  * Reverse the chain to reconstruct previous versions.

* **Hierarchy Integrity:**

  * After moves and renames, paths are correct.

  * No orphaned nodes (every node has a valid parent or is root).

* **Cross-node Operations:**

  * Moving a folder with files preserves all child nodes.

  * Renaming a parent folder updates paths correctly without changing file contents.

* **Concurrent Edits:**

  * Simulate multiple edits in parallel; ensure diffs apply correctly without corrupting state.

---

### **2.3 Regression Tests**

* Compare reconstructed states **before and after migration** to ensure fidelity:

  * Original log-based system state \= reconstructed state from diffs.

* Ensure old operations (from logs) are correctly represented in new diff system.

---

### **2.4 Performance Tests**

* Measure:

  * Time to reconstruct a full tree from current \+ previous \+ diff chain.

  * Time to apply and reverse diffs for large files and deep folder structures.

  * Storage usage per node for minimal diff system vs old log-based storage.

---

## **3️⃣ Success Criteria**

| Aspect | Measure of Success |
| ----- | ----- |
| **Correctness** | Every node’s current content matches what the old system would have produced. |
| **Rollback Accuracy** | Reverting to previous version restores content and folder structure exactly. |
| **Hierarchy Integrity** | No orphaned or missing nodes; parent-child relationships preserved. |
| **Diff Fidelity** | Patches can reconstruct all intermediate versions exactly. |
| **Performance** | Operations (apply diff, rollback, reconstruct tree) remain fast and scalable. |
| **Storage Efficiency** | Minimal storage used per node (only previous \+ current \+ diff). |
| **Edge Case Handling** | Empty files, moves of nested folders, and simultaneous edits handled correctly. |

