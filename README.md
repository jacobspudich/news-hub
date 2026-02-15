# NewsHub

A modern, feature-rich news aggregator that pulls stories from major news outlets including NY Times, The Guardian, CNN, Reuters, ESPN, WSJ, and more.

## Features

- 📰 **Multi-Source Aggregation** - Stories from 10+ major news outlets
- 📊 **Category Sections** - Politics, Business, Technology, Sports, World, Health, Science, Entertainment, Lifestyle
- 🌙 **Dark Mode** - Easy on the eyes
- 📖 **Reading Tracker** - Track daily reading goals and maintain reading streaks
- 🔖 **Bookmarks** - Save articles for later
- 📜 **Reading History** - View your reading history
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎯 **Daily Briefing** - Curated top 10 stories across all categories
- 🔄 **Manual Refresh** - Control when you use API calls
- 📊 **Trending Topics** - See what's being covered most
- 🎨 **Grid/List Toggle** - Choose your preferred layout
- ⚙️ **Customizable** - Adjust font size, hide categories, set reading goals

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/newshub.git
cd newshub
```

### 2. Set up API keys

Copy the example config file:
```bash
cp config.example.js config.js
```

Edit `config.js` and add your API keys:

#### Get API Keys:
- **NY Times API**: https://developer.nytimes.com/
- **NewsAPI**: https://newsapi.org/
- **Guardian API**: https://open-platform.theguardian.com/

### 3. Open in browser

Simply open `index.html` in your web browser.
Or use a local server:
```bash
# With Python
python -m http.server 8000

# With Node.js (http-server)
npx http-server

# With VS Code Live Server extension
Right-click index.html → Open with Live Server
```

## Usage

- **Browse News**: Scroll through categorized sections
- **Filter**: Click category tabs to jump to specific sections
- **Read**: Click any story to open in new tab (auto-tracks as read)
- **Bookmark**: Click ★ button on stories
- **Share**: Click ↗ button to share
- **Menu**: Click "MENU" for settings, saved articles, history, dark mode, layout toggle
- **Refresh**: Click "REFRESH" to manually update feeds (rate-limited to prevent API overuse)

## Tech Stack

- Pure HTML, CSS, and JavaScript
- No build tools or dependencies required
- Uses localStorage for persistent data
- Responsive design with CSS Grid

## API Rate Limits

- **NewsAPI Free Tier**: 100 requests/day
- **NY Times**: 500 requests/day  
- **Guardian**: 5000 requests/day

The app includes a 60-second cooldown on manual refresh to prevent hitting rate limits.

## Features in Detail

### Reading Goals
Set a daily article reading goal (default: 10). Track your progress and maintain reading streaks!

### Daily Briefing
Get a curated briefing of the top 10 stories across all categories - perfect for staying informed quickly.

### Offline Mode
The app detects when you're offline and shows cached stories. When you reconnect, it automatically refreshes.

### Customization
- Toggle between grid and list views
- Adjust font size (small/medium/large)
- Hide categories you don't care about
- Set custom daily reading goals

## License

MIT

## Contributing

Pull requests welcome! Feel free to suggest new features or improvements.