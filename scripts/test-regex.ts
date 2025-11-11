/**
 * Test the YouTube regex
 */

const text = "{{youtube https://www.youtube.com/watch?v=test}}"

const youtubeRegex = /{{youtube\s+(https?:\/\/[^\s}]+)}}/g

const match = youtubeRegex.exec(text)

console.log('Testing YouTube regex...')
console.log('Input:', text)
console.log('Match:', match)

if (match) {
  console.log('✅ Regex matched!')
  console.log('Full match:', match[0])
  console.log('URL (group 1):', match[1])
} else {
  console.log('❌ Regex did NOT match')
}

// Test the full combined regex
const logseqRegex =
  /==([^=]+)==|\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\[#([ABC])\]|{{embed\s+\[\[([^\]]+)\]\]}}|{{embed\s+\(\(([^)]+)\)\)}}|{{youtube\s+(https?:\/\/[^\s}]+)}}|TODO|DOING|DONE|LATER|NOW|(\w+)::\s*([^\n]+)|([A-Za-z0-9_]+)\^{([^}]+)}|([A-Za-z0-9_]+)_{([^}]+)}/g

const match2 = logseqRegex.exec(text)

console.log('\nTesting combined regex...')
console.log('Match:', match2)

if (match2) {
  console.log('✅ Combined regex matched!')
  console.log('Full match:', match2[0])
  console.log('All groups:', match2)
  // Find which group matched
  for (let i = 1; i < match2.length; i++) {
    if (match2[i]) {
      console.log(`Group ${i}:`, match2[i])
    }
  }
} else {
  console.log('❌ Combined regex did NOT match')
}
