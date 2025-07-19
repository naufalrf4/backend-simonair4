#!/usr/bin/env node

/**
 * Script to update import paths in test files to use '@' aliases
 * 
 * Run with: npx ts-node ./scripts/update-test-imports.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// Define the directories to search
const testDirs = [
  'src/**/*.spec.ts',
  'src/**/*.e2e-spec.ts',
  'test/**/*.ts',
];

// Define the patterns to replace
const importPatterns = [
  {
    from: /from ['"]\.\.\/\.\.\/modules\/([^'"]*)['"];/g,
    to: 'from \'@/modules/$1\';',
  },
  {
    from: /from ['"]\.\.\/modules\/([^'"]*)['"];/g,
    to: 'from \'@/modules/$1\';',
  },
  {
    from: /from ['"]\.\.\/\.\.\/core\/([^'"]*)['"];/g,
    to: 'from \'@/core/$1\';',
  },
  {
    from: /from ['"]\.\.\/core\/([^'"]*)['"];/g,
    to: 'from \'@/core/$1\';',
  },
  {
    from: /from ['"]\.\.\/\.\.\/common\/([^'"]*)['"];/g,
    to: 'from \'@/common/$1\';',
  },
  {
    from: /from ['"]\.\.\/common\/([^'"]*)['"];/g,
    to: 'from \'@/common/$1\';',
  },
  {
    from: /from ['"]\.\.\/\.\.\/config\/([^'"]*)['"];/g,
    to: 'from \'@/config/$1\';',
  },
  {
    from: /from ['"]\.\.\/config\/([^'"]*)['"];/g,
    to: 'from \'@/config/$1\';',
  },
  {
    from: /from ['"]\.\.\/([^/^'"]*)['"];/g,
    to: 'from \'./$1\';', // Don't change imports from parent directory without subdirectory
  },
];

/**
 * Updates imports in a file
 * @param filePath Path to the file
 */
function updateImports(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    
    // Apply all patterns
    for (const pattern of importPatterns) {
      updatedContent = updatedContent.replace(pattern.from, pattern.to);
    }
    
    // Only write back if changes were made
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

/**
 * Process all test files
 */
function processAllFiles(): void {
  console.log('🔍 Searching for test files...');
  
  // Find all test files
  const files = testDirs.flatMap(pattern => glob.sync(pattern));
  
  console.log(`Found ${files.length} test files to process.`);
  
  // Update imports in each file
  for (const file of files) {
    updateImports(file);
  }
  
  console.log('✅ All imports updated!');
}

// Run the script
processAllFiles();
