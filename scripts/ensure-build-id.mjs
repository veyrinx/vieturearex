import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

try {
  const buildIdPath = join(process.cwd(), '.next', 'BUILD_ID');
  const buildId = readFileSync(buildIdPath, 'utf-8').trim();
  
  if (!buildId) {
    console.error('❌ BUILD_ID is empty');
    process.exit(1);
  }
  
  console.log('✅ BUILD_ID verified:', buildId);
} catch (error) {
  console.error('❌ Error verifying BUILD_ID:', error.message);
  process.exit(1);
}
