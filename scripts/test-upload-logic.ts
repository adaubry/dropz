#!/usr/bin/env tsx
/**
 * Unit Test: Folder Upload Logic (No Database Required)
 *
 * Tests the namespace calculation logic that was fixed in the upload component
 */

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║   🧪 Folder Upload Logic Test (Unit Test)                ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

// Simulate the exact logic from file-upload-dropzone.tsx

interface FileWithPath {
  file: { name: string };
  relativePath: string;
}

function extractFolderPaths(filesWithPaths: FileWithPath[]): string[] {
  // This is the EXACT logic from lines 160-174 of file-upload-dropzone.tsx
  const folderPaths = new Set<string>();
  filesWithPaths.forEach(({ relativePath }) => {
    if (relativePath) {
      // Remove the filename to get just the directory path
      const parts = relativePath.split("/").filter(Boolean);
      // Only process if there are directory parts (parts.length > 1 means there's a folder)
      if (parts.length > 1) {
        // Don't include the last part (filename)
        for (let i = 0; i < parts.length - 1; i++) {
          const folderPath = parts.slice(0, i + 1).join("/");
          folderPaths.add(folderPath);
        }
      }
    }
  });

  // Sort by depth
  return Array.from(folderPaths).sort(
    (a, b) => a.split("/").length - b.split("/").length
  );
}

function calculateFileNamespace(
  currentPath: string[],
  relativePath: string
): string {
  // This is the EXACT logic from lines 249-257 of file-upload-dropzone.tsx
  const pathParts = relativePath ? relativePath.split("/").filter(Boolean) : [];
  const directoryPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";

  const namespace = [...currentPath, directoryPath]
    .filter(Boolean)
    .join("/");

  return namespace;
}

function calculateFolderNamespace(
  currentPath: string[],
  folderPath: string
): string {
  // This is the EXACT logic from lines 185-187 of file-upload-dropzone.tsx
  const pathParts = folderPath.split("/");
  const folderSlug = pathParts[pathParts.length - 1];
  const folderNamespace = [...currentPath, ...pathParts.slice(0, -1)]
    .filter(Boolean)
    .join("/");

  return folderNamespace;
}

// Test scenarios
interface TestCase {
  name: string;
  currentPath: string[];
  files: { name: string; relativePath: string }[];
  expected: {
    folders: Array<{ slug: string; namespace: string }>;
    files: Array<{ slug: string; namespace: string }>;
  };
}

