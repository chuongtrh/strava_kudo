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

    // Wait for page to be fully loaded
    function init() {
        // Check if we're on the dashboard
        if (!window.location.pathname.includes('/dashboard')) {
            return;
        }

        // Wait a bit for Strava's dynamic content to load
        setTimeout(() => {
            createKudoButton();
            injectIgnoreButtonsToExisting();
            setupMutationObserver();
        }, 1000);
    }

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
