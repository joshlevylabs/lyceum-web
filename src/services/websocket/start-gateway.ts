#!/usr/bin/env node

// Start the WebSocket Gateway for Centcom cluster connections
// This should be run as a separate process from the main Next.js app

import './cluster-gateway';

console.log('WebSocket Gateway is running...');
console.log('Press Ctrl+C to stop');

// Keep process alive
process.stdin.resume();
