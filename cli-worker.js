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

// Function to validate a keypair
function validateKeypair(privateKey, publicKey, secretKey) {
  try {
    // Verify that the private key derives the correct public key
    const derivedPublicKey = ed.getPublicKey(privateKey);
    const publicKeyMatch = Buffer.from(derivedPublicKey).equals(Buffer.from(publicKey));
    
    // Verify the 64-byte secret key has correct format [privateKey|publicKey]
    const privateKeyPart = secretKey.slice(0, 32);
    const publicKeyPart = secretKey.slice(32, 64);
    
    const privateKeyMatch = Buffer.from(privateKeyPart).equals(Buffer.from(privateKey));
    const publicKeyPartMatch = Buffer.from(publicKeyPart).equals(Buffer.from(publicKey));
    
    return publicKeyMatch && privateKeyMatch && publicKeyPartMatch;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

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
        
        // Construct the 64-byte secret key for Solana compatibility
        const secretKey = new Uint8Array(64);
        secretKey.set(privateKey);
        secretKey.set(publicKey, 32);
        const secretKeyBs58 = bs58.encode(secretKey);
        
        // Validate the keypair before reporting
        const isValid = validateKeypair(privateKey, publicKey, secretKey);
        
        if (!isValid) {
          console.error(`Worker ${workerId} found invalid keypair. Continuing search...`);
          count++;
          continue;
        }
        
        parentPort.postMessage({
          type: 'found',
          publicKey: publicKeyBs58,
          privateKey: secretKeyBs58,
          validated: true
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