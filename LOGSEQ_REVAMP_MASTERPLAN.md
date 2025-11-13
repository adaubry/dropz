# Logseq Integration Revamp Guide

## 🎯 OBJECTIVE

Fix the Logseq graph integration so that:
1. User uploads a Logseq graph → Pages stored correctly
2. Navigate to `/planet/pages/intro` → Page displays with working `[[links]]`
3. Navigate to `/planet/pages` → Shows list of all pages (Logseq-style)
4. Navigate to `/planet` → Shows "pages" and "journals" folders as water cards
5. All `[[page]]` references become clickable links that navigate correctly

---

## 🔴 CURRENT BROKEN STATE

### What Happens Now

**Upload:**
```
pages/intro.md → Database: page_name="intro", source_folder="pages"
pages/guides___setup.md → Database: page_name="guides/setup", source_folder="pages"
journals/2025_11_12.md → Database: page_name="2025-11-12", source_folder="journals"
```

**Navigate to `/planet/pages/intro`:**
```
URL: /planet/pages/intro
Routing: path = ["pages", "intro"]
Query: page_name = "pages/intro"
Database: page_name = "intro" (no folder prefix!)
Result: 404 NOT FOUND ❌
```

**Navigate to `/planet`:**
```
Query: Show children with slug="pages" OR slug="journals"
Database: No folder nodes exist (only file nodes)
Result: Empty planet root ❌
```

**Page displays as plain text:**
```
[[Start here]] → Shows as literal text (not clickable)
Reason: Type was "page" (now fixed to "file"), but still not working
```

---

## 🔍 ROOT CAUSES

### Problem 1: Storage vs Routing Mismatch

**Storage is flat (Logseq-correct):**
- `page_name = "intro"` (no folder prefix)
- `page_name = "guides/setup"` (namespace, but no "pages/" prefix)

**Routing expects hierarchy:**
- URL: `/planet/pages/intro`
- Queries: `page_name = "pages/intro"` (expects folder prefix)
- **Mismatch** → 404

### Problem 2: No Folder Nodes

- Upload creates ONLY file nodes (pages)
- Does NOT create "pages" and "journals" folder nodes
- Planet root filter looks for folders → finds nothing

### Problem 3: Link Generation Without Context

**In page content:** `[[intro]]`
**Renderer converts to:** `[intro](/planet/intro)`
**Should be:** `[intro](/planet/pages/intro)` (because intro is in pages folder)

**Problem:** Renderer doesn't know which folder the page is in!

### Problem 4: Water Cards Show Wrong Pages

Water cards extraction is correct BUT relies on being able to query pages by name, which fails due to storage mismatch.

---

## ✅ CORRECT LOGSEQ ARCHITECTURE

### Storage Structure

Logseq is conceptually flat but URLs need hierarchy for UX:

```
Database Storage:
page_name = "pages/intro"           (include folder prefix)
page_name = "pages/guides/setup"    (include folder prefix)
page_name = "journals/2025-11-12"   (include folder prefix)
source_folder = "pages" or "journals" (metadata)

URL Structure:
/planet/pages/intro        → matches page_name="pages/intro" ✅
/planet/pages/guides/setup → matches page_name="pages/guides/setup" ✅
/planet/journals/2025-11-12 → matches page_name="journals/2025-11-12" ✅
```

### Folder Abstraction

Create virtual folder nodes for UX:
```
slug="pages", type="folder", metadata.isLogseqFolder=true
slug="journals", type="folder", metadata.isLogseqFolder=true
```

These exist ONLY for navigation, not for storage.

---

## 🔧 REQUIRED CHANGES

### CHANGE 1: Parser - Include Folder Prefix in page_name

**File:** `src/lib/logseq/parser.ts`

**Current:**
```typescript
function parsePageFile(nameWithoutExt: string, fileName: string): ParsedLogseqFile {
  const pageName = nameWithoutExt.replace(/___/g, '/');
  const segments = pageName.split('/');
  const slug = segments[segments.length - 1];
  const namespace = segments.slice(0, -1).join('/');

  return {
    pageName,  // ❌ "intro" or "guides/setup"
    slug,
    namespace, // ❌ "" or "guides"
    // ...
  };
}
```

