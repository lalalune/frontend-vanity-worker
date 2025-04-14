#!/usr/bin/env node

import * as ed from '@noble/ed25519';
import bs58 from 'bs58';
import { sha512 } from '@noble/hashes/sha512';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup synchronous methods for noble-ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Configuration
const NUM_WORKERS = 16;
const REPORT_INTERVAL = 100000;

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Variables to track progress
let activeWorkers = 0;
let foundMatch = false;
let startTime = Date.now();
let totalAttempts = 0;

// Parse command line arguments
const args = process.argv.slice(2);
const suffix = args[0] || 'fun';

console.log(`Starting vanity keypair generator. Looking for addresses ending with "${suffix}"...`);
console.log(`Using ${NUM_WORKERS} workers for parallel generation.`);
console.time('Total time');

// Create worker function
function createWorker(workerId) {
  activeWorkers++;
  
  const worker = new Worker(join(__dirname, 'cli-worker.js'), {
    workerData: { workerId, suffix }
  });
  
  worker.on('message', (data) => {
    const { type, publicKey, privateKey, count } = data;
    
    if (type === 'found') {
      console.log(`\nWorker ${workerId} found a match!`);
      console.log(`Public key: ${publicKey}`);
      console.log(`Private key: ${privateKey}`);
      
      // Stop all workers
      foundMatch = true;
      worker.terminate();
      activeWorkers--;
      
      if (activeWorkers === 0) {
        console.timeEnd('Total time');
        process.exit(0);
      }
    } else if (type === 'progress') {
      totalAttempts += count;
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const rate = Math.round(totalAttempts / elapsedSeconds);
      
      process.stdout.write(`\rAttempts: ${totalAttempts.toLocaleString()} (${rate.toLocaleString()}/sec)`);
    }
  });
  
  worker.on('error', (error) => {
    console.error(`\nWorker ${workerId} error:`, error);
    worker.terminate();
    activeWorkers--;
    
    // Restart worker if not found match yet
    if (!foundMatch) {
      createWorker(workerId);
    }
  });
  
  worker.on('exit', (code) => {
    if (!foundMatch && code !== 0) {
      console.log(`\nWorker ${workerId} exited with code ${code}. Restarting...`);
      createWorker(workerId);
    }
  });
}

// Start workers
for (let i = 0; i < NUM_WORKERS; i++) {
  createWorker(i);
}

// Handle process exit
process.on('SIGINT', () => {
  console.log('\nStopping generation...');
  foundMatch = true;
  console.timeEnd('Total time');
  process.exit(0);
}); 