const testCases: TestCase[] = [
  {
    name: "Drop 'docs' folder at root with nested structure",
    currentPath: [],
    files: [
      { name: "setup.md", relativePath: "guides/setup.md" },
      { name: "faq.md", relativePath: "guides/faq.md" },
      { name: "reference.md", relativePath: "api/reference.md" },
    ],
    expected: {
      folders: [
        { slug: "guides", namespace: "" },
        { slug: "api", namespace: "" },
      ],
      files: [
        { slug: "setup", namespace: "guides" },
        { slug: "faq", namespace: "guides" },
        { slug: "reference", namespace: "api" },
      ],
    },
  },
  {
    name: "Drop 'docs' folder inside 'workspace' folder",
    currentPath: ["workspace"],
    files: [
      { name: "setup.md", relativePath: "guides/setup.md" },
      { name: "faq.md", relativePath: "guides/faq.md" },
    ],
    expected: {
      folders: [
        { slug: "guides", namespace: "workspace" },
      ],
      files: [
        { slug: "setup", namespace: "workspace/guides" },
        { slug: "faq", namespace: "workspace/guides" },
      ],
    },
  },
  {
    name: "Drop deeply nested structure",
    currentPath: [],
    files: [
      { name: "lecture.md", relativePath: "courses/cs101/week1/lecture.md" },
    ],
    expected: {
      folders: [
        { slug: "courses", namespace: "" },
        { slug: "cs101", namespace: "courses" },
        { slug: "week1", namespace: "courses/cs101" },
      ],
      files: [
        { slug: "lecture", namespace: "courses/cs101/week1" },
      ],
    },
  },
  {
    name: "Drop single file at root (no folders)",
    currentPath: [],
    files: [
      { name: "readme.md", relativePath: "readme.md" },
    ],
    expected: {
      folders: [],
      files: [
        { slug: "readme", namespace: "" },
      ],
    },
  },
  {
    name: "Drop folder with page.md index file",
    currentPath: [],
    files: [
      { name: "page.md", relativePath: "guides/page.md" },
      { name: "setup.md", relativePath: "guides/setup.md" },
      { name: "faq.md", relativePath: "guides/faq.md" },
    ],
    expected: {
      folders: [
        { slug: "guides", namespace: "" },
      ],
      files: [
        { slug: "page", namespace: "guides" },
        { slug: "setup", namespace: "guides" },
        { slug: "faq", namespace: "guides" },
      ],
    },
  },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testCase of testCases) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Current path: /${testCase.currentPath.join("/") || "root"}`);
  console.log(`Files to upload: ${testCase.files.length}`);

  const filesWithPaths = testCase.files.map((f) => ({
    file: { name: f.name },
    relativePath: f.relativePath,
  }));

  // Test folder extraction
  console.log("\n🗂️  Testing folder extraction...");
  const extractedFolders = extractFolderPaths(filesWithPaths);
  console.log(`Extracted ${extractedFolders.length} folder(s):`);

  const actualFolders: Array<{ slug: string; namespace: string }> = [];
  for (const folderPath of extractedFolders) {
    const pathParts = folderPath.split("/");
    const slug = pathParts[pathParts.length - 1];
    const namespace = calculateFolderNamespace(testCase.currentPath, folderPath);
    actualFolders.push({ slug, namespace });
    console.log(`  - ${slug} (namespace: "${namespace}")`);
  }

  // Compare folders
  totalTests++;
  let foldersMatch = true;
  if (actualFolders.length !== testCase.expected.folders.length) {
    foldersMatch = false;
  } else {
    for (let i = 0; i < actualFolders.length; i++) {
      if (
        actualFolders[i].slug !== testCase.expected.folders[i].slug ||
        actualFolders[i].namespace !== testCase.expected.folders[i].namespace
      ) {
        foldersMatch = false;
        break;
      }
    }
  }

  if (foldersMatch) {
    console.log("  ✅ Folder structure matches expected");
    passedTests++;
  } else {
    console.log("  ❌ Folder structure doesn't match!");
    console.log("  Expected:");
    testCase.expected.folders.forEach((f) => {
      console.log(`    - ${f.slug} (namespace: "${f.namespace}")`);
    });
    failedTests++;
  }

  // Test file namespace calculation
  console.log("\n📄 Testing file namespace calculation...");
  const actualFiles: Array<{ slug: string; namespace: string }> = [];
  for (const fileInfo of testCase.files) {
    const slug = fileInfo.name.replace(/\.mdx?$/i, "");
    const namespace = calculateFileNamespace(testCase.currentPath, fileInfo.relativePath);
    actualFiles.push({ slug, namespace });
    console.log(`  - ${slug}.md (namespace: "${namespace}")`);
  }

  // Compare files
  totalTests++;
  let filesMatch = true;
  if (actualFiles.length !== testCase.expected.files.length) {
    filesMatch = false;
  } else {
    for (let i = 0; i < actualFiles.length; i++) {
      if (
        actualFiles[i].slug !== testCase.expected.files[i].slug ||
        actualFiles[i].namespace !== testCase.expected.files[i].namespace
      ) {
        filesMatch = false;
        break;
      }
    }
  }

  if (filesMatch) {
    console.log("  ✅ File namespaces match expected");
    passedTests++;
  } else {
    console.log("  ❌ File namespaces don't match!");
    console.log("  Expected:");
    testCase.expected.files.forEach((f) => {
      console.log(`    - ${f.slug}.md (namespace: "${f.namespace}")`);
    });
    failedTests++;
  }

  // Verify UI would display correctly
  console.log("\n🖥️  UI Display Verification:");
  console.log("  Pages that would show these cards:");

  // Check for page.md files
  const hasPageMd = actualFiles.some((f) => f.slug === "page");
  if (hasPageMd) {
    const pageMdNamespace = actualFiles.find((f) => f.slug === "page")?.namespace;
    console.log(`  💡 Note: "page.md" found in namespace "${pageMdNamespace}"`);
    console.log(`      This will display as introductory content at the top of the folder page`);
  }

  // Root page
  const rootFolders = actualFolders.filter((f) => f.namespace === "");
  if (rootFolders.length > 0) {
    console.log(`  - /${testCase.currentPath.join("/")}:`);
    rootFolders.forEach((f) => console.log(`      └─ 📁 ${f.slug}`));
  }

  // Folder pages
  for (const folder of actualFolders) {
    const childFolders = actualFolders.filter((f) =>
      f.namespace === (folder.namespace ? `${folder.namespace}/${folder.slug}` : folder.slug)
    );
    const childFiles = actualFiles.filter((f) =>
      f.namespace === (folder.namespace ? `${folder.namespace}/${folder.slug}` : folder.slug)
    );

    if (childFolders.length > 0 || childFiles.length > 0) {
      const folderPath = folder.namespace ? `${folder.namespace}/${folder.slug}` : folder.slug;
      const fullPath = testCase.currentPath.length > 0
        ? `/${testCase.currentPath.join("/")}/${folderPath}`
        : `/${folderPath}`;
      console.log(`  - ${fullPath}:`);
      childFolders.forEach((f) => console.log(`      └─ 📁 ${f.slug}`));
      childFiles.forEach((f) => console.log(`      └─ 📄 ${f.slug}.md`));
    }
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log("=".repeat(60));

if (failedTests === 0) {
  console.log("\n🎉 ALL TESTS PASSED! The namespace calculation logic is correct.");
  process.exit(0);
} else {
  console.log("\n⚠️  SOME TESTS FAILED! There are issues with the logic.");
  process.exit(1);
}
