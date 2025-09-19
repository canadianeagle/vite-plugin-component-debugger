// scripts/pre-publish.js
// #!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-publish checks...\n');

const checks = {
  'NPM Login': () => {
    try {
      const user = execSync('npm whoami', { encoding: 'utf-8' }).trim();
      return { success: true, message: `Logged in as: ${user}` };
    } catch {
      return { success: false, message: 'Not logged in. Run: npm login' };
    }
  },

  'Package Name Available': () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    try {
      execSync(`npm view ${pkg.name} version`, { stdio: 'ignore' });
      return { 
        success: false, 
        message: `Package "${pkg.name}" already exists. Current version: ${execSync(`npm view ${pkg.name} version`, { encoding: 'utf-8' }).trim()}` 
      };
    } catch {
      return { success: true, message: `Package name "${pkg.name}" is available` };
    }
  },

  'Required Files': () => {
    const required = ['README.md', 'LICENSE', 'package.json', 'dist/index.js', 'dist/index.mjs', 'dist/index.d.ts'];
    const missing = required.filter(file => !fs.existsSync(file));
    
    if (missing.length > 0) {
      return { success: false, message: `Missing files: ${missing.join(', ')}` };
    }
    return { success: true, message: 'All required files present' };
  },

  'Tests': () => {
    try {
      execSync('npm test', { stdio: 'ignore' });
      return { success: true, message: 'All tests passed' };
    } catch {
      return { success: false, message: 'Tests failed. Run: npm test' };
    }
  },

  'Build': () => {
    try {
      console.log('  Building package...');
      execSync('npm run build', { stdio: 'ignore' });
      return { success: true, message: 'Build successful' };
    } catch {
      return { success: false, message: 'Build failed. Run: npm run build' };
    }
  },

  'Git Status': () => {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      if (status) {
        return { success: false, message: 'Uncommitted changes. Commit or stash first.' };
      }
      return { success: true, message: 'Working directory clean' };
    } catch {
      return { success: false, message: 'Not a git repository' };
    }
  },

  'Package Size': () => {
    try {
      execSync('npm pack --dry-run', { stdio: 'pipe' });
      const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
      const sizeMatch = output.match(/size: (\d+(\.\d+)?[KM]?B)/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      
      // Get file list
      const filesMatch = output.match(/npm notice === Tarball Contents ===([\s\S]*?)npm notice ===/);
      const fileCount = filesMatch ? filesMatch[1].trim().split('\n').length : 0;
      
      return { success: true, message: `Package size: ${size}, Files: ${fileCount}` };
    } catch (e) {
      return { success: false, message: 'Could not determine package size' };
    }
  },

  'Version': () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    return { success: true, message: `Current version: ${pkg.version}` };
  }
};

let allPassed = true;

Object.entries(checks).forEach(([name, check]) => {
  process.stdout.write(`✓ ${name}... `);
  const result = check();
  
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.log(`❌ ${result.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! Ready to publish.');
  console.log('\nTo publish, run:');
  console.log('  npm publish');
  console.log('\nFor scoped packages:');
  console.log('  npm publish --access public');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}

// Show what will be published
console.log('\n📦 Files to be published:');
try {
  const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
  const filesMatch = output.match(/npm notice === Tarball Contents ===([\s\S]*?)npm notice ===/);
  if (filesMatch) {
    console.log(filesMatch[1].trim());
  }
} catch (e) {
  console.log('Could not list files');
}