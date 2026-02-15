// State management
let allStories = [];
let currentCategory = 'all';
let readStories = new Set();
let bookmarkedStories = new Set();
let readHistory = [];
let dailyGoal = 10;
let hiddenCategories = new Set();
let errors = [];
let layoutMode = 'grid';
let isOnline = navigator.onLine;
let isRefreshing = false;
let lastRefreshTime = null;

// Utility functions
function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', options);
}

function formatTime(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function estimateReadTime(text) {
    const words = text.split(' ').length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
}

function getOutletColor(sourceName) {
    const outlet = outlets.find(o => o.name === sourceName);
    return outlet ? outlet.color : '#666666';
}

function getOutletInitials(sourceName) {
    if (sourceName === 'NY Times') return 'NYT';
    if (sourceName === 'The Guardian') return 'TG';
    if (sourceName === 'AP News') return 'AP';
    const words = sourceName.split(' ');
    if (words.length > 1) {
        return words.map(w => w[0]).join('');
    }
    return sourceName.substring(0, 3).toUpperCase();
}

// Toast notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Error handling
function showError(message) {
    const container = document.getElementById('errorContainer');
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    container.appendChild(error);
    setTimeout(() => error.remove(), 5000);
}

// Offline detection
window.addEventListener('online', () => {
    isOnline = true;
    const badge = document.querySelector('.offline-badge');
    if (badge) badge.remove();
    showToast('Back online! Refreshing news...');
    fetchAllFeeds();
});

window.addEventListener('offline', () => {
    isOnline = false;
    const badge = document.createElement('div');
    badge.className = 'offline-badge';
    document.body.appendChild(badge);
    showToast('You are offline. Showing cached stories.');
});

// Settings management
function loadSettings() {
    const settings = localStorage.getItem('newsHubSettings');
    if (settings) {
        const parsed = JSON.parse(settings);
        dailyGoal = parsed.dailyGoal || 10;
        hiddenCategories = new Set(parsed.hiddenCategories || []);
        layoutMode = parsed.layoutMode || 'grid';
        document.body.className = `font-${parsed.fontSize || 'medium'}`;
        if (parsed.darkMode) {
            document.body.classList.add('dark-mode');
        }
    }
    updateNavVisibility();
}

function saveSettings() {
    const fontSize = document.body.className.match(/font-(\w+)/)?.[1] || 'medium';
    const darkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('newsHubSettings', JSON.stringify({
        dailyGoal,
        fontSize,
        darkMode,
        layoutMode,
        hiddenCategories: Array.from(hiddenCategories)
    }));
}

function updateNavVisibility() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const cat = item.dataset.category;
        if (cat !== 'all' && hiddenCategories.has(cat)) {
            item.classList.add('hidden');
        } else {
            item.classList.remove('hidden');
        }
    });
}

// Reading tracking
function loadReadStories() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('readStories');
    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            readStories = new Set(data.stories);
        } else {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (data.date !== yesterday) {
                localStorage.setItem('readingStreak', '0');
            } else if (data.stories.length >= (data.goal || 10)) {
                const streak = parseInt(localStorage.getItem('readingStreak') || '0') + 1;
                localStorage.setItem('readingStreak', streak.toString());
            }
            localStorage.removeItem('readStories');
            readStories = new Set();
        }
    }
    
    const bookmarks = localStorage.getItem('bookmarkedStories');
    if (bookmarks) {
        bookmarkedStories = new Set(JSON.parse(bookmarks));
    }
    
    const history = localStorage.getItem('readingHistory');
    if (history) {
        readHistory = JSON.parse(history);
    }
}

function saveReadStories() {
    const today = new Date().toDateString();
    localStorage.setItem('readStories', JSON.stringify({
        date: today,
        stories: Array.from(readStories),
        goal: dailyGoal
    }));
}

function markAsRead(storyUrl, storyTitle, storySource) {
    readStories.add(storyUrl);
    saveReadStories();
    
    readHistory.unshift({
        url: storyUrl,
        title: storyTitle,
        source: storySource,
        timestamp: Date.now()
    });
    
    readHistory = readHistory.slice(0, 50);
    localStorage.setItem('readingHistory', JSON.stringify(readHistory));
    
    updateReadingProgress();
}

