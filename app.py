import os
import requests
import logging
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup
import re
import urllib.parse
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Simple in-memory cache for release notes
# Structure: { "data": [...], "timestamp": float }
FEED_CACHE = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION = 600  # 10 minutes

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_content(soup_content):
    """
    Cleans up HTML content extracted from the feed to ensure clean rendering.
    Modifies links to target='_blank' and removes empty paragraphs.
    """
    for a in soup_content.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
        # Convert relative GCP links to absolute
        if a.get('href') and a['href'].startswith('/'):
            a['href'] = 'https://docs.cloud.google.com/' + a['href'].lstrip('/')
            
    # Return string representation of the elements
    return "".join(str(child) for child in soup_content.contents)

def get_text_excerpt(soup_content, max_len=180):
    """
    Extracts a clean text excerpt from the soup content, suitable for a tweet draft.
    """
    text = soup_content.get_text(separator=' ', strip=True)
    # Replace multiple whitespaces/newlines with a single space
    text = re.sub(r'\s+', ' ', text)
    if len(text) <= max_len:
        return text
    
    # Truncate at word boundary
    truncated = text[:max_len]
    last_space = truncated.rfind(' ')
    if last_space > 0:
        return truncated[:last_space] + "..."
    return truncated + "..."

def parse_release_feed(xml_content):
    """
    Parses the BigQuery Release notes Atom XML feed and splits entry contents into individual updates.
    """
    soup = BeautifulSoup(xml_content, 'xml')
    entries = soup.find_all('entry')
    parsed_updates = []

    for entry in entries:
        title = entry.find('title')
        date_str = title.text.strip() if title else "Unknown Date"
        
        updated_elem = entry.find('updated')
        updated_iso = updated_elem.text.strip() if updated_elem else ""
        
        link_elem = entry.find('link')
        base_link = link_elem.get('href', '') if link_elem else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('content')
        if not content_elem:
            continue
            
        content_html_raw = content_elem.text
        content_soup = BeautifulSoup(content_html_raw, 'html.parser')
        
        # We need to slice the entry content by <h3> headers to get individual updates.
        # Often a single day has multiple updates (e.g. <h3>Feature</h3> <p>...</p> <h3>Changed</h3> <p>...</p>).
        
        headers = content_soup.find_all(['h3', 'h4', 'h2'])
        
        if not headers:
            # No headers, treat the entire content as a single update
            excerpt = get_text_excerpt(content_soup)
            html_cleaned = clean_html_content(content_soup)
            update_id = hashlib.md5(f"{date_str}-{excerpt[:30]}".encode('utf-8')).hexdigest()
            
            parsed_updates.append({
                "id": update_id,
                "date": date_str,
                "iso_date": updated_iso,
                "type": "General",
                "content_html": html_cleaned,
                "text": excerpt,
                "link": base_link
            })
        else:
            # Segment the entry by headers
            for i, header in enumerate(headers):
                update_type = header.get_text(strip=True)
                
                # Collect all siblings until the next header
                siblings = []
                curr = header.next_sibling
                while curr and curr not in headers:
                    siblings.append(curr)
                    curr = curr.next_sibling
                
                # Create a mini soup for this update
                update_soup = BeautifulSoup("", "html.parser")
                for sib in siblings:
                    # Append a copy of the element
                    import copy
                    update_soup.append(copy.copy(sib))
                
                excerpt = get_text_excerpt(update_soup)
                html_cleaned = clean_html_content(update_soup)
                
                # If there's no actual content inside the update, skip
                if not excerpt or excerpt.strip() == "...":
                    continue
                
                # Format specific anchor link if we have a type
                anchor_suffix = update_type.lower().replace(' ', '_')
                specific_link = f"{base_link}_{anchor_suffix}" if '#' in base_link else f"{base_link}#{date_str.replace(' ', '_')}_{anchor_suffix}"
                
                update_id = hashlib.md5(f"{date_str}-{update_type}-{excerpt[:30]}".encode('utf-8')).hexdigest()
                
                parsed_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "iso_date": updated_iso,
                    "type": update_type,
                    "content_html": html_cleaned,
                    "text": excerpt,
                    "link": specific_link
                })
                
    return parsed_updates

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    import time
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    
    current_time = time.time()
    if not force_refresh and FEED_CACHE["data"] and (current_time - FEED_CACHE["timestamp"] < CACHE_DURATION):
        logger.info("Serving release notes from memory cache.")
        return jsonify({
            "status": "success",
            "source": "cache",
            "data": FEED_CACHE["data"]
        })
        
    try:
        logger.info(f"Fetching release notes feed from {FEED_URL}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        parsed_data = parse_release_feed(response.text)
        
        # Update cache
        FEED_CACHE["data"] = parsed_data
        FEED_CACHE["timestamp"] = current_time
        
        logger.info(f"Successfully fetched and parsed {len(parsed_data)} updates.")
        return jsonify({
            "status": "success",
            "source": "network",
            "data": parsed_data
        })
    except Exception as e:
        logger.error(f"Error fetching release notes: {str(e)}")
        # If network call fails but we have cached data, return cached data with warning
        if FEED_CACHE["data"]:
            return jsonify({
                "status": "warning",
                "message": f"Could not refresh feed: {str(e)}. Showing cached data.",
                "source": "cache_fallback",
                "data": FEED_CACHE["data"]
            })
            
        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Run Flask application on port 8080
    app.run(host='0.0.0.0', port=8080, debug=True)
