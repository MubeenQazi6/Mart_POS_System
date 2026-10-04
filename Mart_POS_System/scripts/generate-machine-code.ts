#!/usr/bin/env node

import { getMachineFingerprint } from '../src/main/licensing/machine';
import os from 'node:os';
import crypto from 'node:crypto';

console.log('\n═══════════════════════════════════════════════════════');
console.log('  🔑 MART POS - Machine Code Generator');
console.log('═══════════════════════════════════════════════════════\n');

function generateMachineCode(): string {
  try {
    // Try to use the actual machine fingerprint from the app
    const fingerprint = getMachineFingerprint();
    return fingerprint;
  } catch (error) {
    console.log('⚠️  Using fallback machine code generation...');
    return generateFallbackMachineCode();
  }
}

function generateFallbackMachineCode(): string {
  // Get system information
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const networkInterfaces = os.networkInterfaces();
  
  // Create a unique string from system info
  const systemInfo = [
    hostname,
    platform,
    arch,
    cpus.length,
    cpus[0]?.model || '',
    totalMemory,
    Object.keys(networkInterfaces).join(','),
  ].join('|');
  
  // Create hash
  const hash = crypto.createHash('sha256').update(systemInfo).digest('hex');
  
  // Format as XXXX-XXXX-XXXX-XXXX
  const code = hash.substring(0, 16).toUpperCase();
  return code.replace(/(.{4})/g, '$1-').slice(0, 19);
}

// Generate and display machine code
const machineCode = generateMachineCode();

console.log('📋 Your Machine Code:');
console.log('');
console.log('  ┌─────────────────────────────────────┐');
console.log(`  │   ${machineCode}   │`);
console.log('  └─────────────────────────────────────┘');
console.log('');
console.log('📤 Provide this code to your software provider to generate a license.');
console.log('');
console.log('💻 System Information:');
console.log(`  • Hostname: ${os.hostname()}`);
console.log(`  • Platform: ${os.platform()} ${os.arch()}`);
console.log(`  • CPUs: ${os.cpus().length}`);
console.log(`  • Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
console.log('');

// Save to file
import fs from 'node:fs';
import path from 'node:path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `machine_code_${timestamp}.txt`;
const filePath = path.join(process.cwd(), filename);

const fileContent = `
═══════════════════════════════════════════════════════
  MART POS - Machine Code
═══════════════════════════════════════════════════════

Machine Code: ${machineCode}

Generated: ${new Date().toISOString()}

System Information:
  • Hostname: ${os.hostname()}
  • Platform: ${os.platform()} ${os.arch()}
  • CPUs: ${os.cpus().length}
  • Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB

═══════════════════════════════════════════════════════
`;

fs.writeFileSync(filePath, fileContent, 'utf-8');

console.log(`✅ Machine code saved to: ${filePath}`);
console.log('');
console.log('═══════════════════════════════════════════════════════\n');