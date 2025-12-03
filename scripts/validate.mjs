#!/usr/bin/env node
/**
 * Configuration Validator for Kids Media Tracker
 * Checks for common setup issues before running the app
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

let hasErrors = false;
let hasWarnings = false;

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  hasErrors = true;
}

function warning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  hasWarnings = true;
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function checkFile(path, description) {
  if (existsSync(path)) {
    success(`${description} exists`);
    return true;
  } else {
    error(`${description} not found at ${path}`);
    return false;
  }
}

console.log('\n🔍 Validating project configuration...\n');

// Check required files
console.log('📁 Required Files:');
checkFile(join(rootDir, 'package.json'), 'package.json');
checkFile(join(rootDir, 'vite.config.ts'), 'vite.config.ts');
checkFile(join(rootDir, 'tsconfig.json'), 'tsconfig.json');
checkFile(join(rootDir, 'postcss.config.js'), 'postcss.config.js');
checkFile(join(rootDir, 'tailwind.config.js'), 'tailwind.config.js');
checkFile(join(rootDir, 'index.html'), 'index.html');
checkFile(join(rootDir, 'src/main.tsx'), 'src/main.tsx');
checkFile(join(rootDir, 'src/index.css'), 'src/index.css');
console.log();

// Check package.json dependencies
console.log('📦 Checking Dependencies:');
const packageJsonPath = join(rootDir, 'package.json');
if (existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Check for @tailwindcss/postcss
  if (deps['tailwindcss']) {
    const tailwindVersion = deps['tailwindcss'];
    if (tailwindVersion.startsWith('^4') || tailwindVersion.startsWith('4')) {
      if (deps['@tailwindcss/postcss']) {
        success('Tailwind CSS v4 with @tailwindcss/postcss installed');
      } else {
        error('Tailwind CSS v4 requires @tailwindcss/postcss package');
        info('Run: npm install @tailwindcss/postcss');
      }
    } else {
      warning(`Using Tailwind CSS ${tailwindVersion} (not v4)`);
    }
  }

  // Check for required packages
  const required = ['react', 'react-dom', 'vite', 'typescript', 'yjs', 'y-indexeddb', 'zustand'];
  required.forEach((pkg) => {
    if (deps[pkg]) {
      success(`${pkg} installed`);
    } else {
      error(`Missing required package: ${pkg}`);
    }
  });
}
console.log();

// Check PostCSS configuration
console.log('⚙️  Checking PostCSS Configuration:');
const postcssConfigPath = join(rootDir, 'postcss.config.js');
if (existsSync(postcssConfigPath)) {
  const postcssConfig = readFileSync(postcssConfigPath, 'utf8');

  if (postcssConfig.includes('@tailwindcss/postcss')) {
    success('PostCSS configured for Tailwind CSS v4');
  } else if (postcssConfig.includes('tailwindcss')) {
    error('PostCSS using old tailwindcss plugin (should use @tailwindcss/postcss for v4)');
    info('Update postcss.config.js to use "@tailwindcss/postcss" plugin');
  } else {
    warning('No Tailwind CSS plugin found in PostCSS config');
  }
}
console.log();

// Check CSS imports
console.log('🎨 Checking CSS Configuration:');
const indexCssPath = join(rootDir, 'src/index.css');
if (existsSync(indexCssPath)) {
  const indexCss = readFileSync(indexCssPath, 'utf8');

  if (indexCss.includes('@import "tailwindcss"')) {
    success('CSS using Tailwind CSS v4 import syntax');
  } else if (indexCss.includes('@tailwind')) {
    error('CSS using old @tailwind directives (should use @import for v4)');
    info('Update src/index.css to: @import "tailwindcss";');
  } else {
    warning('No Tailwind CSS imports found in CSS');
  }
}
console.log();

// Check node_modules
console.log('📚 Checking Installation:');
if (existsSync(join(rootDir, 'node_modules'))) {
  success('node_modules directory exists');

  // Check for specific critical modules
  const criticalModules = ['vite', 'react', 'yjs'];
  criticalModules.forEach((mod) => {
    if (existsSync(join(rootDir, 'node_modules', mod))) {
      success(`${mod} module installed`);
    } else {
      error(`${mod} module not found in node_modules`);
    }
  });
} else {
  error('node_modules not found');
  info('Run: npm install');
}
console.log();

// Summary
console.log('━'.repeat(60));
if (hasErrors) {
  console.log(`${colors.red}❌ Validation FAILED${colors.reset} - Please fix the errors above\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}⚠️  Validation passed with warnings${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.green}✅ All checks passed!${colors.reset} Ready to run the app.\n`);
  process.exit(0);
}
