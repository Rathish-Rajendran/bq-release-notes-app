# BigQuery Release Explorer

An interactive web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches the official Google Cloud BigQuery Release notes, segments them into granular items, and lets you search, filter, and Tweet about them.

---

## ✨ Features

- **Granular Update Segmentation**: Splits coarse day-level release entries into individual updates grouped by type (`Feature`, `Announcement`, `Changed`, `Deprecated`, `Fix`).
- **Server-Side Cache**: Employs an in-memory caching system (10-minute duration) to avoid hitting Google's RSS endpoints repeatedly. Includes a forced-refresh capability to query live feed updates.
- **Client-Side Live Indexing**: Fast text search and category counts update automatically as you type.
- **Modern Premium Dark UI**: High-fidelity dark mode styling utilizing glassmorphism, glowing accents, responsive grids, and micro-interactions.
- **Custom Tweet Composer Modal**: Pre-fills Tweet drafts with note content, tracks character limits (280 max), provides quick-add hashtags, and forwards drafts safely to X (Twitter).
- **Toast Notifications & Copy-to-Clipboard**: Copy direct anchor links to specific release items with visual feedback.
- **Skeleton Screen Loaders**: Displays placeholder cards with a pulsing shimmer during page loads and updates.

---

## 🏗️ Directory Structure

```
bq-releases-notes/
├── app.py               # Flask application server & XML parser
├── requirements.txt     # Python package dependencies
├── .gitignore           # Git ignore rule specifications
├── templates/
│   └── index.html       # Single-page HTML template layout
└── static/
    ├── css/
    │   └── style.css    # Responsive styles & animations
    └── js/
        └── main.js      # State controller & Twitter composer
```

---

## 🚀 Installation & Local Setup

### 1. Prerequisite
Ensure you have **Python 3.8+** installed on your system.

### 2. Clone/Navigate to folder
```bash
cd bq-releases-notes
```

### 3. Create & Activate Virtual Environment
```bash
# Create venv
python3 -m venv venv

# Activate on macOS/Linux
source venv/bin/activate

# Activate on Windows
# .\venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## ⚡ Running the Application

Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to:  
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🛠️ API Endpoints

### `GET /`
Renders the single-page application dashboard interface.

### `GET /api/release-notes`
Fetches and segments the BigQuery release feed.
- **Query Parameters**:
  - `force=true` (Optional): Bypasses the server memory cache and forces a live XML download from Google.
- **Response Format**:
  ```json
  {
    "status": "success",
    "source": "network | cache",
    "data": [
      {
        "id": "md5-unique-id",
        "date": "June 17, 2026",
        "iso_date": "2026-06-17T00:00:00-07:00",
        "type": "Feature",
        "content_html": "<p>Content with target='_blank' links...</p>",
        "text": "Plain text excerpt under 180 chars for drafts...",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026_feature"
      }
    ]
  }
  ```