**Should be:**
```typescript
function parsePageFile(nameWithoutExt: string, fileName: string): ParsedLogseqFile {
  const rawPageName = nameWithoutExt.replace(/___/g, '/');
  const segments = rawPageName.split('/');
  const slug = segments[segments.length - 1];
  const namespace = segments.slice(0, -1).join('/');

  // ADD FOLDER PREFIX
  const pageName = `pages/${rawPageName}`;
  const fullNamespace = namespace ? `pages/${namespace}` : 'pages';

  return {
    pageName,     // ✅ "pages/intro" or "pages/guides/setup"
    slug,
    namespace: fullNamespace, // ✅ "pages" or "pages/guides"
    depth: segments.length, // depth from pages root
    // ...
  };
}

function parseJournalFile(nameWithoutExt: string, fileName: string): ParsedLogseqFile {
  const dateMatch = nameWithoutExt.match(/^(\d{4})_(\d{2})_(\d{2})$/);

  let journalDate: Date | null = null;
  let rawPageName = nameWithoutExt;

  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);
    journalDate = new Date(year, month - 1, day);
    rawPageName = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  return {
    pageName: `journals/${rawPageName}`, // ✅ ADD PREFIX
    slug: rawPageName,
    namespace: 'journals', // ✅ SET NAMESPACE
    depth: 0,
    isJournal: true,
    journalDate,
    sourceFolder: 'journals',
    fileName,
  };
}
```

**Why:** Makes `page_name` match URL structure exactly.

---

### CHANGE 2: Upload - Create Folder Nodes

**File:** `src/components/logseq-graph-upload.tsx`

**Add after uploading all pages:**

```typescript
// After line 268 (after processing all files)

console.log('[Logseq Import] Creating folder nodes...');

// Create "pages" folder node if it doesn't exist
try {
  await fetch("/api/nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "pages",
      title: "Pages",
      namespace: "",
      type: "folder",
      content: "# Pages\n\nAll your Logseq pages are stored here.",
      metadata: {
        isLogseqFolder: true,
        summary: "Logseq pages folder"
      },
    }),
  });
  console.log('[Logseq Import] Created "pages" folder');
} catch (err) {
  console.log('[Logseq Import] Pages folder might already exist');
}

// Create "journals" folder node if it doesn't exist
try {
  await fetch("/api/nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "journals",
      title: "Journals",
      namespace: "",
      type: "folder",
      content: "# Journals\n\nYour Logseq daily journals are stored here.",
      metadata: {
        isLogseqFolder: true,
        summary: "Logseq journals folder"
      },
    }),
  });
  console.log('[Logseq Import] Created "journals" folder');
} catch (err) {
  console.log('[Logseq Import] Journals folder might already exist');
}
```

**Why:** Planet root needs these folders to display water cards.

---

### CHANGE 3: Routing - Already Correct!

**File:** `src/lib/queries.ts` → `getNodeByPath()`

**Current code at line 516:**
```typescript
const pageName = decodedSegments.join("/");
const logseqPage = await db.query.nodes.findFirst({
  where: and(
    eq(nodes.planet_id, planet.id),
    eq(nodes.page_name, pageName)
  ),
});
```

**This is ALREADY CORRECT!** ✅

With the parser change, this will now work:
- URL: `/planet/pages/intro` → `pageName = "pages/intro"`
- Database: `page_name = "pages/intro"` (after parser fix)
- **Match!** ✅

---

### CHANGE 4: Link Generation - Add Folder Context

**File:** `src/lib/logseq/render.ts`

**Current:**
```typescript
function convertPageReferences(
  content: string,
  planetSlug: string
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    const encodedPageName = pageName
      .split("/")
      .map((segment: string) => encodeURIComponent(segment))
      .join("/");

    // ❌ Generates: /planet/intro (missing folder prefix!)
    return `[${pageName}](/${planetSlug}/${encodedPageName})`;
  });
}
```

**Should be:**
```typescript
function convertPageReferences(
  content: string,
  planetSlug: string,
  currentPageName: string // NEW: pass current page's page_name
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    // Determine folder from current page or reference
    let fullPath: string;

    if (pageName.startsWith('pages/') || pageName.startsWith('journals/')) {
      // Already has folder prefix (e.g., [[pages/intro]])
      fullPath = pageName;
    } else {
      // Infer folder from current page's location
      // If current page is "pages/something", referenced page is also in "pages"
      // If current page is "journals/2025-11-12", referenced page is in "pages" by default
      const currentFolder = currentPageName.startsWith('journals/') ? 'pages' : 'pages';
      fullPath = `${currentFolder}/${pageName}`;
    }

    const encodedPath = fullPath
      .split("/")
      .map((segment: string) => encodeURIComponent(segment))
      .join("/");

    // ✅ Generates: /planet/pages/intro
    return `[${pageName}](/${planetSlug}/${encodedPath})`;
  });
}
```

