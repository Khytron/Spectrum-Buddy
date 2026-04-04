import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('dist/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Firefox requires 'scripts' instead of 'service_worker' in many cases for MV3
// and strictly requires an ID in browser_specific_settings
if (manifest.background && manifest.background.service_worker) {
  manifest.background.scripts = [manifest.background.service_worker];
  // Keep service_worker for Chrome compatibility if needed, 
  // but Firefox might complain if both are present in some versions.
  // However, the linter asked for both.
}

// Ensure browser_specific_settings is present
if (!manifest.browser_specific_settings) {
  manifest.browser_specific_settings = {
    gecko: {
      id: "spectrum-buddy@your-name-or-org.com",
      strict_min_version: "140.0" 
    }
  };
} else {
  manifest.browser_specific_settings.gecko.strict_min_version = "140.0";
}

// Mozilla strictly requires this for all new MV3 submissions (as of Nov 2025).
// If no data is collected, 'required' must be an array containing the string "none".
manifest.browser_specific_settings.gecko.data_collection_permissions = {
  required: ["none"]
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ Manifest patched for Firefox');