function toggleBookmark(storyUrl, storyTitle, storySource) {
    if (bookmarkedStories.has(storyUrl)) {
        bookmarkedStories.delete(storyUrl);
        showToast('Removed from bookmarks');
    } else {
        bookmarkedStories.add(storyUrl);
        showToast('Added to bookmarks');
    }
    localStorage.setItem('bookmarkedStories', JSON.stringify(Array.from(bookmarkedStories)));
    filterAndDisplay();
}

function updateReadingProgress() {
    const readCount = readStories.size;
    const streak = parseInt(localStorage.getItem('readingStreak') || '0');
    document.getElementById('readCount').textContent = `${readCount} of ${dailyGoal} articles read today`;
    document.getElementById('streakBadge').textContent = `${streak} DAY STREAK`;
}

function shareStory(title, url) {
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
    }
}

// Categorization
function categorizeBySection(section) {
    const s = section.toLowerCase();
    if (s.includes('politic') || s.includes('us-news') || s.includes('government') || s.includes('election')) return 'politics';
    if (s.includes('business') || s.includes('economy') || s.includes('finance') || s.includes('market')) return 'business';
    if (s.includes('technolog') || s.includes('tech')) return 'technology';
    if (s.includes('sport')) return 'sports';
    if (s.includes('health') || s.includes('medical') || s.includes('wellness')) return 'health';
    if (s.includes('science') || s.includes('environment')) return 'science';
    if (s.includes('entertainment') || s.includes('arts') || s.includes('culture') || s.includes('movies') || s.includes('music') || s.includes('film') || s.includes('television') || s.includes('books')) return 'entertainment';
    if (s.includes('lifestyle') || s.includes('travel') || s.includes('food') || s.includes('fashion') || s.includes('style')) return 'lifestyle';
    return 'world';
}

function categorizeByKeywords(content) {
    if (!content) return 'world';
    const c = content.toLowerCase();
    const categories = [];
    
    if (c.includes('election') || c.includes('congress') || c.includes('president') || 
        c.includes('senate') || c.includes('vote') || c.includes('political') || 
        c.includes('government') || c.includes('trump') || c.includes('biden')) {
        categories.push('politics');
    }
    if (c.includes('stock') || c.includes('market') || c.includes('economy') || 
        c.includes('business') || c.includes('company') || c.includes('earnings') || 
        c.includes('trade') || c.includes('finance') || c.includes('investor')) {
        categories.push('business');
    }
    if (c.includes('tech') || c.includes('ai') || c.includes('app') || 
        c.includes('software') || c.includes('google') || c.includes('apple') || 
        c.includes('digital') || c.includes('computer') || c.includes('microsoft')) {
        categories.push('technology');
    }
    if (c.includes('game') || c.includes('sport') || c.includes('nba') || 
        c.includes('nfl') || c.includes('team') || c.includes('player') || 
        c.includes('football') || c.includes('basketball') || c.includes('soccer')) {
        categories.push('sports');
    }
    if (c.includes('health') || c.includes('medical') || c.includes('vaccine') || 
        c.includes('doctor') || c.includes('hospital') || c.includes('disease') || 
        c.includes('treatment') || c.includes('drug') || c.includes('patient')) {
        categories.push('health');
    }
    if (c.includes('science') || c.includes('research') || c.includes('climate') || 
        c.includes('scientist') || c.includes('study') || c.includes('discovery') || 
        c.includes('space') || c.includes('environment') || c.includes('nasa')) {
        categories.push('science');
    }
    if (c.includes('movie') || c.includes('music') || c.includes('celebrity') || 
        c.includes('film') || c.includes('actor') || c.includes('entertainment') || 
        c.includes('concert') || c.includes('album') || c.includes('hollywood') || 
        c.includes('television') || c.includes('tv show')) {
        categories.push('entertainment');
    }
    if (c.includes('travel') || c.includes('food') || c.includes('fashion') || 
        c.includes('restaurant') || c.includes('recipe') || c.includes('style') || 
        c.includes('cooking') || c.includes('wellness') || c.includes('fitness')) {
        categories.push('lifestyle');
    }
    
    return categories.length > 0 ? categories[0] : 'world';
}

