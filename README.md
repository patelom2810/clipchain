# 📋 ClipChain - Online Clipboard

ClipChain is a modern, real-time clipboard synchronization tool designed to make sharing text between devices seamless and secure. Built with a beautiful glassmorphic UI, it allows you to instantly sync text, links, and code snippets across any device with a web browser.

## ✨ Features

- **⚡ Real-Time Synchronization**: Instantly syncs text across all connected devices using Firebase Realtime Database.
- **🔒 Security First**:
  - **Password Protection**: Lock your clipboard rooms with a password.
  - **Self-Destruct Timer**: Set an expiration time (10m, 1h, 24h) for your clips to automatically delete.
- **🎨 Stunning UI**:
  - **Glassmorphism Design**: Modern, translucent aesthetics.
  - **Theming**: Beautiful Light (blue-sky) and Dark (starry-night) modes with toggle animations.
  - **Responsive**: Works perfectly on mobile, tablet, and desktop.
- **📝 Live Editor**:
  - **Markdown Support**: Toggle between raw text and rendered Markdown preview.
  - **Search**: Built-in find-in-text functionality with highlighting.
  - **Syntax Highlighting**: (For Markdown preview).
- **🔗 Easy Connection**:
  - **Custom URLs**: Create your own unique clipboard ID (e.g., `clipchain/my-id`).
  - **QR Code**: Generate a QR code to instantly connect your mobile device.
- **📜 Smart History**: Keeps track of your recent clips locally so you never lose important text.
- **📤 Sharing**: Built-in share button for native sharing capabilities.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (CDN)
- **Backend/Database**: [Firebase Realtime Database](https://firebase.google.com/)
- **Libraries**:
  - [Lucide Icons](https://lucide.dev/) (Icons)
  - [Marked.js](https://marked.js.org/) (Markdown parsing)
  - [QRCode.js](https://github.com/davidshimjs/qrcodejs) (QR Code generation)
  - [EmailJS](https://www.emailjs.com/) (Feedback form)

## 🚀 Getting Started

Since ClipChain is built with vanilla web technologies, running it is incredibly simple.

### Prerequisites

- A modern web browser.
- A code editor (VS Code recommended).

### Installation

1.  **Clone the repository** (or download usage files):
    ```bash
    git clone https://github.com/yourusername/ClipChain.git
    cd ClipChain
    ```

2.  **Run the project**:
    - You can simply open `index.html` in your browser.
    - **Recommended**: Use a local server (like Live Server in VS Code) for the best experience.

### Configuration

The project uses Firebase for the backend. The configuration is located in `script.js`.

**Note**: The current configuration is set to a public demo instance. For production use, you should create your own Firebase project:

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Set up **Realtime Database**.
4.  Update the `firebaseConfig` object in `script.js` with your own credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 🎮 Usage

1.  **Open the App**: Navigate to the URL. A random ID is generated for you, or enter a custom one.
2.  **Sync Text**: Type in the main text area. The content syncs immediately to anyone else on the same ID.
3.  **Lock It**: Click the "Set Password" button to secure your room.
4.  **Connect Mobile**: Click the "QR Code" button and scan it with your phone to jump into the same session.

## 📄 License

This project is open source and available for personal and educational use.
