# TaskDone

A task management app built with React Native (Expo) and Firebase Firestore.

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** (Create Database → Start in test mode for development)
3. In Project Settings → Your apps, add a web app and copy the config
4. Edit `firebase.js` and replace the placeholder values with your config:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

5. Run `npm install` then `npm start`
