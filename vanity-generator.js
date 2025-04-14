
// Number of workers to use for parallel generation
const NUM_WORKERS = 16;
let activeWorkers = 0;
let foundMatch = false;

// Main function to start the vanity address generator
async function generateVanityAddress(suffix = 'fun') {
  console.log(`Starting vanity address generator. Looking for addresses ending with "${suffix}"...`);
  
  // Create and start workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    createWorker(suffix, i);
  }
  
  // Function to create a worker
  function createWorker(suffix, workerId) {
    activeWorkers++;
    
    const worker = new Worker(new URL('./vanity-worker.js', import.meta.url), { type: 'module' });
    
    // Handle messages from the worker
    worker.onmessage = (event) => {
      const { type, publicKey, privateKey, workerId } = event.data;
      
      if (type === 'found') {
        console.log(`Worker ${workerId} found a match!`);
        console.log(`Public key: ${publicKey}`);
        console.log(`Private key: ${privateKey}`);
        
        // Stop all workers
        foundMatch = true;
        worker.terminate();
        activeWorkers--;
        
        if (activeWorkers === 0) {
          console.log('All workers terminated. Generation complete.');
        }
      } else if (type === 'progress') {
        // Optionally log progress
        console.log(`Worker ${workerId} generated ${event.data.count} keypairs...`);
      }
    };
    
    // Handle errors
    worker.onerror = (error) => {
      console.error(`Worker ${workerId} error:`, error);
      worker.terminate();
      activeWorkers--;
      
      // Restart worker if not found match yet
      if (!foundMatch) {
        createWorker(suffix, workerId);
      }
    };
    
    // Start the worker
    worker.postMessage({ suffix, workerId });
  }
}

// Start the vanity address generator
generateVanityAddress('fun'); 