**Update processLogseqContent signature:**
```typescript
export async function processLogseqContent(
  content: string,
  planetId: number,
  planetSlug: string,
  blockIndex: BlockIndex,
  currentPageName: string // NEW parameter
): Promise<string> {
  // ...
  processed = convertPageReferences(processed, planetSlug, currentPageName);
  // ...
}
```

**Update caller in LogseqMarkdownPreview:**
```typescript
// In src/components/logseq-markdown-preview.tsx
export async function LogseqMarkdownPreview({
  content,
  planetId,
  planetSlug,
  pageName, // NEW: pass current page's page_name
  className,
}: LogseqMarkdownPreviewProps) {
  const blockIndex = await getCachedBlockIndex(planetId);

  const processedContent = await processLogseqContent(
    content,
    planetId,
    planetSlug,
    blockIndex,
    pageName // Pass it through
  );
  // ...
}
```

**Update page.tsx to pass pageName:**
```typescript
// In src/app/[planet]/[[...path]]/page.tsx
{isLogseqPage && node.content ? (
  <LogseqMarkdownPreview
    content={node.content}
    planetId={planetData.id}
    planetSlug={planet}
    pageName={node.page_name!} // Pass the page_name
  />
) : (
  // ...
)}
```

**Why:** Links need to know which folder to navigate to.

---

### CHANGE 5: Folder Display - Show Page Lists

**File:** `src/app/[planet]/[[...path]]/page.tsx`

**Add after line 259 (in the folder rendering section):**

```typescript
// If it's a folder (ocean/sea/river), show children navigation
const namespace = path.length > 0 ? path.join("/") : "";
const children = await getNodeChildren(planetData.id, namespace);

// NEW: Check if this is a Logseq folder
const isLogseqFolder = node.metadata?.isLogseqFolder === true;

if (isLogseqFolder) {
  // This is "pages" or "journals" folder - show all Logseq pages
  const sourceFolder = node.slug as 'pages' | 'journals';

  const logseqPages = await db.query.nodes.findMany({
    where: and(
      eq(nodes.planet_id, planetData.id),
      eq(nodes.source_folder, sourceFolder),
      eq(nodes.type, "file")
    ),
    orderBy: sourceFolder === 'journals'
      ? [desc(nodes.journal_date)]
      : [nodes.page_name],
  });

  return (
    <>
      {isOwnWorkspace && <EditingToolbar ... />}
      <main>
        <div className="container mx-auto p-4 max-w-7xl">
          <HistoryBreadcrumbs />
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{node.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {sourceFolder === 'journals'
                ? 'Your daily journal entries'
                : 'All your Logseq pages'}
            </p>
          </div>

          <LogseqPageLinks
            pages={logseqPages}
            planetSlug={planet}
            currentPath={path}
          />
        </div>
      </main>
    </>
  );
}

// Rest of folder rendering for non-Logseq folders...
```

**Why:** `/planet/pages` should show a list of all pages, not children (there are none).

---

### CHANGE 6: Update LogseqPageLinks for Correct URLs

**File:** `src/components/logseq-page-links.tsx`

**Current:**
```typescript
<Link
  href={`/${planetSlug}/${[...currentPath, child.slug].join("/")}`}
>
```

**Should be:**
```typescript
<Link
  href={`/${planetSlug}/${page.page_name || [...currentPath, page.slug].join("/")}`}
>
```

**Why:** Use `page_name` which now has the correct full path including folder prefix.

---

### CHANGE 7: Water Cards - Use Correct Query

**File:** `src/components/cited-pages-cards.tsx`

**Current at line 26:**
```typescript
const citedPages = await db.query.nodes.findMany({
  where: and(
    eq(nodes.planet_id, planetId),
    inArray(nodes.page_name, pageNames)
  ),
  // ...
});
```

**Should be:**
```typescript
// pageNames extracted from content are like: ["intro", "setup"]
// But database has: ["pages/intro", "pages/setup"]
// Need to try both with and without prefix

const citedPages = await db.query.nodes.findMany({
  where: and(
    eq(nodes.planet_id, planetId),
    or(
      inArray(nodes.page_name, pageNames),
      inArray(
        nodes.page_name,
        pageNames.map(name => `pages/${name}`)
      )
    )
  ),
  // ...
});
```

**Why:** References in content don't have folder prefix, but database does.

