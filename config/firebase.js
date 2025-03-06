import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize the serviceAccount variable
let serviceAccount;

async function loadServiceAccount() {
  if (process.env.NODE_ENV === 'production') {
    // In production, load from the file path where Render stores the service account JSON
    try {
      const filePath = path.resolve('/etc/secrets/firebase-service-account.json'); // Set the correct path
      const fileData = fs.readFileSync(filePath, 'utf8');
      serviceAccount = JSON.parse(fileData);
    } catch (error) {
      console.error('Failed to load the service account:', error);
    }
  } else {
    // In development, use a local JSON file as fallback
    try {
      const filePath = path.resolve('./config/firebase-service-account.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      serviceAccount = JSON.parse(fileData);
    } catch (error) {
      console.error('Failed to load the service account:', error);
    }
  }
}

// Load service account and initialize Firebase Admin
loadServiceAccount().then(() => {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('Service account not loaded.');
  }
});

export default admin;
