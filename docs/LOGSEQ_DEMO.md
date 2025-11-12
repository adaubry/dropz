---
title: Logseq Features Demo
description: Comprehensive demonstration of all Logseq markdown features
tags: [logseq, markdown, demo]
---

# Logseq Features Demo

This document demonstrates all the Logseq-specific markdown features supported in this application.

## Basic Formatting

Standard markdown formatting works as expected:

- **Bold text** using `**text**`
- *Italic text* using `*text*`
- ~~Strikethrough~~ using `~~text~~`
- ==Highlighted text== using `==text==`
- `Inline code` using backticks

## Headings

Logseq supports six levels of headings:

### Level 3 Heading
#### Level 4 Heading
##### Level 5 Heading
###### Level 6 Heading

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered Lists

1. First item
2. Second item
3. Third item

## Task Management

Logseq provides special task markers:

- TODO This is a todo item
- DOING Currently working on this
- DONE This task is completed
- LATER Do this later
- NOW High priority task

## Priority Tags

You can mark tasks with priority levels:

- [#A] Highest priority task
- [#B] Medium priority task
- [#C] Lower priority task

## Page References

Reference other pages using double brackets:

Check out [[Getting Started]] for more information.
You can also link to [[Another Page]] or [[Project Documentation]].

## Block References

Reference specific blocks using double parentheses:

This is a block that can be referenced ((block-id-12345))
You can embed content from ((another-block-67890))

## Properties

Properties are key-value pairs that provide metadata:

author:: John Doe
date:: 2024-01-15
tags:: demo, logseq, features
status:: published

## Embeds

### Page Embeds

{{embed [[Getting Started]]}}

### Block Embeds

{{embed ((block-id-12345))}}

## YouTube Videos

Embed YouTube videos directly in your content:

{{youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ}}

## Callouts/Admonitions

> [!NOTE]
> This is a note callout. Use it to highlight important information.

> [!TIP]
> This is a tip callout. Share helpful tips and tricks here.

> [!WARNING]
> This is a warning callout. Use it to alert users about potential issues.

> [!IMPORTANT]
> This is an important callout. Highlight critical information that users must know.

> [!CAUTION]
> This is a caution callout. Warn users about potentially dangerous actions.

> [!INFO]
> This is an info callout. Provide additional context and information.

> [!SUCCESS]
> This is a success callout. Celebrate achievements and positive outcomes.

> [!DANGER]
> This is a danger callout. Alert users about serious risks or critical issues.

## Superscript and Subscript

### Superscript

Use superscript for mathematical expressions: E^{mc2}

Or for footnote references: See note^{[1]}

### Subscript

Use subscript for chemical formulas: H_{2}O, CO_{2}

Or for mathematical notation: x_{1}, x_{2}, x_{n}

## Code Blocks

### Inline Code

Use `const x = 10` for inline code snippets.

### Block Code

```javascript
// JavaScript example
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet('World');
```

```python
# Python example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

```typescript
// TypeScript example
interface User {
  id: number;
  name: string;
  email: string;
}

const createUser = (user: User): void => {
  console.log(`Creating user: ${user.name}`);
};
```

## Tables

Tables with GitHub Flavored Markdown support:

| Feature | Status | Priority |
|---------|--------|----------|
| Highlights | ✅ Done | [#A] |
| Page References | ✅ Done | [#A] |
| Task Markers | ✅ Done | [#B] |
| Callouts | ✅ Done | [#B] |
| YouTube Embeds | ✅ Done | [#C] |

## Blockquotes

> This is a standard blockquote.
> It can span multiple lines.
>
> And contain multiple paragraphs.

## Horizontal Rules

You can add horizontal rules to separate content:

---

## Links

- External link: [GitHub](https://github.com)
- Internal page reference: [[Documentation]]
- Link with title: [Click here](https://example.com "Example Website")

## Images

![Sample Image](https://via.placeholder.com/600x400?text=Sample+Image)

## Mixed Content Example

Here's a practical example combining multiple features:

TODO [#A] Review the [[Project Roadmap]] and update priorities

The key metrics for Q1 are:
- Revenue: $1M^{target}
- Users: 10k_{active}
- Growth: ==25% increase==

> [!IMPORTANT]
> Make sure to check ((meeting-notes-123)) before the standup.

**Next steps:**
1. DOING Review documentation
2. TODO Update test coverage
3. LATER Plan for Q2

---

## Conclusion

This demo showcases all the Logseq markdown features now supported in the application. Each feature is styled with modern, beautiful UI components that work seamlessly in both light and dark modes.

For more information, see [[Getting Started]] or watch our tutorial:

{{youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ}}