---

## 🔄 DATA FLOW AFTER FIXES

### Upload Flow
```
1. Drop logseq-graph/ folder
2. Parse pages/intro.md → pageName="pages/intro", namespace="pages"
3. Create node: page_name="pages/intro", source_folder="pages", type="file"
4. Create folder nodes: slug="pages", slug="journals", type="folder"
5. Done ✅
```

### Navigation Flow
```
1. User clicks link or types URL: /planet/pages/intro
2. Routing: path=["pages", "intro"], pageName="pages/intro"
3. Query: WHERE page_name="pages/intro"
4. Match found ✅
5. Render with LogseqMarkdownPreview
6. Convert [[other page]] → [other page](/planet/pages/other page)
7. Display ✅
```

### Link Click Flow
```
1. Page contains: [[Getting Started]]
2. Renderer: currentPageName="pages/intro"
3. Infer: "Getting Started" is also in "pages"
4. Generate: [Getting Started](/planet/pages/Getting%20Started)
5. User clicks → navigates to /planet/pages/Getting%20Started
6. Routing finds page_name="pages/Getting Started"
7. Display ✅
```

### Planet Root Flow
```
1. Navigate to /planet
2. Query children where namespace=""
3. Find: slug="pages" (folder), slug="journals" (folder)
4. Display as water cards ✅
5. User clicks "pages" folder
6. Navigate to /planet/pages
7. Check: metadata.isLogseqFolder=true
8. Query all nodes where source_folder="pages"
9. Display LogseqPageLinks ✅
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Storage Structure
- [ ] Update `parsePageFile()` to include "pages/" prefix in `pageName`
- [ ] Update `parseJournalFile()` to include "journals/" prefix in `pageName`
- [ ] Test: Parser outputs correct page_name with folder prefix

### Phase 2: Upload
- [ ] Add folder node creation after page uploads
- [ ] Test: Upload creates "pages" and "journals" folder nodes

### Phase 3: Link Generation
- [ ] Add `currentPageName` parameter to `convertPageReferences()`
- [ ] Update `processLogseqContent()` signature
- [ ] Update `LogseqMarkdownPreview` to accept and pass `pageName`
- [ ] Update page.tsx to pass `node.page_name`
- [ ] Test: [[page]] links generate correct URLs with folder prefix

### Phase 4: Display Logic
- [ ] Add Logseq folder detection in page.tsx
- [ ] Add query for pages by source_folder
- [ ] Render LogseqPageLinks for Logseq folders
- [ ] Update LogseqPageLinks to use page_name for URLs
- [ ] Test: /planet/pages shows all pages

### Phase 5: Water Cards
- [ ] Update CitedPagesCards query to handle prefix mismatch
- [ ] Test: Water cards show only referenced pages

### Phase 6: End-to-End Testing
- [ ] Delete existing Logseq pages
- [ ] Upload fresh Logseq graph
- [ ] Navigate to /planet → See folders ✅
- [ ] Navigate to /planet/pages → See page list ✅
- [ ] Navigate to /planet/pages/intro → See page with links ✅
- [ ] Click [[page]] link → Navigate correctly ✅
- [ ] Water cards show only referenced pages ✅

---

## 🎯 SUCCESS CRITERIA

After all changes:

1. ✅ Upload Logseq graph → All pages stored with correct `page_name`
2. ✅ `/planet` → Shows "pages" and "journals" folders as cards
3. ✅ `/planet/pages` → Shows list of all pages
4. ✅ `/planet/pages/intro` → Displays page content
5. ✅ `[[Start here]]` → Clickable link to `/planet/pages/Start%20here`
6. ✅ Click link → Navigates to correct page
7. ✅ Water cards → Show only pages referenced in content
8. ✅ All Logseq syntax works (highlights, tasks, properties, etc.)

---

## ⚠️ CRITICAL NOTES

1. **Breaking Change:** Existing Logseq pages in database have wrong `page_name` (no prefix)
   - Solution: Users must delete and re-upload after fix

2. **Link Resolution:** When page references don't have folder prefix, default to "pages/"
   - This matches Logseq behavior (most links are to pages, not journals)

3. **Performance:** Each `[[page]]` link generation doesn't query DB
   - Uses inference from current page location (fast)

4. **Namespace Field:** Keep it but ensure it has folder prefix too
   - Maintains compatibility with legacy folder system

5. **Type Field:** Must be "file" for pages (already fixed)
   - "folder" type is only for virtual folders (pages, journals)
