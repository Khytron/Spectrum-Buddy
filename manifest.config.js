import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest((env) => {
  const isFirefox = process.env.EXTENSION_TARGET === 'firefox';

  const manifest = {
    manifest_version: 3,
    name: "Spectrum Buddy",
    description: pkg.description,
    version: pkg.version,
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    action: {
      "default_popup": "src/popup/index.html",
      "default_title": "Spectrum Buddy",
      "default_icon": {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    },
    permissions: [
      "storage",
      "alarms",
      "notifications"
    ],
    host_permissions: [
      "https://spectrum.um.edu.my/*"
    ],
    background: isFirefox 
      ? {
          scripts: ["src/background/index.js"],
          type: "module"
        }
      : {
          service_worker: "src/background/index.js",
          type: "module"
        }
  };

  if (isFirefox) {
    manifest.browser_specific_settings = {
      gecko: {
        id: "spectrum-buddy@your-name-or-org.com",
        strict_min_version: "109.0"
      }
    };
  }

  return manifest;
});
