/**
 * Diff utilities using diff-match-patch
 * Implements patch-based versioning for the CRUD revamp
 */

import DiffMatchPatch from "diff-match-patch";
import { createHash } from "crypto";

const dmp = new DiffMatchPatch();

/**
 * Creates a patch from old text to new text
 * @param oldText - The original text
 * @param newText - The new text
 * @returns A patch string that can be stored in the database
 */
export function createPatch(oldText: string, newText: string): string {
  const diffs = dmp.diff_main(oldText || "", newText || "");
  dmp.diff_cleanupSemantic(diffs);
  const patches = dmp.patch_make(oldText || "", diffs);
  return dmp.patch_toText(patches);
}

/**
 * Applies a patch to text
 * @param text - The text to apply the patch to
 * @param patchText - The patch string
 * @returns The patched text, or null if the patch fails
 */
export function applyPatch(text: string, patchText: string): string | null {
  const patches = dmp.patch_fromText(patchText);
  const [patchedText, results] = dmp.patch_apply(patches, text || "");

  // Check if all patches applied successfully
  const allSucceeded = results.every((result) => result === true);
  if (!allSucceeded) {
    return null;
  }

  return patchedText;
}

/**
 * Creates a hash of content for integrity verification
 * @param content - The content to hash
 * @returns A SHA-256 hash of the content
 */
export function createVersionHash(content: string): string {
  return createHash("sha256").update(content || "").digest("hex");
}

/**
 * Verifies that a hash matches the content
 * @param content - The content to verify
 * @param hash - The expected hash
 * @returns True if the hash matches
 */
export function verifyVersionHash(content: string, hash: string): boolean {
  return createVersionHash(content) === hash;
}

/**
 * Creates a complete version chain entry
 * @param previousContent - The previous version of the content (or null for new content)
 * @param currentContent - The current version of the content
 * @returns An object with current_version, previous_version, patch_to_next, and version_hash
 */
export function createVersionChain(
  previousContent: string | null,
  currentContent: string
): {
  current_version: string;
  previous_version: string | null;
  patch_to_next: string | null;
  version_hash: string;
} {
  const patch = previousContent
    ? createPatch(previousContent, currentContent)
    : null;

  return {
    current_version: currentContent,
    previous_version: previousContent,
    patch_to_next: null, // Will be filled when there's a next version
    version_hash: createVersionHash(currentContent),
  };
}

/**
 * Updates the version chain with a new version
 * @param currentContent - The current content
 * @param newContent - The new content
 * @returns An object with updated version chain fields and the patch from current to new
 */
export function updateVersionChain(
  currentContent: string,
  newContent: string
): {
  current_version: string;
  previous_version: string;
  patch_to_next: string | null;
  version_hash: string;
  patch_from_previous: string;
} {
  const patch = createPatch(currentContent, newContent);

  return {
    current_version: newContent,
    previous_version: currentContent,
    patch_to_next: null, // Will be filled when there's a next version
    version_hash: createVersionHash(newContent),
    patch_from_previous: patch,
  };
}

/**
 * Reverts to the previous version
 * @param previousVersion - The previous version to revert to
 * @returns A version chain for the reverted state
 */
export function revertToPreviousVersion(
  previousVersion: string
): {
  current_version: string;
  previous_version: string | null;
  patch_to_next: string | null;
  version_hash: string;
} {
  return {
    current_version: previousVersion,
    previous_version: null, // Could be set to a further-back version if needed
    patch_to_next: null,
    version_hash: createVersionHash(previousVersion),
  };
}

/**
 * Validates that a patch can be applied to text
 * @param text - The text to apply the patch to
 * @param patchText - The patch string
 * @returns True if the patch can be applied successfully
 */
export function validatePatch(text: string, patchText: string): boolean {
  return applyPatch(text, patchText) !== null;
}