function getAllCategories(content) {
    if (!content) return [];
    const c = content.toLowerCase();
    const categories = [];
    
    if (c.includes('election') || c.includes('congress') || c.includes('president') || 
        c.includes('political') || c.includes('senate') || c.includes('vote') || 
        c.includes('government') || c.includes('trump') || c.includes('biden')) {
        categories.push('politics');
    }
    if (c.includes('stock') || c.includes('market') || c.includes('economy') || 
        c.includes('business') || c.includes('finance') || c.includes('trade') || 
        c.includes('company') || c.includes('earnings') || c.includes('investor')) {
        categories.push('business');
    }
    if (c.includes('tech') || c.includes('ai') || c.includes('software') || 
        c.includes('digital') || c.includes('app') || c.includes('computer') || 
        c.includes('google') || c.includes('apple') || c.includes('microsoft')) {
        categories.push('technology');
    }
    if (c.includes('game') || c.includes('sport') || c.includes('team') || 
        c.includes('player') || c.includes('nba') || c.includes('nfl') || 
        c.includes('soccer') || c.includes('football') || c.includes('basketball')) {
        categories.push('sports');
    }
    if (c.includes('health') || c.includes('medical') || c.includes('vaccine') || 
        c.includes('doctor') || c.includes('hospital') || c.includes('disease') || 
        c.includes('treatment') || c.includes('drug') || c.includes('patient')) {
        categories.push('health');
    }
    if (c.includes('science') || c.includes('research') || c.includes('climate') || 
        c.includes('scientist') || c.includes('study') || c.includes('discovery') || 
        c.includes('space') || c.includes('environment') || c.includes('nasa')) {
        categories.push('science');
    }
    if (c.includes('movie') || c.includes('music') || c.includes('celebrity') || 
        c.includes('film') || c.includes('actor') || c.includes('entertainment') || 
        c.includes('concert') || c.includes('album') || c.includes('hollywood') || 
        c.includes('television') || c.includes('tv show') || c.includes('series')) {
        categories.push('entertainment');
    }
    if (c.includes('travel') || c.includes('food') || c.includes('fashion') || 
        c.includes('restaurant') || c.includes('recipe') || c.includes('style') || 
        c.includes('cooking') || c.includes('wellness') || c.includes('fitness')) {
        categories.push('lifestyle');
    }
    
    return categories.length > 0 ? categories : ['world'];
}

// API fetch functions
async function fetchNYTimes() {
    try {
        const response = await fetch(`https://api.nytimes.com/svc/news/v3/content/all/all.json?api-key=${API_CONFIG.NYT_API_KEY}&limit=20`);
        if (!response.ok) {
            console.log('NY Times API unavailable');
            return [];
        }
        const data = await response.json();
        
        return data.results.map(article => {
            let imageUrl = null;
            if (article.multimedia && article.multimedia.length > 0) {
                const image = article.multimedia.find(m => m.format === 'Large Thumbnail');
                if (image) imageUrl = image.url;
            }
            
            const content = article.title + ' ' + (article.abstract || '');
            const cat = categorizeBySection(article.section);
            const allCats = getAllCategories(content);
            
            return {
                source: 'NY Times',
                title: article.title,
                description: article.abstract || '',
                timestamp: new Date(article.published_date).getTime(),
                category: cat,
                categories: allCats.length > 0 ? allCats : [cat],
                url: article.url,
                image: imageUrl,
                readTime: estimateReadTime(article.abstract || article.title)
            };
        });
    } catch (error) {
        console.log('Could not load NY Times:', error.message);
        return [];
    }
}

