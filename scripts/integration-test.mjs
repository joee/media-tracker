#!/usr/bin/env node
/**
 * Integration Test - Verifies the dev server starts and home page loads
 * Catches any configuration, build, or runtime errors
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

let serverProcess = null;
let testFailed = false;

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  testFailed = true;
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

async function cleanup() {
  if (serverProcess) {
    info('Shutting down dev server...');
    serverProcess.kill('SIGTERM');
    await sleep(1000);
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
  }
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(1);
});

async function runIntegrationTest() {
  console.log('\n🧪 Running Integration Test\n');
  console.log('━'.repeat(60));

  // Step 1: Start the dev server
  info('Starting Vite dev server...');

  return new Promise((resolve) => {
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
    });

    let serverOutput = '';
    let serverUrl = null;
    let hasError = false;
    let errorDetails = '';
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;

      // Parse the actual server URL (could be any port)
      const localMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (localMatch) {
        serverUrl = localMatch[1];
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      serverOutput += errorOutput;

      // Check for critical error patterns
      const criticalErrors = [
        'Cannot find module',
        'Failed to load PostCSS',
        'Failed to load',
        'Error: ',
        'ENOENT',
        'Module not found',
        'SyntaxError',
      ];

      for (const pattern of criticalErrors) {
        if (errorOutput.includes(pattern)) {
          hasError = true;
          errorDetails += errorOutput;
          break;
        }
      }
    });

    serverProcess.on('error', (err) => {
      error(`Failed to start dev server: ${err.message}`);
      hasError = true;
      errorDetails = err.message;
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null && !signal) {
        hasError = true;
        errorDetails = `Process exited with code ${code}`;
      }
    });

    // Wait for server to be ready or timeout/error
    const checkInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      if (hasError) {
        clearInterval(checkInterval);
        error('Dev server encountered errors during startup');
        console.log('\n' + colors.red + 'Error Details:' + colors.reset);
        console.log(errorDetails || serverOutput);

        // Extract specific fix suggestions
        if (errorDetails.includes('Cannot find module') || errorDetails.includes('@tailwindcss/postcss')) {
          console.log('\n' + colors.yellow + 'Fix:' + colors.reset + ' Run: npm install');
        }

        await cleanup();
        resolve(false);
        return;
      }

      if (serverUrl) {
        clearInterval(checkInterval);
        success(`Dev server started successfully at ${serverUrl}`);

        // Step 2: Test HTTP connection
        await sleep(500); // Give server a moment to fully initialize
        const httpTestPassed = await testHttpConnection(serverUrl);

        await cleanup();
        resolve(httpTestPassed);
        return;
      }

      if (elapsed > timeout) {
        clearInterval(checkInterval);
        error('Dev server startup timeout (30s)');
        console.log('\n' + colors.yellow + 'Server output:' + colors.reset);
        console.log(serverOutput);
        await cleanup();
        resolve(false);
      }
    }, 200);
  });
}

async function testHttpConnection(serverUrl) {
  info(`Testing HTTP connection to ${serverUrl}...`);

  try {
    const response = await fetch(serverUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      error(`HTTP request failed with status ${response.status}`);
      return false;
    }

    success('HTTP connection successful');

    // Step 3: Validate response
    info('Validating page content...');
    const html = await response.text();

    // Check for basic expected content
    const checks = [
      { name: 'Has root div', test: html.includes('<div id="root">') },
      { name: 'Includes main script', test: html.includes('src/main.tsx') },
      { name: 'Has viewport meta', test: html.includes('viewport') },
      { name: 'Title is set', test: html.includes('Kids Media Tracker') },
    ];

    let allChecksPassed = true;
    for (const check of checks) {
      if (check.test) {
        success(check.name);
      } else {
        error(check.name);
        allChecksPassed = false;
      }
    }

    // Check for error indicators in HTML
    const errorIndicators = [
      {
        name: 'No compilation errors',
        test: !html.toLowerCase().includes('failed to compile'),
      },
      {
        name: 'No module errors',
        test: !(html.includes('Cannot find module') || html.includes('Module not found')),
      },
      {
        name: 'No PostCSS errors',
        test: !(html.includes('PostCSS') && html.includes('Error')),
      },
      {
        name: 'No syntax errors',
        test: !html.includes('SyntaxError'),
      },
    ];

    for (const check of errorIndicators) {
      if (check.test) {
        success(check.name);
      } else {
        error(check.name);
        allChecksPassed = false;
      }
    }

    if (!allChecksPassed) {
      console.log('\n' + colors.yellow + 'Page HTML (first 1500 chars):' + colors.reset);
      console.log(html.substring(0, 1500));
    }

    return allChecksPassed;

  } catch (err) {
    error(`HTTP request failed: ${err.message}`);

    if (err.message.includes('ECONNREFUSED')) {
      info('Server may not be listening on expected port');
    } else if (err.name === 'AbortError') {
      info('Request timed out - server may be unresponsive');
    }

    return false;
  }
}

// Run the test
runIntegrationTest()
  .then((passed) => {
    console.log('\n' + '━'.repeat(60));

    if (passed) {
      console.log(`${colors.green}✅ Integration test PASSED${colors.reset}`);
      console.log('The dev server starts correctly and serves the home page.\n');
      process.exit(0);
    } else {
      console.log(`${colors.red}❌ Integration test FAILED${colors.reset}`);
      console.log('\nCommon fixes:');
      console.log('  1. Run: npm install');
      console.log('  2. Run: npm run validate');
      console.log('  3. Check for missing dependencies in package.json');
      console.log('  4. Verify node_modules/@tailwindcss/postcss exists');
      console.log('  5. Clear node_modules and reinstall: rm -rf node_modules && npm install\n');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(`${colors.red}Test error:${colors.reset}`, err);
    cleanup();
    process.exit(1);
  });
