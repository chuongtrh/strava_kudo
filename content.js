// Strava Kudo All - Content Script
(function () {
    'use strict';

    // Storage keys
    const IGNORE_LIST_KEY = 'strava_kudo_ignore_list';

    // Storage helpers
    function getIgnoreList() {
        try {
            const list = localStorage.getItem(IGNORE_LIST_KEY);
            return list ? JSON.parse(list) : [];
        } catch (e) {
            console.error('Strava Kudo All: Error parsing ignore list', e);
            return [];
        }
    }

    function saveIgnoreList(list) {
        localStorage.setItem(IGNORE_LIST_KEY, JSON.stringify(list));
    }

    function addToIgnoreList(athleteId, athleteName) {
        const list = getIgnoreList();
        if (!list.find(item => item.id === athleteId)) {
            list.push({ id: athleteId, name: athleteName });
            saveIgnoreList(list);
            showNotification(`Added ${athleteName} to ignore list`, 'info');
            // Refresh UI to hide buttons if needed or just let it stay
        }
    }

    function removeFromIgnoreList(athleteId) {
        let list = getIgnoreList();
        const item = list.find(i => i.id === athleteId);
        list = list.filter(item => item.id !== athleteId);
        saveIgnoreList(list);
        if (item) {
            showNotification(`Removed ${item.name} from ignore list`, 'info');
        }
    }

    function isIgnored(athleteId) {
        const list = getIgnoreList();
        return list.some(item => item.id === athleteId);
    }

    // In-memory cache for group athlete activity stats
    const groupStatsCache = new Map();
    let activityObserver = null;

    // Wait for page to be fully loaded
    function init() {
        if (window.location.pathname.includes('/dashboard')) {
            // Wait a bit for Strava's dynamic content to load
            setTimeout(() => {
                createKudoButton();
                injectIgnoreButtonsToExisting();
                setupMutationObserver();
            }, 1000);
        } else if (window.location.pathname.includes('/athletes/')) {
            setTimeout(() => {
                createProfileKudoButton();
            }, 1000);
        } else if (window.location.pathname.includes('/activities/')) {
            setTimeout(() => {
                setupActivityPageObserver();
            }, 1000);
        }
    }

    // Watch for SPA URL changes
    let lastKnownUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastKnownUrl) {
            lastKnownUrl = window.location.href;
            init();
        }
    }, 1500);

    // Observe dashboard for new activities
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldInject = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldInject = true;
                    break;
                }
            }
            if (shouldInject) {
                injectIgnoreButtonsToExisting();
            }
        });

        const feed = document.querySelector('.feed-container') || document.body;
        observer.observe(feed, { childList: true, subtree: true });
    }

    function injectIgnoreButtonsToExisting() {
        // Find all activity entries
        const activities = document.querySelectorAll('[data-testid="web-feed-entry"], .activity');
        activities.forEach(activity => {
            injectIgnoreButton(activity);
        });
    }

    function injectIgnoreButton(activityElement) {
        // Check if already injected
        if (activityElement.querySelector('.ignore-activity-btn')) {
            return;
        }

        // Find athlete info
        const athleteLinks = activityElement.querySelectorAll('a[href*="/athletes/"]');
        let athleteId = null;
        let athleteName = '';

        for (const link of athleteLinks) {
            const href = link.getAttribute('href');
            const match = href.match(/\/athletes\/(\d+)/);
            if (match) {
                athleteId = match[1];
                const text = link.textContent.trim();
                if (text && !athleteName) {
                    athleteName = text;
                }
            }
        }

        if (!athleteId) return;
        if (!athleteName) athleteName = `Athlete ${athleteId}`;

        // Find where to inject. Footer or near kudo button is good.
        // Let's try to find the social buttons area
        const socialButtons = activityElement.querySelector('[data-testid="kudos_button"]')?.parentElement;
        if (!socialButtons) return;

        const ignoreBtn = document.createElement('button');
        ignoreBtn.className = 'ignore-activity-btn';
        ignoreBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12">
                <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
            <span>Ignore</span>
        `;
        ignoreBtn.title = `Ignore ${athleteName} - Skip kudoing their activities`;
        ignoreBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            addToIgnoreList(athleteId, athleteName);
        };

        socialButtons.appendChild(ignoreBtn);
    }

    // Create and inject the "Kudo All" button
    function createKudoButton() {
        // Try multiple selectors to find the header
        const headerSelectors = [
            'header nav.global-header',
            'header nav',
            'header.navigation',
            'nav.global-header',
            '.global-header',
            'header'
        ];

        let header = null;
        for (const selector of headerSelectors) {
            header = document.querySelector(selector);
            if (header) {
                console.log('Strava Kudo All: Found header with selector:', selector);
                break;
            }
        }

        if (!header) {
            console.log('Strava Kudo All: Header not found, retrying in 2 seconds...');
            setTimeout(createKudoButton, 2000);
            return;
        }

        // Check if button already exists
        if (document.getElementById('kudo-all-btn')) {
            return;
        }

        // Create the button
        const kudoBtn = document.createElement('button');
        kudoBtn.id = 'kudo-all-btn';
        kudoBtn.className = 'kudo-all-button';
        kudoBtn.innerHTML = `
      <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>Kudo All</span>
    `;
        kudoBtn.onclick = kudoAllActivities;

        // Try to insert button into header with multiple strategies
        let inserted = false;

        // Strategy 1: Insert after "Challenges" link
        const challengesLink = Array.from(document.querySelectorAll('a')).find(a =>
            a.textContent.trim().toLowerCase() === 'challenges'
        );

        if (challengesLink && challengesLink.parentElement) {
            const btnContainer = document.createElement('li');
            btnContainer.className = 'nav-item';
            btnContainer.style.display = 'inline-block';
            btnContainer.style.marginLeft = '16px'; // Add spacing after Challenges
            btnContainer.style.marginTop = '10px';
            btnContainer.appendChild(kudoBtn);

            // Insert after the Challenges nav item
            if (challengesLink.parentElement.nextSibling) {
                challengesLink.parentElement.parentNode.insertBefore(btnContainer, challengesLink.parentElement.nextSibling);
            } else {
                challengesLink.parentElement.parentNode.appendChild(btnContainer);
            }
            inserted = true;
            console.log('Strava Kudo All: Button inserted after Challenges link');
        }

        // Strategy 2: Find nav-group or similar container and append at the end
        if (!inserted) {
            const navContainers = ['.nav-group', 'ul', '.navigation-list', 'nav ul'];
            for (const selector of navContainers) {
                const navLinks = header.querySelector(selector);
                if (navLinks) {
                    const btnContainer = document.createElement('li');
                    btnContainer.className = 'nav-item';
                    btnContainer.appendChild(kudoBtn);
                    navLinks.appendChild(btnContainer); // Append at the end instead of beginning
                    inserted = true;
                    console.log('Strava Kudo All: Button appended to container:', selector);
                    break;
                }
            }
        }

        // Strategy 3: Just append to header directly
        if (!inserted) {
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'inline-block';
            btnContainer.style.marginLeft = '10px';
            btnContainer.appendChild(kudoBtn);
            header.appendChild(btnContainer);
            console.log('Strava Kudo All: Button appended directly to header');
            inserted = true;
        }

        // Add "Manage Ignore List" button
        if (inserted) {
            createManageIgnoreButton(header);
        }
    }

    function createManageIgnoreButton(header) {
        if (document.getElementById('manage-ignore-btn')) return;

        const manageBtn = document.createElement('button');
        manageBtn.id = 'manage-ignore-btn';
        manageBtn.className = 'kudo-all-button manage-ignore-btn'; // Reuse styling but add specific class
        manageBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>Ignore List</span>
        `;
        manageBtn.onclick = showIgnoreListModal;

        // Find the kudo-all-btn container or parent and append after it
        const kudoBtn = document.getElementById('kudo-all-btn');
        if (kudoBtn && kudoBtn.parentElement) {
            kudoBtn.parentElement.appendChild(manageBtn);
        }
    }

    function showIgnoreListModal() {
        // Remove existing modal if any
        const existing = document.querySelector('.kudo-modal-overlay');
        if (existing) existing.remove();

        const list = getIgnoreList();

        const overlay = document.createElement('div');
        overlay.className = 'kudo-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        const modal = document.createElement('div');
        modal.className = 'kudo-modal';
        modal.onclick = (e) => e.stopPropagation();

        modal.innerHTML = `
            <div class="kudo-modal-header">
                <h3 class="kudo-modal-title">Ignore List</h3>
                <button class="kudo-modal-close">&times;</button>
            </div>
            <div class="ignore-list-container">
                ${list.length === 0 ? '<div class="empty-ignore-list">No athletes in ignore list</div>' : ''}
                ${list.map(item => `
                    <div class="ignore-item">
                        <div class="ignore-item-info">
                            <span class="ignore-item-name">${item.name || 'Unknown Athlete'}</span>
                            <span class="ignore-item-id">ID: ${item.id}</span>
                        </div>
                        <button class="remove-ignore-btn" data-id="${item.id}">Remove</button>
                    </div>
                `).join('')}
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event listeners
        modal.querySelector('.kudo-modal-close').onclick = () => overlay.remove();

        modal.querySelectorAll('.remove-ignore-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                removeFromIgnoreList(id);
                showIgnoreListModal(); // Refresh modal
            };
        });
    }

    // Main function to kudo all activities
    async function kudoAllActivities() {
        const button = document.getElementById('kudo-all-btn');
        if (!button) return;

        // Disable button during processing
        button.disabled = true;
        button.style.opacity = '0.6';
        button.innerHTML = '<span>Processing...</span>';

        try {
            // Find all kudo buttons on the page
            const kudoButtons = findKudoButtons();

            if (kudoButtons.length === 0) {
                showNotification('No activities found to kudo', 'info');
                resetButton(button);
                return;
            }

            // Filter out already kudoed activities
            const unkudoedButtons = kudoButtons.filter(btn => !isAlreadyKudoed(btn));

            // Filter out ignored athletes
            const finalButtons = [];
            for (const btn of unkudoedButtons) {
                // Find parent activity to check athlete ID
                const activityEntry = btn.closest('[data-testid="web-feed-entry"], .activity');
                if (activityEntry) {
                    const athleteLink = activityEntry.querySelector('a[href*="/athletes/"]');
                    if (athleteLink) {
                        const match = athleteLink.getAttribute('href').match(/\/athletes\/(\d+)/);
                        if (match && isIgnored(match[1])) {
                            console.log('Strava Kudo All: Skipping ignored athlete:', match[1]);
                            continue;
                        }
                    }
                }
                finalButtons.push(btn);
            }

            if (finalButtons.length === 0) {
                showNotification('All activities already have kudos or are in ignore list! 🏁', 'success');
                resetButton(button);
                return;
            }

            // Give kudos sequentially
            let kudoCount = 0;
            for (const btn of finalButtons) {
                try {
                    btn.click();
                    kudoCount++;
                    // Small delay to avoid rate limiting
                    await sleep(300);
                } catch (error) {
                    console.error('Error giving kudo:', error);
                }
            }

            showNotification(`Successfully gave kudos to ${kudoCount} activities! 🎉`, 'success');
        } catch (error) {
            console.error('Strava Kudo All error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            resetButton(button);
        }
    }

    // Find all kudo buttons on the current page
    function findKudoButtons() {
        const buttons = [];

        // Strava uses data-testid="kudos_button" for both "Give Kudo" and "View Kudos" (already kudoed)
        const selector = 'button[data-testid="kudos_button"]';
        const found = document.querySelectorAll(selector);

        if (found.length > 0) {
            found.forEach(btn => {
                if (!buttons.includes(btn)) buttons.push(btn);
            });
            return buttons;
        }

        // Fallback selectors - ONLY use if modern selectors fail
        const fallbackSelectors = [
            'button.js-add-kudo',
            'button[title="Give kudos"]'
        ];

        fallbackSelectors.forEach(selector => {
            const foundButtons = document.querySelectorAll(selector);
            foundButtons.forEach(btn => {
                if (!buttons.includes(btn)) {
                    buttons.push(btn);
                }
            });
        });

        return buttons;
    }

    // Check if an activity already has kudos
    function isAlreadyKudoed(button) {
        // 1. Check by Title (Most reliable based on user report)
        const title = button.getAttribute('title');
        if (title === 'View all kudos') return true;
        if (title === 'Give kudos') return false;

        // 2. Check internal SVG data-testid
        const filledSvg = button.querySelector('svg[data-testid="filled_kudos"]');
        if (filledSvg) return true;

        const unfilledSvg = button.querySelector('svg[data-testid="unfilled_kudos"]');
        if (unfilledSvg) return false;

        // 3. Fallbacks
        const svg = button.querySelector('svg');
        const classList = button.className;
        const ariaLabel = button.getAttribute('aria-label') || '';

        return (
            classList.includes('active') ||
            classList.includes('kudoed') ||
            classList.includes('filled') ||
            ariaLabel.toLowerCase().includes('unkudo') ||
            ariaLabel.toLowerCase().includes('remove kudo') ||
            (title && title.toLowerCase().includes('unkudo')) ||
            (title && title.toLowerCase().includes('remove')) ||
            (svg && (svg.classList.contains('filled') || svg.getAttribute('fill') === 'orange' || svg.getAttribute('fill') === '#FC4C02'))
        );
    }

    // Show notification to user
    function showNotification(message, type = 'info') {
        // Remove existing notification if any
        const existing = document.getElementById('kudo-all-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'kudo-all-notification';
        notification.className = `kudo-notification kudo-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Reset button to original state
    function resetButton(button) {
        button.disabled = false;
        button.style.opacity = '1';
        button.innerHTML = `
      <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>Kudo All</span>
    `;
    }

    // Create and inject "Kudo All" button on athlete profile page
    function createProfileKudoButton() {
        if (document.getElementById('profile-kudo-all-btn')) return;

        const kudoBtn = document.createElement('button');
        kudoBtn.id = 'profile-kudo-all-btn';
        kudoBtn.className = 'kudo-all-button profile-kudo-btn';
        kudoBtn.innerHTML = `
            <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 6px;">
                <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Kudo All 🔥</span>
        `;

        // Add styling suitable for profile page
        kudoBtn.style.padding = '8px 16px';
        kudoBtn.style.background = '#fc4c02';
        kudoBtn.style.color = '#fff';
        kudoBtn.style.borderRadius = '4px';
        kudoBtn.style.fontWeight = 'bold';
        kudoBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        kudoBtn.style.transition = 'all 0.2s ease';
        kudoBtn.style.border = 'none';
        kudoBtn.style.cursor = 'pointer';

        kudoBtn.onmouseover = () => { kudoBtn.style.background = '#e34402'; };
        kudoBtn.onmouseout = () => { kudoBtn.style.background = '#fc4c02'; };
        kudoBtn.onclick = kudoAthleteActivities;

        // Strategy to place button next to follow action OR athlete name
        let inserted = false;

        // 1. Try to find the Follow/Following buttons
        const allButtons = Array.from(document.querySelectorAll('button'));
        const actionButton = allButtons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            return text === 'following' || text === 'follow' || text === 'request to follow';
        });

        if (actionButton) {
            // Usually the follow button is in a group or flex container
            // Let's go up its parent tree to find that small inline container
            let container = actionButton.parentElement;
            if (container && container.tagName === 'DIV' && container.childNodes.length > 1) {
                // that's probably the button group
            } else if (container && container.parentElement && container.parentElement.tagName === 'DIV') {
                container = container.parentElement;
            }

            const wrapper = document.createElement('div');
            wrapper.style.display = 'inline-block';
            wrapper.style.marginLeft = '12px';
            wrapper.style.verticalAlign = 'top';
            wrapper.appendChild(kudoBtn);

            container.insertAdjacentElement('afterend', wrapper);
            inserted = true;
            console.log('Strava Kudo All: Inserted near follow action');
        }

        // 2. Try to find the H1 (athlete name)
        if (!inserted) {
            const h1 = document.querySelector('h1');
            if (h1) {
                const wrapper = document.createElement('div');
                wrapper.style.marginTop = '12px';
                wrapper.style.marginBottom = '12px';
                wrapper.appendChild(kudoBtn);

                h1.insertAdjacentElement('afterend', wrapper);
                inserted = true;
                console.log('Strava Kudo All: Inserted below athlete name H1');
            }
        }

        // 3. Fallback: try different profile containers
        if (!inserted) {
            const possibleContainers = [
                '.profile-heading',
                '.profile-details',
                '.row.profile-wrapper',
                '#profile-sidebar',
                '.col-md-3.sidebar',
            ];

            for (const sel of possibleContainers) {
                const container = document.querySelector(sel);
                if (container) {
                    container.insertAdjacentElement('afterbegin', kudoBtn);
                    inserted = true;
                    console.log('Strava Kudo All: Found profile container:', sel);
                    break;
                }
            }
        }

        // 4. Ultimate fallback: fixed on screen
        if (!inserted) {
            kudoBtn.style.position = 'fixed';
            kudoBtn.style.bottom = '20px';
            kudoBtn.style.right = '20px';
            kudoBtn.style.zIndex = '9999';
            kudoBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            document.body.appendChild(kudoBtn);
            console.log('Strava Kudo All: Appended to body as fallback');
        }
    }

    async function kudoAthleteActivities() {
        const button = document.getElementById('profile-kudo-all-btn');
        if (!button) return;

        button.disabled = true;
        button.style.background = '#ccc';
        button.style.cursor = 'not-allowed';
        button.innerHTML = '<span>Processing... Scrolling feed...</span>';

        try {
            // Step 1: Scroll to load activities
            let noNewContentCount = 0;
            let lastHeight = 0;

            // Scroll max 10 times to find activities. 
            // In Strava profile, scrolling auto-loads older entries.
            for (let i = 0; i < 10; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await sleep(1500); // give it time to fetch and render

                const newHeight = document.body.scrollHeight;
                if (newHeight === lastHeight) {
                    noNewContentCount++;
                    if (noNewContentCount >= 2) break; // Reached bottom or no new content
                } else {
                    noNewContentCount = 0;
                    lastHeight = newHeight;
                }
            }

            // Scroll back top
            window.scrollTo(0, 0);
            await sleep(500);

            // Step 2: Find kudos
            const kudoButtons = findKudoButtons();

            if (kudoButtons.length === 0) {
                showNotification('No activities found to kudo', 'info');
                resetProfileButton(button);
                return;
            }

            // Filter out already kudoed
            const unkudoedButtons = kudoButtons.filter(btn => !isAlreadyKudoed(btn));

            // Filter for current month using 'time' tag
            const finalButtons = [];
            const currentMonthIndex = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            for (const btn of unkudoedButtons) {
                const activityEntry = btn.closest('[data-testid="web-feed-entry"], .activity');
                if (activityEntry) {
                    const timeEl = activityEntry.querySelector('time');
                    if (timeEl) {
                        const datetime = timeEl.getAttribute('datetime'); // e.g., "2026-03-15T04:16:44Z"
                        if (datetime) {
                            const dateObj = new Date(datetime);
                            if (dateObj.getMonth() === currentMonthIndex && dateObj.getFullYear() === currentYear) {
                                finalButtons.push(btn);
                            }
                            continue;
                        }
                    }
                }
                // If we can't parse or find time, we include cautiously.
                finalButtons.push(btn);
            }

            if (finalButtons.length === 0) {
                showNotification('All activities in the current month already have kudos! 🏁', 'success');
                resetProfileButton(button);
                return;
            }

            // Step 3: Give Kudos with Delay
            let kudoCount = 0;
            for (const btn of finalButtons) {
                try {
                    btn.click();
                    kudoCount++;
                    button.innerHTML = `<span>Kudoing... (${kudoCount}/${finalButtons.length})</span>`;

                    // Delay 1-2 seconds (randomized like human)
                    const delay = Math.floor(Math.random() * 1000) + 1000;
                    await sleep(delay);
                } catch (error) {
                    console.error('Error giving kudo:', error);
                }
            }

            showNotification(`Successfully gave kudos to ${kudoCount} activities! 🎉`, 'success');
        } catch (error) {
            console.error('Strava Kudo All error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            resetProfileButton(button);
        }
    }

    function resetProfileButton(button) {
        button.disabled = false;
        button.style.background = '#fc4c02';
        button.style.cursor = 'pointer';
        button.innerHTML = `
            <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 6px;">
                <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Kudo All 🔥</span>
        `;
    }

    // --- Other Athletes Stats in Activity Page ---

    function extractActivityId(urlOrPath) {
        if (!urlOrPath) return null;
        const match = urlOrPath.match(/\/activities\/(\d+)/);
        return match ? match[1] : null;
    }

    function parseActivityStats(html) {
        let distance = null;
        let pace = null;
        let hr = null;
        let time = null;
        let isPrivate = false;

        if (!html) {
            return { distance: '—', pace: '—', hr: '—', time: '—', isPrivate: true };
        }

        if (html.includes('Log in to see') || html.includes('This activity is private') || html.includes('Hoạt động này là riêng tư')) {
            isPrivate = true;
        }

        // Strategy 1: DOMParser
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const statItems = doc.querySelectorAll('.inline-stats li, [data-testid="inline-stats"] li, .activity-stats li');
            if (statItems.length > 0) {
                statItems.forEach(item => {
                    const subheadEl = item.querySelector('.stat-subhead, [class*="subhead"], [class*="label"]');
                    const subhead = (subheadEl ? subheadEl.textContent : '').trim().toLowerCase();
                    const valEl = item.querySelector('.stat-value, strong, [class*="value"]');
                    if (valEl) {
                        const text = valEl.textContent.trim().replace(/\s+/g, ' ');
                        if (subhead.includes('distance') || subhead.includes('khoảng cách')) {
                            distance = text;
                        } else if (subhead.includes('pace') || subhead.includes('tốc độ')) {
                            pace = text;
                        } else if (subhead.includes('time') || subhead.includes('thời gian')) {
                            time = text;
                        } else if (subhead.includes('heart rate') || subhead.includes('nhịp tim') || text.includes('bpm')) {
                            hr = text;
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Strava Kudo All: DOMParser failed, trying fallback', e);
        }

        // Strategy 2: Next.js script data
        if (!distance || !pace) {
            try {
                const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
                if (nextDataMatch && nextDataMatch[1]) {
                    const json = JSON.parse(nextDataMatch[1]);
                    const act = json?.props?.pageProps?.activity;
                    if (act) {
                        if (act.distance && !distance) {
                            distance = (act.distance / 1000).toFixed(2) + ' km';
                        }
                        if (act.moving_time && !time) {
                            const mins = Math.floor(act.moving_time / 60);
                            const secs = Math.floor(act.moving_time % 60);
                            time = mins >= 60
                                ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                                : `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                            if (act.distance && act.distance > 0 && !pace) {
                                const paceSecsPerKm = act.moving_time / (act.distance / 1000);
                                const pMin = Math.floor(paceSecsPerKm / 60);
                                const pSec = Math.floor(paceSecsPerKm % 60);
                                pace = `${pMin}:${pSec < 10 ? '0' : ''}${pSec} /km`;
                            }
                        }
                        if (act.average_heartrate && !hr) {
                            hr = `${Math.round(act.average_heartrate)} bpm`;
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        // Strategy 3: Regex fallback on <li> blocks
        if (!distance || !pace) {
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let match;
            while ((match = liRegex.exec(html)) !== null) {
                const block = match[1];
                const subheadMatch = block.match(/class=["'][^"']*stat-subhead[^"']*["']>([^<]+)<\/span>/i);
                const valueMatch = block.match(/class=["'][^"']*stat-value[^"']*["']>([^<]+)(?:<abbr[^>]*>([^<]+)<\/abbr>)?/i);

                if (subheadMatch && valueMatch) {
                    const subhead = subheadMatch[1].trim().toLowerCase();
                    const val = valueMatch[1].trim();
                    const unit = valueMatch[2] ? valueMatch[2].trim() : '';
                    const fullVal = unit ? `${val} ${unit}` : val;

                    if (!distance && (subhead.includes('distance') || subhead.includes('khoảng cách'))) {
                        distance = fullVal;
                    } else if (!pace && (subhead.includes('pace') || subhead.includes('tốc độ'))) {
                        pace = fullVal;
                    } else if (!time && (subhead.includes('time') || subhead.includes('thời gian'))) {
                        time = fullVal;
                    } else if (!hr && (subhead.includes('heart rate') || subhead.includes('nhịp tim') || unit.toLowerCase() === 'bpm')) {
                        hr = fullVal;
                    }
                }
            }
        }

        return {
            distance: distance || '—',
            pace: pace || '—',
            hr: hr || '—',
            time: time || '—',
            isPrivate
        };
    }

    function setupActivityPageObserver() {
        if (activityObserver) {
            activityObserver.disconnect();
        }

        activityObserver = new MutationObserver(() => {
            checkAndInjectGroupStatsButton();
        });

        activityObserver.observe(document.body, { childList: true, subtree: true });

        // Initial check
        checkAndInjectGroupStatsButton();
    }

    function checkAndInjectGroupStatsButton() {
        if (!window.location.pathname.includes('/activities/')) {
            return;
        }

        if (document.getElementById('kudo-load-group-stats-btn')) {
            return;
        }

        const currentActivityId = extractActivityId(window.location.pathname);

        // Find candidate modals or dialogs
        const dialogs = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [data-testid="web-modal"], div[class*="lightbox"]');
        let targetModal = null;
        let otherAthletesLinks = [];

        for (const dialog of dialogs) {
            const links = Array.from(dialog.querySelectorAll('a[href*="/activities/"]'))
                .filter(a => {
                    const id = extractActivityId(a.href);
                    return id && id !== currentActivityId;
                });
            if (links.length > 0) {
                targetModal = dialog;
                otherAthletesLinks = links;
                break;
            }
        }

        // Fallback: check whole document if modal doesn't have role=dialog
        if (!targetModal) {
            const links = Array.from(document.querySelectorAll('a[href*="/activities/"]'))
                .filter(a => {
                    const id = extractActivityId(a.href);
                    return id && id !== currentActivityId;
                });
            const hasLeaveGroup = Array.from(document.querySelectorAll('button, a')).some(el => {
                const text = el.textContent.trim().toLowerCase();
                return text.includes('leave group') || text.includes('rời khỏi nhóm') || text.includes('other athletes');
            });
            if (links.length > 0 && hasLeaveGroup) {
                targetModal = links[0].closest('[role="dialog"], [class*="modal"], [class*="Modal"], div') || document.body;
                otherAthletesLinks = links;
            }
        }

        if (!targetModal || otherAthletesLinks.length === 0) {
            return;
        }

        // Auto-render any athletes already in cache
        otherAthletesLinks.forEach(link => {
            const actId = extractActivityId(link.href);
            if (actId && groupStatsCache.has(actId)) {
                const row = link.closest('li, [class*="athlete"], [class*="item"], [class*="row"]') || link.parentElement;
                if (row && !row.querySelector('.kudo-athlete-stats-row')) {
                    renderAthleteStatsRow(row, link, groupStatsCache.get(actId));
                }
            }
        });

        // Find container to insert the button
        const firstLink = otherAthletesLinks[0];
        const listContainer = firstLink.closest('ul, ol') || firstLink.closest('[class*="list"]') || firstLink.closest('div');

        if (!listContainer || !listContainer.parentElement) {
            return;
        }

        // Avoid duplicate button wrapper
        if (targetModal.querySelector('#kudo-group-stats-btn-wrapper')) {
            return;
        }

        const btnContainer = document.createElement('div');
        btnContainer.id = 'kudo-group-stats-btn-wrapper';
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.padding = '8px 16px';
        btnContainer.style.borderBottom = '1px solid #eee';

        const statsBtn = document.createElement('button');
        statsBtn.id = 'kudo-load-group-stats-btn';
        statsBtn.className = 'kudo-group-stats-btn';
        statsBtn.innerHTML = `
            <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.01-4.09l-2.45-1.45C16.3 17.8 14.28 19 12 19z"/>
            </svg>
            <span>⚡ Tải thông số (${otherAthletesLinks.length} vận động viên)</span>
        `;

        statsBtn.onclick = () => loadGroupAthletesStats(targetModal, statsBtn);

        btnContainer.appendChild(statsBtn);
        listContainer.parentElement.insertBefore(btnContainer, listContainer);
    }

    async function loadGroupAthletesStats(modal, statsBtn) {
        if (!statsBtn) return;
        statsBtn.disabled = true;

        const currentActivityId = extractActivityId(window.location.pathname);
        const links = Array.from(modal.querySelectorAll('a[href*="/activities/"]'))
            .filter(a => {
                const id = extractActivityId(a.href);
                return id && id !== currentActivityId;
            });

        if (links.length === 0) {
            statsBtn.disabled = false;
            showNotification('Không tìm thấy liên kết bài chạy nào trong nhóm', 'info');
            return;
        }

        const athleteItems = [];
        const seenIds = new Set();

        for (const link of links) {
            const actId = extractActivityId(link.href);
            if (!actId || seenIds.has(actId)) continue;
            seenIds.add(actId);
            const row = link.closest('li, [class*="athlete"], [class*="item"], [class*="row"]') || link.parentElement;
            athleteItems.push({ actId, link, row });
        }

        // Render cached items first
        for (const item of athleteItems) {
            if (groupStatsCache.has(item.actId)) {
                renderAthleteStatsRow(item.row, item.link, groupStatsCache.get(item.actId));
            } else {
                renderLoadingStatsRow(item.row, item.link);
            }
        }

        const uncachedItems = athleteItems.filter(item => !groupStatsCache.has(item.actId));
        let processedCount = athleteItems.length - uncachedItems.length;

        for (let i = 0; i < uncachedItems.length; i++) {
            const item = uncachedItems[i];
            statsBtn.innerHTML = `<span>⏳ Đang tải thông số... (${processedCount + 1}/${athleteItems.length})</span>`;

            try {
                const res = await fetch(`/activities/${item.actId}`, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const html = await res.text();
                const stats = parseActivityStats(html);
                groupStatsCache.set(item.actId, stats);
                renderAthleteStatsRow(item.row, item.link, stats);
            } catch (err) {
                console.error(`Strava Kudo All: Error loading activity ${item.actId}`, err);
                renderErrorStatsRow(item.row, item.link);
            }

            processedCount++;
            if (i < uncachedItems.length - 1) {
                await sleep(200); // 200ms throttle
            }
        }

        statsBtn.disabled = false;
        statsBtn.innerHTML = `<span>✅ Đã tải xong (${athleteItems.length})</span>`;
        showNotification(`Đã tải xong thông số của ${athleteItems.length} vận động viên! 🏃`, 'success');

        setTimeout(() => {
            if (statsBtn && !statsBtn.disabled) {
                statsBtn.innerHTML = `
                    <svg class="kudo-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.01-4.09l-2.45-1.45C16.3 17.8 14.28 19 12 19z"/>
                    </svg>
                    <span>⚡ Tải lại thông số</span>
                `;
            }
        }, 4000);
    }

    function renderAthleteStatsRow(row, link, stats) {
        if (!row) return;

        // Remove any existing stats row
        const existing = row.querySelector('.kudo-athlete-stats-row');
        if (existing) {
            existing.remove();
        }

        const statsRow = document.createElement('div');
        statsRow.className = 'kudo-athlete-stats-row';

        if (stats.isPrivate) {
            statsRow.innerHTML = '<span class="kudo-stat-muted">🔒 Hoạt động riêng tư</span>';
        } else {
            let html = '';
            if (stats.distance && stats.distance !== '—') {
                html += `<span class="kudo-stat-badge kudo-stat-highlight" title="Khoảng cách">🏃 ${stats.distance}</span>`;
            }
            if (stats.pace && stats.pace !== '—') {
                html += `<span class="kudo-stat-badge" title="Tốc độ trung bình">⚡ ${stats.pace}</span>`;
            }
            if (stats.hr && stats.hr !== '—') {
                html += `<span class="kudo-stat-badge kudo-stat-hr" title="Nhịp tim trung bình">❤️ ${stats.hr}</span>`;
            } else {
                html += '<span class="kudo-stat-badge" title="Không có dữ liệu nhịp tim" style="opacity: 0.6;">❤️ —</span>';
            }
            if (stats.time && stats.time !== '—') {
                html += `<span class="kudo-stat-badge kudo-stat-time" title="Thời gian chạy">⏱️ ${stats.time}</span>`;
            }
            statsRow.innerHTML = html;
        }

        // Insert row into proper position
        insertStatsRowIntoRow(row, link, statsRow);
    }

    function renderLoadingStatsRow(row, link) {
        if (!row) return;
        const existing = row.querySelector('.kudo-athlete-stats-row');
        if (existing) {
            existing.remove();
        }
        const statsRow = document.createElement('div');
        statsRow.className = 'kudo-athlete-stats-row';
        statsRow.innerHTML = '<span class="kudo-stat-loading">⏳ Đang tải thông số...</span>';
        insertStatsRowIntoRow(row, link, statsRow);
    }

    function renderErrorStatsRow(row, link) {
        if (!row) return;
        const existing = row.querySelector('.kudo-athlete-stats-row');
        if (existing) {
            existing.remove();
        }
        const statsRow = document.createElement('div');
        statsRow.className = 'kudo-athlete-stats-row';
        statsRow.innerHTML = '<span class="kudo-stat-muted">⚠️ Không tải được</span>';
        insertStatsRowIntoRow(row, link, statsRow);
    }

    function insertStatsRowIntoRow(row, link, statsRow) {
        if (!row || !statsRow) return;

        // Strategy 1: Insert after link's immediate parent if it is an inline block
        if (link && link.parentElement && link.parentElement !== row) {
            if (link.parentElement.nextSibling) {
                link.parentElement.parentNode.insertBefore(statsRow, link.parentElement.nextSibling);
            } else {
                link.parentElement.parentNode.appendChild(statsRow);
            }
            return;
        }

        // Strategy 2: If link is direct child of row
        if (link && link.nextSibling) {
            row.insertBefore(statsRow, link.nextSibling);
            return;
        }

        // Strategy 3: Append to row
        row.appendChild(statsRow);
    }

    // Helper function for delays
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
