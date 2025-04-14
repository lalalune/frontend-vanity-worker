# Ed25519 Vanity Keypair Generator

This tool generates ed25519 keypairs where the base58-encoded public key ends with a specified suffix (e.g., "fun").

## Features

- Parallel processing with 16 web workers for maximum speed
- Works both in browser and command-line
- Uses the high-performance noble-ed25519 library
- Real-time progress reporting
- Browser-based UI with no server required

## Usage

### Browser Version

1. Open `index.html` in a modern browser
2. Enter your desired suffix (default is "fun")
3. Click "Start Generation"
4. Wait for a matching keypair to be found
5. Copy the public and private keys

### Command-Line Version

```bash
# Install dependencies
npm install @noble/ed25519 bs58 @noble/hashes

# Run with default suffix "fun"
node cli.js

# Or specify a custom suffix
node cli.js custom
```

## How It Works

The generator:

1. Creates multiple web workers to parallelize the process
2. Each worker continually generates random ed25519 keypairs
3. Converts public keys to base58 encoding
4. Checks if the encoded public key ends with the desired suffix
5. Reports when a match is found

## Performance

Performance depends on:
- The length and complexity of your desired suffix
- Your device's CPU capabilities
- The number of workers (configurable in the code)

Longer suffixes will take exponentially more time to find. The probability of finding a specific suffix is approximately:
- 3-character suffix: ~1 in 58³ (195,112) attempts
- 4-character suffix: ~1 in 58⁴ (11,316,496) attempts

## Notes

- Keep the suffix reasonably short to ensure the generator can find a match in a reasonable time
- The keypairs generated are cryptographically secure and can be used with any system that accepts ed25519 keys
- For Solana specifically, these keypairs are compatible with the Solana blockchain

## License

MIT 