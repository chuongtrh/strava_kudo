// Strava Kudo All - Content Script
(function () {
    'use strict';

    // Wait for page to be fully loaded
    function init() {
        // Check if we're on the dashboard
        if (!window.location.pathname.includes('/dashboard')) {
            return;
        }

        // Wait a bit for Strava's dynamic content to load
        setTimeout(() => {
            createKudoButton();
        }, 1000);
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
        }
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

            if (unkudoedButtons.length === 0) {
                showNotification('All activities already have kudos! 🎉', 'success');
                resetButton(button);
                return;
            }

            // Give kudos sequentially
            let kudoCount = 0;
            for (const btn of unkudoedButtons) {
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