async function fetchNewsAPI(sourceId, sourceName) {
    try {
        const url = `https://newsapi.org/v2/top-headlines?sources=${sourceId}&apiKey=${API_CONFIG.NEWS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'error') {
            console.log(`NewsAPI error for ${sourceName}:`, data.message);
            return [];
        }
        
        if (data.status !== 'ok' || !data.articles) {
            console.log(`${sourceName}: No articles returned`);
            return [];
        }
        
        return data.articles.map(article => {
            const content = article.title + ' ' + (article.description || '');
            const cat = categorizeByKeywords(content);
            const allCats = getAllCategories(content);
            
            return {
                source: sourceName,
                title: article.title,
                description: article.description || '',
                timestamp: new Date(article.publishedAt).getTime(),
                category: cat,
                categories: allCats.length > 0 ? allCats : [cat],
                url: article.url,
                image: article.urlToImage,
                readTime: estimateReadTime(article.description || article.title)
            };
        });
    } catch (error) {
        console.log(`Could not load ${sourceName}:`, error.message);
        return [];
    }
}

async function fetchGuardian() {
    try {
        const response = await fetch(`https://content.guardianapis.com/search?api-key=${API_CONFIG.GUARDIAN_API_KEY}&show-fields=headline,trailText,thumbnail&page-size=20`);
        if (!response.ok) {
            console.log('Guardian API unavailable');
            return [];
        }
        const data = await response.json();
        
        if (data.response.status !== 'ok') {
            console.log('Guardian API error');
            return [];
        }
        
        return data.response.results.map(article => {
            const content = (article.fields?.headline || article.webTitle) + ' ' + (article.fields?.trailText || '');
            const cat = categorizeBySection(article.sectionName);
            const allCats = getAllCategories(content);
            
            return {
                source: 'The Guardian',
                title: article.fields?.headline || article.webTitle,
                description: article.fields?.trailText || '',
                timestamp: new Date(article.webPublicationDate).getTime(),
                category: cat,
                categories: allCats.length > 0 ? allCats : [cat],
                url: article.webUrl,
                image: article.fields?.thumbnail,
                readTime: estimateReadTime(article.fields?.trailText || article.webTitle)
            };
        });
    } catch (error) {
        console.log('Could not load Guardian:', error.message);
        return [];
    }
}

function generateSampleStories(outletName, baseUrl) {
    const headlines = [
        'Major Policy Announcement Expected This Week',
        'Technology Sector Sees Unprecedented Growth',
        'Global Markets Respond to Economic Shifts',
        'Championship Game Breaks Viewership Records',
        'International Leaders Convene for Summit'
    ];

    const descriptions = [
        'Officials are preparing to unveil changes that could significantly impact the industry.',
        'Analysts point to sustained innovation as the key driver behind recent developments.',
        'Investors are closely monitoring the situation as it continues to evolve.',
        'The historic event captured the attention of audiences worldwide.',
        'Delegates from numerous countries gathered to address pressing global issues.'
    ];

    return headlines.map((title, i) => ({
        source: outletName,
        title,
        description: descriptions[i],
        timestamp: Date.now() - (i * 60000),
        category: 'world',
        categories: ['world'],
        url: baseUrl,
        image: null,
        readTime: '3 min read'
    }));
}

async function fetchAllFeeds() {
    allStories = [];

    try {
        console.log('Starting to fetch all feeds...');
        
        const nyt = await fetchNYTimes();
        console.log('NY Times loaded:', nyt.length);
        allStories.push(...nyt);
        
        const guardian = await fetchGuardian();
        console.log('Guardian loaded:', guardian.length);
        allStories.push(...guardian);

        // Try NewsAPI sources but don't let failures stop us
        for (const [outletName, sourceId] of Object.entries(newsApiSources)) {
            try {
                const stories = await fetchNewsAPI(sourceId, outletName);
                console.log(`${outletName} loaded:`, stories.length);
                allStories.push(...stories);
            } catch (error) {
                console.log(`Skipping ${outletName} due to error`);
            }
        }

        console.log('Total stories before samples:', allStories.length);

        // Add sample stories for outlets without data
        outlets.forEach(outlet => {
            const hasStories = allStories.some(s => s.source === outlet.name);
            if (!hasStories) {
                const sampleStories = generateSampleStories(outlet.name, outlet.url);
                allStories.push(...sampleStories);
                console.log(`${outlet.name}: Added ${sampleStories.length} sample stories`);
            }
        });

        // Remove duplicates
        const uniqueStories = [];
        const seenUrls = new Set();
        allStories.forEach(story => {
            if (!seenUrls.has(story.url)) {
                seenUrls.add(story.url);
                uniqueStories.push(story);
            }
        });

        allStories = uniqueStories;
        allStories.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('Final story count:', allStories.length);
        console.log('About to call filterAndDisplay');
        
        filterAndDisplay();
        
        console.log('filterAndDisplay completed');
    } catch (error) {
        console.error('Critical error in fetchAllFeeds:', error);
        
        // Complete fallback
        outlets.forEach(outlet => {
            allStories.push(...generateSampleStories(outlet.name, outlet.url));
        });
        allStories.sort((a, b) => b.timestamp - a.timestamp);
        console.log('Using fallback data:', allStories.length);
        filterAndDisplay();
    }
}

