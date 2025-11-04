/**
 * Announcement Bar - Cookie-based hide functionality
 * Hides the announcement bar and remembers the choice for 2 days
 */

(function() {
  'use strict';

  // Cookie utility functions
  const Cookie = {
    set: function(name, value, days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = "expires=" + date.toUTCString();
      document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
      console.log('Cookie set:', name, '=', value, 'expires in', days, 'days');
    },
    
    get: function(name) {
      const nameEQ = name + "=";
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
          cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
          const value = cookie.substring(nameEQ.length, cookie.length);
          console.log('Cookie found:', name, '=', value);
          return value;
        }
      }
      console.log('Cookie not found:', name);
      return null;
    },
    
    delete: function(name) {
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
      console.log('Cookie deleted:', name);
    }
  };

  // Initialize announcement bar
  function initAnnouncementBar() {
    console.log('Initializing announcement bar...');
    const announcementBar = document.getElementById('announcement-bar');
    const closeButton = document.getElementById('close-announcement');
    
    if (!announcementBar) {
      console.log('Announcement bar element not found');
      return;
    }
    
    console.log('Announcement bar element found');
    
    // Check if user has hidden the announcement bar
    const isHidden = Cookie.get('qrdx_announcement_hidden');
    
    if (isHidden === 'true') {
      console.log('Hiding announcement bar based on cookie');
      announcementBar.classList.add('hidden');
      announcementBar.style.display = 'none';
      return;
    }
    
    console.log('Announcement bar should be visible');
    
    // Add close button click handler
    if (closeButton) {
      console.log('Close button found, adding event listener');
      closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Close button clicked');
        
        // Hide the announcement bar with animation
        announcementBar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        announcementBar.style.opacity = '0';
        announcementBar.style.transform = 'translateY(-100%)';
        
        setTimeout(function() {
          announcementBar.classList.add('hidden');
          announcementBar.style.display = 'none';
          announcementBar.style.opacity = '';
          announcementBar.style.transform = '';
          console.log('Announcement bar hidden');
        }, 300);
        
        // Set cookie to remember the choice for 2 days
        Cookie.set('qrdx_announcement_hidden', 'true', 2);
      });
    } else {
      console.log('Close button not found');
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    console.log('DOM still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', initAnnouncementBar);
  } else {
    console.log('DOM already loaded, initializing immediately');
    initAnnouncementBar();
  }

  // Re-initialize on navigation (for SPA-like behavior in MkDocs Material)
  document.addEventListener('DOMContentSwitch', function() {
    console.log('DOM content switched, reinitializing');
    initAnnouncementBar();
  });
})();
