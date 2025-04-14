import * as ed from '@noble/ed25519';
import { encode } from 'bs58';
import { sha512 } from '@noble/hashes/sha512';

// Setup synchronous methods for noble-ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Report progress after this many attempts
const REPORT_INTERVAL = 10000;

// Worker function to generate keypairs
self.onmessage = async (event) => {
  const { suffix, workerId } = event.data;
  let count = 0;
  
  // Enable synchronous methods for better performance
  try {
    while (true) {
      // Generate a random private key
      const privateKey = ed.utils.randomPrivateKey();
      
      // Get the public key
      const publicKey = ed.getPublicKey(privateKey);
      
      // Encode to base58
      const publicKeyBs58 = encode(publicKey);
      
      // Check if the public key ends with the desired suffix
      if (publicKeyBs58.endsWith(suffix)) {
        // We found a match!
        self.postMessage({
          type: 'found',
          workerId,
          publicKey: publicKeyBs58,
          privateKey: encode(privateKey)
        });
        
        break; // Exit the loop
      }
      
      count++;
      
      // Report progress periodically
      if (count % REPORT_INTERVAL === 0) {
        self.postMessage({
          type: 'progress',
          workerId,
          count
        });
      }
    }
  } catch (error) {
    console.error(`Worker ${workerId} encountered an error:`, error);
    self.postMessage({
      type: 'error',
      workerId,
      error: error.message
    });
  }
}; 