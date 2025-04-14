import * as ed from '@noble/ed25519';
import bs58 from 'bs58';
import { sha512 } from '@noble/hashes/sha512';
import { parentPort, workerData } from 'worker_threads';

// Setup synchronous methods for noble-ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Configuration
const REPORT_INTERVAL = 100000;

// Extract data from workerData
const { workerId, suffix } = workerData;

// Start keypair generation
async function generateVanityKeypair() {
  let count = 0;

  try {
    while (true) {
      // Generate a random private key
      const privateKey = ed.utils.randomPrivateKey();
      
      // Get the public key (using sync method for better performance)
      const publicKey = ed.getPublicKey(privateKey);
      
      // Encode to base58
      const publicKeyBs58 = bs58.encode(publicKey);
      
      // Check if the public key ends with the desired suffix
      if (publicKeyBs58.endsWith(suffix)) {
        // We found a match!
        parentPort.postMessage({
          type: 'found',
          publicKey: publicKeyBs58,
          privateKey: bs58.encode(privateKey)
        });
        
        break; // Exit the loop
      }
      
      count++;
      
      // Report progress periodically
      if (count % REPORT_INTERVAL === 0) {
        parentPort.postMessage({
          type: 'progress',
          count: REPORT_INTERVAL
        });
        
        // Reset count to avoid going too high
        count = 0;
      }
    }
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: error.message
    });
    
    process.exit(1);
  }
}

// Start the generator
generateVanityKeypair(); 