// Trending and word cloud
function generateTrendingData() {
    const words = {};
    const topics = {};
    
    allStories.forEach(story => {
        const title = story.title.toLowerCase();
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'will', 'has', 'have', 'had'];
        
        title.split(' ').forEach(word => {
            word = word.replace(/[^\w]/g, '');
            if (word.length > 4 && !stopWords.includes(word)) {
                words[word] = (words[word] || 0) + 1;
            }
        });
        
        story.categories.forEach(cat => {
            topics[cat] = (topics[cat] || 0) + 1;
        });
    });
    
    return { words, topics };
}

function displayTrendingTopics() {
    const { topics } = generateTrendingData();
    const topicsArray = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 8);
    
    return topicsArray.map(([topic, count]) => 
        `<div class="trending-topic" onclick="filterByCategory('${topic}')">
            <span>${topic.toUpperCase()}</span>
            <span class="trending-count">${count}</span>
        </div>`
    ).join('');
}

function displayWordCloud() {
    // Word cloud removed - function disabled
    return;
}

function filterByCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });
    filterAndDisplay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Display functions
function filterAndDisplay() {
    if (currentCategory === 'all') {
        displayAllSections();
    } else {
        const sectionId = `section-${currentCategory}`;
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function findRelatedStories(story) {
    return allStories
        .filter(s => s.url !== story.url)
        .filter(s => {
            const sameCategory = s.categories.some(cat => story.categories.includes(cat));
            const sameSource = s.source === story.source;
            return sameCategory || sameSource;
        })
        .slice(0, 3);
}

function displayLatestSection(stories) {
    return stories.length > 0 ? `
        <div class="main-grid">
            <div class="hero-story" onclick="openStory('${stories[0].url}', '${stories[0].title.replace(/'/g, "\\'")}', '${stories[0].source}')">
                ${stories[0].image ? 
                    `<img src="${stories[0].image}" alt="${stories[0].title}" class="hero-image" loading="lazy">` :
                    `<div class="hero-image placeholder" style="background: ${getOutletColor(stories[0].source)}">${getOutletInitials(stories[0].source)}</div>`
                }
                <div class="story-actions">
                    <button class="action-btn ${bookmarkedStories.has(stories[0].url) ? 'active' : ''}" onclick="event.stopPropagation(); toggleBookmark('${stories[0].url}', '${stories[0].title.replace(/'/g, "\\'")}', '${stories[0].source}')" title="Bookmark">★</button>
                    <button class="action-btn" onclick="event.stopPropagation(); shareStory('${stories[0].title.replace(/'/g, "\\'")}', '${stories[0].url}')" title="Share">↗</button>
                </div>
                <div class="category-tags">
                    ${stories[0].categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                <h1 class="hero-title">${readStories.has(stories[0].url) ? '<span class="read-badge">✓</span>' : ''}${stories[0].title}</h1>
                <p class="hero-description">${stories[0].description}</p>
                <div class="story-meta">
                    <span>${stories[0].source}</span>
                    <span>•</span>
                    <span>${formatTime(stories[0].timestamp)}</span>
                    <span class="read-time">${stories[0].readTime}</span>
                </div>
            </div>
            <div class="sidebar">
                <div class="sidebar-title">Top Stories</div>
                ${stories.slice(1, 5).map(story => `
                    <div class="sidebar-story" onclick="openStory('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')">
                        <div class="sidebar-story-category">${story.category.toUpperCase()}</div>
                        <div class="sidebar-story-title">${readStories.has(story.url) ? '<span class="read-badge">✓</span>' : ''}${story.title}</div>
                        <div class="sidebar-story-meta">${story.source} • ${formatTime(story.timestamp)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
}

function createBiggestStoryCard(story) {
    const isRead = readStories.has(story.url);
    const isBookmarked = bookmarkedStories.has(story.url);
    const relatedStories = findRelatedStories(story);
    
    return `
        <div class="biggest-story-card ${isRead ? 'read' : ''}" onclick="openStory('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')">
            <div class="story-actions">
                <button class="action-btn ${isBookmarked ? 'active' : ''}" onclick="event.stopPropagation(); toggleBookmark('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')" title="Bookmark">★</button>
                <button class="action-btn" onclick="event.stopPropagation(); shareStory('${story.title.replace(/'/g, "\\'")}', '${story.url}')" title="Share">↗</button>
            </div>
            <img src="${story.image}" alt="${story.title}" class="biggest-story-image" loading="lazy">
            <div class="biggest-story-content">
                <div class="category-tags">
                    ${story.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                <h3 class="biggest-story-title">${isRead ? '<span class="read-badge">✓</span>' : ''}${story.title}</h3>
                <p class="biggest-story-description">${story.description.substring(0, 150)}...</p>
                <div class="story-meta">
                    <span>${story.source}</span>
                    <span>•</span>
                    <span>${formatTime(story.timestamp)}</span>
                    <span class="read-time">${story.readTime}</span>
                </div>
                ${relatedStories.length > 0 ? `
                    <div class="related-stories">
                        <div class="related-title">Related Stories</div>
                        ${relatedStories.map(r => `<span class="related-item" onclick="event.stopPropagation(); openStory('${r.url}', '${r.title.replace(/'/g, "\\'")}', '${r.source}')">${r.title.substring(0, 60)}...</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createStoryCard(story) {
    const isRead = readStories.has(story.url);
    const isBookmarked = bookmarkedStories.has(story.url);
    
    const imageHTML = story.image 
        ? `<img src="${story.image}" alt="${story.title}" class="story-image" loading="lazy">` 
        : `<div class="story-image placeholder" style="background: ${getOutletColor(story.source)}">${getOutletInitials(story.source)}</div>`;
    
    return `
        <div class="story-card ${isRead ? 'read' : ''}" onclick="openStory('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')">
            <div class="story-actions">
                <button class="action-btn ${isBookmarked ? 'active' : ''}" onclick="event.stopPropagation(); toggleBookmark('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')" title="Bookmark">★</button>
                <button class="action-btn" onclick="event.stopPropagation(); shareStory('${story.title.replace(/'/g, "\\'")}', '${story.url}')" title="Share">↗</button>
            </div>
            ${imageHTML}
            <div class="story-content">
                <div class="category-tags">
                    ${story.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                <h3 class="story-title">${isRead ? '<span class="read-badge">✓</span>' : ''}${story.title}</h3>
                <p class="story-description">${story.description.substring(0, 100)}...</p>
                <div class="story-meta">
                    <span>${story.source}</span>
                    <span>•</span>
                    <span>${formatTime(story.timestamp)}</span>
                    <span class="read-time">${story.readTime}</span>
                </div>
            </div>
        </div>
    `;
}

function createListStoryCard(story) {
    const isRead = readStories.has(story.url);
    const imageHTML = story.image 
        ? `<img src="${story.image}" alt="${story.title}" class="story-list-image" loading="lazy">` 
        : `<div class="story-list-image placeholder" style="background: ${getOutletColor(story.source)}">${getOutletInitials(story.source)}</div>`;
    
    return `
        <div class="story-list-item ${isRead ? 'read' : ''}" onclick="openStory('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')">
            ${imageHTML}
            <div>
                <div class="category-tags">
                    ${story.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                <h3 class="story-title">${isRead ? '<span class="read-badge">✓</span>' : ''}${story.title}</h3>
                <p class="story-description">${story.description.substring(0, 150)}...</p>
                <div class="story-meta">
                    <span>${story.source}</span>
                    <span>•</span>
                    <span>${formatTime(story.timestamp)}</span>
                    <span class="read-time">${story.readTime}</span>
                </div>
            </div>
        </div>
    `;
}

function displayAllSections() {
    const container = document.getElementById('sectionsContainer');
    
    if (allStories.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px; color: #666;">Loading stories...</div>';
        return;
    }
    
    displayWordCloud();
    
    const latestStories = allStories.slice(0, 5);
    let sectionsHTML = '<div class="category-section"><h2 class="section-header">Latest Stories</h2>';
    
    if (latestStories.length > 0) {
        sectionsHTML += displayLatestSection(latestStories);
    }
    sectionsHTML += '</div>';

    const biggestStories = allStories
        .filter(s => s.image)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 4);
    
    if (biggestStories.length > 0) {
        sectionsHTML += '<div class="category-section"><h2 class="section-header">Biggest Stories</h2>';
        sectionsHTML += layoutMode === 'grid' ? '<div class="biggest-stories-grid">' : '<div class="stories-list-view">';
        sectionsHTML += biggestStories.map(story => layoutMode === 'grid' ? createBiggestStoryCard(story) : createListStoryCard(story)).join('');
        sectionsHTML += '</div></div>';
    }

    const categories = [
        { id: 'politics', name: 'Politics' },
        { id: 'business', name: 'Business' },
        { id: 'technology', name: 'Technology' },
        { id: 'sports', name: 'Sports' },
        { id: 'world', name: 'World' },
        { id: 'health', name: 'Health' },
        { id: 'science', name: 'Science' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'lifestyle', name: 'Lifestyle' }
    ];

    categories.forEach(cat => {
        if (hiddenCategories.has(cat.id)) return;
        
        const categoryStories = allStories
            .filter(s => s.category === cat.id || (s.categories && s.categories.includes(cat.id)))
            .slice(0, 8);
        
        if (categoryStories.length > 0) {
            sectionsHTML += `<div class="category-section" id="section-${cat.id}">`;
            sectionsHTML += `<h2 class="section-header">${cat.name}</h2>`;
            sectionsHTML += layoutMode === 'grid' ? '<div class="stories-grid" style="grid-template-columns: repeat(4, 1fr);">' : '<div class="stories-list-view">';
            sectionsHTML += categoryStories.map(story => layoutMode === 'grid' ? createStoryCard(story) : createListStoryCard(story)).join('');
            sectionsHTML += '</div></div>';
        }
    });

    container.innerHTML = sectionsHTML;
}

// Daily briefing
function generateDailyBriefing() {
    const categories = ['politics', 'business', 'technology', 'sports', 'world', 'health', 'science', 'entertainment', 'lifestyle'];
    let briefingStories = [];

    categories.forEach(cat => {
        const catStories = allStories
            .filter(s => s.category === cat || (s.categories && s.categories.includes(cat)))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 1);
        briefingStories.push(...catStories);
    });

    const remaining = 10 - briefingStories.length;
    if (remaining > 0) {
        const usedUrls = new Set(briefingStories.map(s => s.url));
        const additionalStories = allStories
            .filter(s => !usedUrls.has(s.url))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, remaining);
        briefingStories.push(...additionalStories);
    }

    return briefingStories.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}

function showDailyBriefing() {
    const briefingStories = generateDailyBriefing();
    const briefingBody = document.getElementById('briefingBody');
    
    briefingBody.innerHTML = briefingStories.map((story, index) => {
        const isRead = readStories.has(story.url);
        return `
            <div class="briefing-story" onclick="openBriefingStory('${story.url}', '${story.title.replace(/'/g, "\\'")}', '${story.source}')">
                <div class="briefing-rank">${index + 1}</div>
                <div>
                    <h3 class="briefing-story-title">${isRead ? '<span class="read-badge">✓</span>' : ''}${story.title}</h3>
                    <div class="briefing-story-meta">${story.category.toUpperCase()} • ${story.source} • ${formatTime(story.timestamp)} • ${story.readTime}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('briefingModal').classList.add('active');
}

// Global functions for onclick handlers
window.openStory = function(url, title, source) {
    markAsRead(url, title, source);
    window.open(url, '_blank');
    filterAndDisplay();
};

window.openBriefingStory = function(url, title, source) {
    markAsRead(url, title, source);
    window.open(url, '_blank');
    showDailyBriefing();
};

window.toggleBookmark = toggleBookmark;
window.shareStory = shareStory;
window.filterByCategory = filterByCategory;

// Event listeners
document.getElementById('menuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('dropdownMenu').classList.toggle('active');
});

document.addEventListener('click', () => {
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('layoutMenuItem').addEventListener('click', () => {
    layoutMode = layoutMode === 'grid' ? 'list' : 'grid';
    saveSettings();
    filterAndDisplay();
    showToast(`Switched to ${layoutMode} view`);
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('savedMenuItem').addEventListener('click', () => {
    const savedBody = document.getElementById('savedBody');
    const savedArticles = allStories.filter(s => bookmarkedStories.has(s.url));
    
    if (savedArticles.length === 0) {
        savedBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No saved articles yet. Click the star button to bookmark stories.</div>';
    } else {
        savedBody.innerHTML = savedArticles.map(story => createListStoryCard(story)).join('');
    }
    
    document.getElementById('savedModal').classList.add('active');
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('historyMenuItem').addEventListener('click', () => {
    const historyBody = document.getElementById('historyBody');
    
    if (readHistory.length === 0) {
        historyBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No reading history yet.</div>';
    } else {
        historyBody.innerHTML = '<div class="stories-list-view">' + readHistory.map(item => {
            const story = allStories.find(s => s.url === item.url);
            if (story) {
                return createListStoryCard(story);
            } else {
                return `
                    <div class="story-list-item">
                        <div class="story-list-image placeholder">?</div>
                        <div>
                            <h3 class="story-title"><span class="read-badge">✓</span> ${item.title}</h3>
                            <div class="story-meta">
                                <span>${item.source}</span>
                                <span>•</span>
                                <span>Read ${formatTime(item.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('') + '</div>';
    }
    
    document.getElementById('historyModal').classList.add('active');
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('themeMenuItem').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    saveSettings();
    showToast(document.body.classList.contains('dark-mode') ? 'Dark mode enabled' : 'Light mode enabled');
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('settingsMenuItem').addEventListener('click', () => {
    document.getElementById('dailyGoalInput').value = dailyGoal;
    
    const toggles = document.getElementById('categoryToggles');
    const categories = ['politics', 'business', 'technology', 'sports', 'world', 'health', 'science', 'entertainment', 'lifestyle'];
    toggles.innerHTML = categories.map(cat => `
        <div class="category-toggle">
            <input type="checkbox" id="cat-${cat}" ${!hiddenCategories.has(cat) ? 'checked' : ''}>
            <label for="cat-${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</label>
        </div>
    `).join('');
    
    document.getElementById('settingsModal').classList.add('active');
    document.getElementById('dropdownMenu').classList.remove('active');
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
    if (isRefreshing) {
        showToast('Already refreshing...');
        return;
    }
    
    const now = Date.now();
    if (lastRefreshTime && (now - lastRefreshTime) < 60000) {
        const secondsLeft = Math.ceil((60000 - (now - lastRefreshTime)) / 1000);
        showToast(`Please wait ${secondsLeft} seconds before refreshing again`);
        return;
    }
    
    isRefreshing = true;
    const btn = document.getElementById('refreshBtn');
    btn.style.animation = 'spin 1s linear infinite';
    
    showToast('Refreshing news feeds...');
    
    await fetchAllFeeds();
    
    lastRefreshTime = now;
    isRefreshing = false;
    btn.style.animation = '';
    showToast('News updated!');
});

document.getElementById('settingsClose').addEventListener('click', () => {
    dailyGoal = parseInt(document.getElementById('dailyGoalInput').value) || 10;
    
    hiddenCategories.clear();
    document.querySelectorAll('.category-toggle input').forEach(input => {
        if (!input.checked) {
            hiddenCategories.add(input.id.replace('cat-', ''));
        }
    });
    
    saveSettings();
    updateNavVisibility();
    updateReadingProgress();
    document.getElementById('settingsModal').classList.remove('active');
});

document.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const size = btn.dataset.size;
        document.body.className = document.body.className.replace(/font-\w+/, `font-${size}`);
        saveSettings();
    });
});

document.getElementById('subscribeBtn').addEventListener('click', () => {
    const email = document.getElementById('emailInput').value;
    if (email) {
        showToast('Subscribed to weekly digest!');
        localStorage.setItem('digestEmail', email);
    }
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        filterAndDisplay();
    });
});

document.getElementById('briefingBtn').addEventListener('click', showDailyBriefing);
document.getElementById('briefingClose').addEventListener('click', () => {
    document.getElementById('briefingModal').classList.remove('active');
});

document.getElementById('savedClose').addEventListener('click', () => {
    document.getElementById('savedModal').classList.remove('active');
});

document.getElementById('historyClose').addEventListener('click', () => {
    document.getElementById('historyModal').classList.remove('active');
});

document.querySelectorAll('.modal').forEach(modalEl => {
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
            modalEl.classList.remove('active');
        }
    });
});

// Initialize
displayDate();
loadSettings();
loadReadStories();
updateReadingProgress();

// Make sure DOM is fully loaded before fetching
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAllFeeds);
} else {
    fetchAllFeeds();
}

// Dummy placeholder functions in case they're not defined
function displayMainGrid() {
    // Handled by displayAllSections
}

function displayStories() {
    // Handled by displayAllSections
}

function displaySidebarStories() {
    // Handled by displayAllSections
}