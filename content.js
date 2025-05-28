// Content script for Facebook Automation Tool
console.log('Content script loaded on Facebook');

// Prevent multiple initializations
if (window.fbAutomationInitialized) {
  console.log('Content script already initialized, skipping');
} else {
  window.fbAutomationInitialized = true;
  
  // Global state
  let contentScriptState = {
    processingStarted: false,
    messageText: null,
    chatInterfaceFound: false,
    messageInputElement: null,
    sendButtonElement: null,
    attemptCount: 0,
    maxAttempts: 30,
    inShareDialog: false,
    isTyping: false, // Flag to prevent overlapping typing operations
    originalInputSelector: null, // Store the selector that worked to find the input
    lastTypedText: '', // Track what we've typed so far
    typingMethod: 'default', // Track which typing method worked
    newLeadsOnly: false, // Flag to check if we should only message new leads
    conversationHistoryChecked: false // Flag to track if we've checked for conversation history
  };

  // Initialize content script
  function initialize() {
    console.log('Initializing content script');
    
    // Add CSS for visual feedback
    addStyles();
    
    // Check if we should start processing immediately
    chrome.storage.local.get(['currentOperation'], (result) => {
      if (result.currentOperation && !contentScriptState.processingStarted) {
        console.log('Found pending operation in storage, starting processing');
        contentScriptState.messageText = result.currentOperation.messageText;
        contentScriptState.newLeadsOnly = result.currentOperation.newLeadsOnly || false;
        
        // Add a random delay before starting to appear more natural
        const randomStartDelay = 2000 + Math.floor(Math.random() * 3000);
        console.log(`Adding random delay of ${randomStartDelay}ms before starting`);
        
        setTimeout(() => {
          startProcessing();
        }, randomStartDelay);
      }
    });
  }

  // Add required styles for visual feedback
  function addStyles() {
    if (document.getElementById('fb-automation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'fb-automation-styles';
    style.textContent = `
      .fb-automation-highlight-red {
        outline: 3px solid red !important;
        outline-offset: 2px !important;
        position: relative !important;
        z-index: 9999 !important;
      }
      .fb-automation-highlight-green {
        outline: 3px solid green !important;
        outline-offset: 2px !important;
        position: relative !important;
        z-index: 9999 !important;
      }
      .fb-automation-highlight-blue {
        outline: 3px solid blue !important;
        outline-offset: 2px !important;
        position: relative !important;
        z-index: 9999 !important;
      }
      .fb-automation-tooltip {
        position: fixed !important;
        bottom: 20px !important;
        left: 20px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        padding: 10px 15px !important;
        border-radius: 5px !important;
        z-index: 10000 !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        max-width: 80% !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Start the processing workflow
  function startProcessing() {
    if (contentScriptState.processingStarted) {
      console.log('Processing already started, skipping');
      return;
    }
    
    contentScriptState.processingStarted = true;
    console.log('Starting processing workflow');
    
    // First, get the message text if not already set
    if (!contentScriptState.messageText) {
      chrome.storage.local.get(['currentOperation'], (result) => {
        if (result.currentOperation && result.currentOperation.messageText) {
          contentScriptState.messageText = result.currentOperation.messageText;
          contentScriptState.newLeadsOnly = result.currentOperation.newLeadsOnly || false;
          console.log('Retrieved message text from storage:', contentScriptState.messageText);
          console.log('New leads only setting:', contentScriptState.newLeadsOnly);
          
          // Simulate human browsing behavior before proceeding
          simulateHumanBrowsing(() => {
            navigateToChat();
          });
        } else {
          console.error('No message text found in storage');
          reportResult(false, 'No message text found');
        }
      });
    } else {
      // Simulate human browsing behavior before proceeding
      simulateHumanBrowsing(() => {
        navigateToChat();
      });
    }
  }

  // Simulate human browsing behavior
  function simulateHumanBrowsing(callback) {
    console.log('Simulating human browsing behavior');
    
    // Random scroll positions with natural progression
    const scrollPositions = [];
    
    // Generate 2-3 random scroll positions with natural progression
    const numScrolls = 2 + Math.floor(Math.random() * 2);
    let lastPosition = 0;
    
    for (let i = 0; i < numScrolls; i++) {
      // Generate a position that's somewhat progressive but with some randomness
      const maxJump = 0.3; // Maximum jump in one scroll
      const minJump = 0.05; // Minimum jump in one scroll
      
      // Sometimes scroll back up a bit (20% chance after first scroll)
      const direction = (i > 0 && Math.random() < 0.2) ? -1 : 1;
      
      // Calculate jump size
      const jump = direction * (minJump + Math.random() * (maxJump - minJump));
      
      // Calculate new position
      let newPosition = lastPosition + jump;
      
      // Keep within bounds
      newPosition = Math.max(0, Math.min(1, newPosition));
      
      scrollPositions.push(newPosition);
      lastPosition = newPosition;
    }
    
    let currentScrollIndex = 0;
    
    function performNextScroll() {
      if (currentScrollIndex >= scrollPositions.length) {
        console.log('Finished simulating browsing, proceeding to next step');
        
        // Sometimes move the mouse randomly before proceeding
        if (Math.random() < 0.5) {
          simulateRandomMouseMovement();
          setTimeout(callback, 500 + Math.random() * 500);
        } else {
          callback();
        }
        return;
      }
      
      const scrollPosition = scrollPositions[currentScrollIndex];
      const scrollTarget = document.body.scrollHeight * scrollPosition;
      
      console.log(`Scrolling to position ${scrollPosition * 100}% of page`);
      
      // Smooth scroll to target
      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      });
      
      currentScrollIndex++;
      
      // Random delay between scrolls (0.8-1.5 seconds)
      const scrollDelay = 800 + Math.floor(Math.random() * 700);
      setTimeout(performNextScroll, scrollDelay);
    }
    
    // Start scrolling with initial delay
    setTimeout(performNextScroll, 500);
  }

  // Simulate random mouse movement across the page
  function simulateRandomMouseMovement() {
    const mousePointer = document.createElement('div');
    mousePointer.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: rgba(255, 0, 0, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      transition: all 0.8s ease;
    `;
    document.body.appendChild(mousePointer);
    
    // Set initial position
    mousePointer.style.left = `${Math.random() * window.innerWidth}px`;
    mousePointer.style.top = `${Math.random() * window.innerHeight}px`;
    
    // Move to 1-2 random positions
    const numMoves = 1 + Math.floor(Math.random() * 2);
    let moveCount = 0;
    
    function moveToNextPosition() {
      if (moveCount >= numMoves) {
        if (mousePointer.parentNode) {
          mousePointer.parentNode.removeChild(mousePointer);
        }
        return;
      }
      
      // Move to a new random position
      mousePointer.style.left = `${Math.random() * window.innerWidth}px`;
      mousePointer.style.top = `${Math.random() * window.innerHeight}px`;
      
      moveCount++;
      setTimeout(moveToNextPosition, 800 + Math.random() * 400);
    }
    
    setTimeout(moveToNextPosition, 100);
  }

  // Navigate to the chat interface
  function navigateToChat() {
    console.log('Navigating to chat interface');
    showTooltip('Looking for message button...');
    
    // Check if we're in a share dialog (the issue reported)
    if (isInShareDialog()) {
      console.log('Detected we are in a share dialog, closing it');
      showTooltip('Detected share dialog, closing it...');
      contentScriptState.inShareDialog = true;
      
      // Try to find and click the close button
      const closeButton = findCloseButton();
      if (closeButton) {
        console.log('Found close button, clicking it');
        highlightElement(closeButton, 'red');
        
        // Add a small delay before clicking
        setTimeout(() => {
          closeButton.click();
          console.log('Clicked close button');
          
          // Wait for dialog to close, then try again
          setTimeout(() => {
            contentScriptState.inShareDialog = false;
            navigateToChat();
          }, 1000);
        }, 500);
        return;
      } else {
        console.error('In share dialog but could not find close button');
        reportResult(false, 'In share dialog but could not find close button');
        return;
      }
    }
    
    // Check if we're already on a chat page
    if (window.location.href.includes('/messages/') || 
        document.querySelector('div[contenteditable="true"]')) {
      console.log('Already on a chat page');
      showTooltip('Already on chat page');
      waitForChatInterface();
      return;
    }
    
    // Try multiple approaches to find and click the message button
    const messageButton = findMessageButton();
    
    if (messageButton) {
      console.log('Found message button, clicking it');
      highlightElement(messageButton, 'green');
      showTooltip('Found message button, clicking it...');
      
      // Simulate human-like delay before clicking (0.5-1.5 seconds)
      const clickDelay = 500 + Math.floor(Math.random() * 1000);
      setTimeout(() => {
        try {
          // Move mouse to button position (visual only, doesn't affect click)
          simulateMouseMovement(messageButton);
          
          // Click the button
          messageButton.click();
          console.log('Clicked message button');
          
          // Wait for chat interface to load after clicking
          // Use a fixed delay of 5 seconds as requested
          console.log('Waiting 5 seconds for chat interface to load');
          showTooltip('Waiting for chat interface to load...');
          
          setTimeout(() => {
            // After clicking, check if we ended up in a share dialog
            if (isInShareDialog()) {
              console.log('Ended up in share dialog after clicking message button');
              contentScriptState.inShareDialog = true;
              
              // Try to find and click the "Send in Messenger" option
              const messengerOption = findMessengerOption();
              if (messengerOption) {
                console.log('Found Messenger option, clicking it');
                highlightElement(messengerOption, 'green');
                
                setTimeout(() => {
                  messengerOption.click();
                  console.log('Clicked Messenger option');
                  
                  // Wait for messenger to open
                  setTimeout(() => {
                    contentScriptState.inShareDialog = false;
                    waitForChatInterface();
                  }, 3000);
                }, 500);
              } else {
                // If we can't find the Messenger option, try to close the dialog
                const closeButton = findCloseButton();
                if (closeButton) {
                  console.log('Could not find Messenger option, closing dialog');
                  highlightElement(closeButton, 'red');
                  
                  setTimeout(() => {
                    closeButton.click();
                    console.log('Clicked close button');
                    
                    // Try a different approach after closing
                    setTimeout(() => {
                      contentScriptState.inShareDialog = false;
                      tryAlternativeMessageApproach();
                    }, 1000);
                  }, 500);
                } else {
                  console.error('In share dialog but could not find close button or Messenger option');
                  reportResult(false, 'Could not navigate to chat from share dialog');
                }
              }
            } else {
              // Normal flow - wait for chat interface
              waitForChatInterface();
            }
          }, 5000); // Fixed 5 second delay as requested
        } catch (e) {
          console.error('Error clicking message button:', e);
          reportResult(false, 'Error clicking message button');
        }
      }, clickDelay);
    } else {
      console.error('Could not find message button');
      showTooltip('Could not find message button. Try a different profile or check if you are logged in.');
      reportResult(false, 'Message button not found');
    }
  }

  // Check if we're in a share dialog
  function isInShareDialog() {
    // Look for elements that indicate we're in a share dialog
    const shareDialogIndicators = [
      // Title says "Share"
      document.querySelector('h2[aria-level="2"]:not([aria-hidden="true"])'),
      // Share now button
      document.querySelector('div[role="button"]:not([aria-hidden="true"])[aria-label*="Share now"]')
    ];
    
    // Check each indicator
    for (const indicator of shareDialogIndicators) {
      if (indicator) {
        const text = indicator.textContent.toLowerCase();
        if (text.includes('share') || text.includes('messenger') || text.includes('send in')) {
          console.log('Share dialog indicator found:', text);
          return true;
        }
      }
    }
    
    // Check for "Send in Messenger" or "Share to" text in any span or div
    const textElements = document.querySelectorAll('div:not([aria-hidden="true"]) span, div:not([aria-hidden="true"]) div');
    for (const element of textElements) {
      const text = element.textContent.toLowerCase().trim();
      if (text === 'send in messenger' || text === 'share to') {
        console.log('Share dialog text found:', text);
        return true;
      }
    }
    
    // Check for "Share" text in any heading
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      if (heading.textContent.trim().toLowerCase() === 'share') {
        console.log('Share dialog heading found');
        return true;
      }
    }
    
    // Check for specific share dialog layout
    const shareLayout = document.querySelector('div[role="dialog"] div[role="button"][aria-label="Close"]');
    if (shareLayout) {
      console.log('Share dialog layout detected');
      return true;
    }
    
    return false;
  }

  // Find the close button in a dialog
  function findCloseButton() {
    // Try multiple selectors for close buttons
    const closeSelectors = [
      'div[role="button"][aria-label="Close"]',
      'button[aria-label="Close"]',
      'div[role="button"] svg[aria-label="Close"]',
      'button svg[aria-label="Close"]'
    ];
    
    for (const selector of closeSelectors) {
      try {
        const closeButtons = document.querySelectorAll(selector);
        for (const button of closeButtons) {
          if (isElementVisible(button)) {
            return button;
          }
        }
      } catch (e) {
        console.log(`Error with selector ${selector}:`, e);
      }
    }
    
    // Try to find by position (usually top-right corner)
    const dialogElement = document.querySelector('div[role="dialog"]');
    if (dialogElement) {
      const dialogRect = dialogElement.getBoundingClientRect();
      const topRightX = dialogRect.right - 40; // 40px from right edge
      const topRightY = dialogRect.top + 40; // 40px from top edge
      
      // Look for elements near the top-right corner
      const potentialCloseButtons = document.querySelectorAll('div[role="button"], button');
      for (const button of potentialCloseButtons) {
        if (!isElementVisible(button)) continue;
        
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Check if button is near the top-right corner
        if (Math.abs(centerX - topRightX) < 50 && Math.abs(centerY - topRightY) < 50) {
          console.log('Found potential close button by position');
          return button;
        }
      }
    }
    
    return null;
  }

  // Find the "Send in Messenger" option in the share dialog
  function findMessengerOption() {
    console.log('Looking for Messenger option in share dialog');
    
    // Look for elements containing "Messenger" text
    const messengerElements = Array.from(document.querySelectorAll('div, span, a')).filter(el => {
      const text = el.textContent.toLowerCase();
      return text.includes('messenger') && isElementVisible(el);
    });
    
    // Find the most specific clickable element
    for (const element of messengerElements) {
      // Check if this element or its parent is clickable
      const clickableElement = findClickableParent(element);
      if (clickableElement) {
        console.log('Found clickable Messenger option:', clickableElement);
        return clickableElement;
      }
    }
    
    // Look specifically for the "Send in Messenger" section
    const sendInMessengerText = Array.from(document.querySelectorAll('div, span')).find(el => 
      el.textContent.toLowerCase().trim() === 'send in messenger' && isElementVisible(el)
    );
    
    if (sendInMessengerText) {
      // Look for clickable elements near this text
      const parent = sendInMessengerText.parentElement;
      if (parent) {
        // Look for profile pictures or clickable elements in the same section
        const profilePics = parent.querySelectorAll('img[src*="profile"]');
        for (const pic of profilePics) {
          const clickable = findClickableParent(pic);
          if (clickable) {
            console.log('Found profile picture in Messenger section');
            return clickable;
          }
        }
        
        // Look for any clickable element in this section
        const clickables = parent.querySelectorAll('div[role="button"], a[role="link"]');
        for (const clickable of clickables) {
          if (isElementVisible(clickable)) {
            console.log('Found clickable element in Messenger section');
            return clickable;
          }
        }
      }
    }
    
    return null;
  }

  // Find a clickable parent element
  function findClickableParent(element) {
    let current = element;
    const maxLevels = 5; // Don't go too far up the tree
    
    for (let i = 0; i < maxLevels && current; i++) {
      // Check if this element is clickable
      if (current.tagName === 'A' || 
          current.tagName === 'BUTTON' || 
          current.getAttribute('role') === 'button' ||
          current.getAttribute('role') === 'link') {
        return current;
      }
      
      // Move up to parent
      current = current.parentElement;
    }
    
    return null;
  }

  // Try alternative approaches to start a message
  function tryAlternativeMessageApproach() {
    console.log('Trying alternative approach to start a message');
    showTooltip('Trying alternative messaging approach...');
    
    // Try to find a direct message link
    const messageLinks = Array.from(document.querySelectorAll('a')).filter(link => {
      const href = link.href || '';
      return href.includes('/messages/t/') || href.includes('/messaging/');
    });
    
    if (messageLinks.length > 0) {
      console.log('Found direct message link, clicking it');
      highlightElement(messageLinks[0], 'green');
      
      setTimeout(() => {
        messageLinks[0].click();
        
        // Wait for chat interface to load
        setTimeout(() => {
          waitForChatInterface();
        }, 5000);
      }, 500);
      return;
    }
    
    // Try to find any "Message" text on the page
    const messageTexts = Array.from(document.querySelectorAll('div, span, a')).filter(el => {
      const text = el.textContent.toLowerCase().trim();
      return (text === 'message' || text === 'send message' || text.includes('message ')) && 
             isElementVisible(el);
    });
    
    if (messageTexts.length > 0) {
      const messageElement = messageTexts[0];
      console.log('Found message text element, looking for clickable parent');
      
      const clickable = findClickableParent(messageElement);
      if (clickable) {
        console.log('Found clickable message element, clicking it');
        highlightElement(clickable, 'green');
        
        setTimeout(() => {
          clickable.click();
          
          // Wait for chat interface to load
          setTimeout(() => {
            waitForChatInterface();
          }, 5000);
        }, 500);
        return;
      }
    }
    
    // If all else fails, try to construct a message URL
    try {
      const currentUrl = window.location.href;
      const usernameMatch = currentUrl.match(/facebook\.com\/([^\/\?]+)/);
      
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        console.log('Extracted username from URL:', username);
        
        // Construct a message URL
        const messageUrl = `https://www.facebook.com/messages/t/${username}`;
        console.log('Constructed message URL:', messageUrl);
        
        // Navigate to the message URL
        showTooltip('Navigating directly to message URL...');
        window.location.href = messageUrl;
        return;
      }
    } catch (e) {
      console.error('Error constructing message URL:', e);
    }
    
    // If all approaches fail
    console.error('All messaging approaches failed');
    reportResult(false, 'Could not find a way to start messaging');
  }

  // Simulate mouse movement to an element (visual feedback only)
  function simulateMouseMovement(element) {
    if (!element) return;
    
    // Create a temporary div to show mouse movement
    const mousePointer = document.createElement('div');
    mousePointer.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: rgba(255, 0, 0, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      transition: all 0.5s ease;
    `;
    document.body.appendChild(mousePointer);
    
    // Get element position
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    // Set initial position (random starting point)
    mousePointer.style.left = `${Math.random() * window.innerWidth}px`;
    mousePointer.style.top = `${Math.random() * window.innerHeight}px`;
    
    // Create 1-2 intermediate points for a more natural curve
    const numPoints = 1 + Math.floor(Math.random() * 2);
    const points = [];
    
    // Current position
    const startX = parseInt(mousePointer.style.left);
    const startY = parseInt(mousePointer.style.top);
    
    // Generate intermediate points
    for (let i = 0; i < numPoints; i++) {
      const ratio = (i + 1) / (numPoints + 1);
      
      // Calculate a point along the path with some randomness
      const pointX = startX + (targetX - startX) * ratio + (Math.random() * 100 - 50);
      const pointY = startY + (targetY - startY) * ratio + (Math.random() * 100 - 50);
      
      points.push({ x: pointX, y: pointY });
    }
    
    // Move through intermediate points
    let currentPoint = 0;
    
    function moveToNextPoint() {
      if (currentPoint >= points.length) {
        // Final move to target
        mousePointer.style.left = `${targetX}px`;
        mousePointer.style.top = `${targetY}px`;
        
        // Remove the pointer after movement completes
        setTimeout(() => {
          if (mousePointer.parentNode) {
            mousePointer.parentNode.removeChild(mousePointer);
          }
        }, 600);
        
        return;
      }
      
      // Move to intermediate point
      mousePointer.style.left = `${points[currentPoint].x}px`;
      mousePointer.style.top = `${points[currentPoint].y}px`;
      
      currentPoint++;
      setTimeout(moveToNextPoint, 200 + Math.random() * 300);
    }
    
    // Start movement after a small delay
    setTimeout(moveToNextPoint, 100);
  }

  // Find the message button using multiple strategies
  function findMessageButton() {
    console.log('Looking for message button');
    
    // Strategy 1: Look for exact "Message" buttons with role="button"
    const messageButtons = Array.from(document.querySelectorAll('div[role="button"], button')).filter(el => {
      const text = el.textContent.toLowerCase().trim();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      
      return (text === 'message' || ariaLabel === 'message' || 
              ariaLabel === 'send message' || ariaLabel.includes('message '));
    });
    
    if (messageButtons.length > 0) {
      console.log('Found message button (strategy 1)');
      return messageButtons[0];
    }
    
    // Strategy 2: Look for "Send Message" or "Message [Name]" buttons
    const sendMessageButtons = Array.from(document.querySelectorAll('div[role="button"], button, a')).filter(el => {
      const text = el.textContent.toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      
      return (text.includes('send message') || 
              text.includes('message ') || 
              ariaLabel.includes('send message') || 
              ariaLabel.includes('message '));
    });
    
    if (sendMessageButtons.length > 0) {
      console.log('Found send message button (strategy 2)');
      return sendMessageButtons[0];
    }
    
    // Strategy 3: Look for message links
    const messageLinks = Array.from(document.querySelectorAll('a')).filter(el => {
      const href = el.href || '';
      return (href.includes('/messages/') || href.includes('/messaging/'));
    });
    
    if (messageLinks.length > 0) {
      console.log('Found message link (strategy 3)');
      return messageLinks[0];
    }
    
    // Strategy 4: Look for chat icon buttons
    const chatIcons = Array.from(document.querySelectorAll('div[role="button"], button')).filter(el => {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      return ariaLabel.includes('chat') || ariaLabel.includes('message');
    });
    
    if (chatIcons.length > 0) {
      console.log('Found chat icon button (strategy 4)');
      return chatIcons[0];
    }
    
    // No message button found
    return null;
  }

  // Wait for chat interface to be fully loaded
  function waitForChatInterface() {
    contentScriptState.attemptCount++;
    console.log(`Checking for chat interface, attempt ${contentScriptState.attemptCount}/${contentScriptState.maxAttempts}`);
    showTooltip(`Looking for chat input field... (${contentScriptState.attemptCount}/${contentScriptState.maxAttempts})`);
    
    // Check if we ended up in a share dialog
    if (isInShareDialog()) {
      console.log('Detected share dialog while waiting for chat interface');
      contentScriptState.inShareDialog = true;
      
      // Try to find and click the close button
      const closeButton = findCloseButton();
      if (closeButton) {
        console.log('Found close button, clicking it');
        highlightElement(closeButton, 'red');
        
        setTimeout(() => {
          closeButton.click();
          console.log('Clicked close button');
          
          // Reset attempt count and try again
          contentScriptState.attemptCount = 0;
          contentScriptState.inShareDialog = false;
          
          setTimeout(() => {
            tryAlternativeMessageApproach();
          }, 1000);
        }, 500);
        return;
      }
    }
    
    // If we already found the chat interface, proceed to checking for conversation history
    if (contentScriptState.chatInterfaceFound && contentScriptState.messageInputElement) {
      console.log('Chat interface already found, checking for conversation history');
      
      // If newLeadsOnly is enabled and we haven't checked for conversation history yet
      if (contentScriptState.newLeadsOnly && !contentScriptState.conversationHistoryChecked) {
        checkForConversationHistory();
      } else {
        // Otherwise proceed to sending the message
        sendMessage();
      }
      return;
    }
    
    // Try to find the chat input field
    const messageInput = findChatInputField();
    
    if (messageInput) {
      console.log('Found chat input field:', messageInput);
      highlightElement(messageInput, 'green');
      showTooltip('Found chat input field, checking conversation history...');
      
      contentScriptState.chatInterfaceFound = true;
      contentScriptState.messageInputElement = messageInput;
      
      // Also try to find the send button now
      contentScriptState.sendButtonElement = findSendButton();
      
      // If newLeadsOnly is enabled, check for conversation history
      if (contentScriptState.newLeadsOnly) {
        checkForConversationHistory();
      } else {
        // Otherwise proceed to sending the message after a natural delay (1-3 seconds)
        const typingDelay = 1000 + Math.floor(Math.random() * 2000);
        setTimeout(() => {
          sendMessage();
        }, typingDelay);
      }
    } else if (contentScriptState.attemptCount < contentScriptState.maxAttempts) {
      // Not found yet, try again after a delay
      // Use variable delay to appear more natural
      const retryDelay = 800 + Math.floor(Math.random() * 400);
      setTimeout(waitForChatInterface, retryDelay);
    } else {
      // Exceeded max attempts
      console.error('Failed to find chat interface after multiple attempts');
      showTooltip('Failed to find chat input field. Facebook interface might have changed.');
      reportResult(false, 'Chat input field not found');
    }
  }

  // Check if there's existing conversation history
  function checkForConversationHistory() {
    console.log('Checking for existing conversation history');
    showTooltip('Checking if this is a new lead...');
    
    contentScriptState.conversationHistoryChecked = true;
    
    // Look for message bubbles or conversation elements
    const messageElements = document.querySelectorAll(
      'div[role="row"], ' +
      'div[data-testid="message-container"], ' +
      'div[aria-label*="message"], ' +
      'div[aria-label*="Message"], ' +
      'div.message-container, ' +
      'div.conversation-item'
    );
    
    // Check if there are any message elements
    const hasConversationHistory = messageElements.length > 0;
    console.log(`Found ${messageElements.length} message elements, conversation history exists: ${hasConversationHistory}`);
    
    // If no obvious message elements, try looking for text content that might indicate messages
    if (!hasConversationHistory) {
      // Look for elements that might contain message text
      const potentialMessageContainers = document.querySelectorAll('div[role="main"] div');
      
      for (const container of potentialMessageContainers) {
        // Skip tiny elements or hidden elements
        if (!isElementVisible(container)) continue;
        
        const rect = container.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) continue;
        
        // Check if this element has text content that looks like a message
        const text = container.textContent.trim();
        if (text.length > 10 && text.length < 1000) {
          console.log('Found potential message text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
          
          // If we find something that looks like a message, consider it conversation history
          if (text.length > 20) {
            console.log('Detected conversation history based on text content');
            
            // Report to background script
            chrome.runtime.sendMessage({
              action: 'conversationHistoryCheck',
              hasHistory: true
            });
            
            return;
          }
        }
      }
    }
    
    // Report the result to the background script
    chrome.runtime.sendMessage({
      action: 'conversationHistoryCheck',
      hasHistory: hasConversationHistory
    });
    
    // If there's no history and we're not waiting for a response from the background script,
    // proceed with sending the message
    if (!hasConversationHistory) {
      // Wait for a response from the background script before proceeding
      console.log('No conversation history found, waiting for background script decision');
      showTooltip('New lead detected, preparing to send message...');
    } else {
      console.log('Conversation history found, waiting for background script decision');
      showTooltip('Previous conversation detected, checking settings...');
    }
  }

  // Find the chat input field
  function findChatInputField() {
    console.log('Looking for chat input field');
    
    // First check for iframe
    const iframe = document.querySelector('iframe[src*="messenger"], iframe[id*="maw-intermediate-iframe"]');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const inputBox = iframeDoc.querySelector('[contenteditable="true"][role="textbox"][aria-label*="Message"]');
        
        if (inputBox && isElementVisible(inputBox, iframeDoc)) {
          console.log('Found message input in iframe!');
          contentScriptState.originalInputSelector = 'iframe-textbox';
          return inputBox;
        }
      } catch (e) {
        console.log('Error accessing iframe:', e);
      }
    }
    
    // Try the main document
    const inputBox = document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="Message"]');
    if (inputBox && isElementVisible(inputBox)) {
      console.log('Found message input in main document!');
      contentScriptState.originalInputSelector = 'main-textbox';
      return inputBox;
    }
    
    // Try other selectors
    const selectors = [
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      'div[aria-label*="Message"]',
      'div[aria-label*="message"]',
      'div[data-lexical-editor="true"]',
      'div[aria-label*="Type a message"]',
      'div[aria-label*="type a message"]'
    ];
    
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (isElementVisible(element)) {
          console.log('Found message input using selector:', selector);
          contentScriptState.originalInputSelector = `selector-${i}`;
          return element;
        }
      }
    }
    
    // Try XPath as a last resort
    try {
      const specificXPath = '/html/body/div[2]/div/div[1]/div/div[5]/div[1]/div[1]/div[1]/div/div/div/div/div/div/div/div[2]/div[2]/div/div[2]/div[5]/div';
      const xpathResult = document.evaluate(specificXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const messageInput = xpathResult.singleNodeValue;
      
      if (messageInput && isElementVisible(messageInput)) {
        console.log('Found message input using specific XPath!');
        contentScriptState.originalInputSelector = 'xpath';
        return messageInput;
      }
    } catch (e) {
      console.log('Error using XPath:', e);
    }
    
    // No chat input found
    return null;
  }

  // Re-find the input element after it might have changed
  function refindInputElement() {
    console.log('Re-finding input element after possible change');
    
    // First try to use the original selector that worked
    if (contentScriptState.originalInputSelector) {
      if (contentScriptState.originalInputSelector === 'iframe-textbox') {
        const iframe = document.querySelector('iframe[src*="messenger"], iframe[id*="maw-intermediate-iframe"]');
        if (iframe) {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const inputBox = iframeDoc.querySelector('[contenteditable="true"][role="textbox"][aria-label*="Message"]');
            
            if (inputBox && isElementVisible(inputBox, iframeDoc)) {
              console.log('Re-found message input in iframe!');
              return inputBox;
            }
          } catch (e) {
            console.log('Error accessing iframe during re-find:', e);
          }
        }
      } else if (contentScriptState.originalInputSelector === 'main-textbox') {
        const inputBox = document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="Message"]');
        if (inputBox && isElementVisible(inputBox)) {
          console.log('Re-found message input in main document!');
          return inputBox;
        }
      } else if (contentScriptState.originalInputSelector.startsWith('selector-')) {
        const selectorIndex = parseInt(contentScriptState.originalInputSelector.split('-')[1]);
        const selectors = [
          'div[contenteditable="true"]',
          'div[role="textbox"]',
          'div[aria-label*="Message"]',
          'div[aria-label*="message"]',
          'div[data-lexical-editor="true"]',
          'div[aria-label*="Type a message"]',
          'div[aria-label*="type a message"]'
        ];
        
        if (selectorIndex >= 0 && selectorIndex < selectors.length) {
          const elements = document.querySelectorAll(selectors[selectorIndex]);
          for (const element of elements) {
            if (isElementVisible(element)) {
              console.log('Re-found message input using original selector:', selectors[selectorIndex]);
              return element;
            }
          }
        }
      } else if (contentScriptState.originalInputSelector === 'xpath') {
        try {
          const specificXPath = '/html/body/div[2]/div/div[1]/div/div[5]/div[1]/div[1]/div[1]/div/div/div/div/div/div/div/div[2]/div[2]/div/div[2]/div[5]/div';
          const xpathResult = document.evaluate(specificXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const messageInput = xpathResult.singleNodeValue;
          
          if (messageInput && isElementVisible(messageInput)) {
            console.log('Re-found message input using specific XPath!');
            return messageInput;
          }
        } catch (e) {
          console.log('Error using XPath during re-find:', e);
        }
      }
    }
    
    // If original selector failed, try all methods
    console.log('Original selector failed, trying all methods to re-find input');
    return findChatInputField();
  }

  // Find the send button
  function findSendButton() {
    console.log('Looking for send button');
    
    const sendButtonSelectors = [
      'div[aria-label="Press Enter to send"]',
      'button[type="submit"]',
      'div[role="button"][aria-label*="Send"]',
      'div[role="button"][aria-label*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]'
    ];
    
    for (const selector of sendButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        if (isElementVisible(button)) {
          console.log('Found send button using selector:', selector);
          return button;
        }
      }
    }
    
    console.log('No send button found, will use Enter key as fallback');
    return null;
  }

  // Function to delay execution
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Send the message using human-like keystroke simulation
  async function sendMessage() {
    if (!contentScriptState.messageInputElement) {
      console.error('No message input element found');
      reportResult(false, 'No message input element found');
      return;
    }
    
    if (!contentScriptState.messageText) {
      console.error('No message text to send');
      reportResult(false, 'No message text to send');
      return;
    }
    
    // Prevent multiple typing operations
    if (contentScriptState.isTyping) {
      console.log('Already typing, skipping duplicate call');
      return;
    }
    
    contentScriptState.isTyping = true;
    
    console.log('Preparing to send message:', contentScriptState.messageText);
    showTooltip('Preparing to type message...');
    
    try {
      // Focus the input element
      contentScriptState.messageInputElement.focus();
      await delay(300);
      
      // Clear any existing text
      contentScriptState.messageInputElement.textContent = '';
      await delay(500);
      
      // Reset typing state
      contentScriptState.lastTypedText = '';
      
      // Try multiple typing methods until one works
      let success = false;
      
      // Method 1: Try direct typing with keyboard events
      success = await typeMessageWithKeyboardEvents(contentScriptState.messageInputElement, contentScriptState.messageText);
      
      // Method 2: If keyboard events failed, try clipboard paste
      if (!success) {
        console.log('Keyboard events method failed, trying clipboard paste method');
        contentScriptState.typingMethod = 'clipboard';
        success = await typeMessageWithClipboard(contentScriptState.messageInputElement, contentScriptState.messageText);
      }
      
      // Method 3: If both failed, try direct textContent assignment
      if (!success) {
        console.log('Both keyboard and clipboard methods failed, trying direct assignment');
        contentScriptState.typingMethod = 'direct';
        success = await typeMessageDirectly(contentScriptState.messageInputElement, contentScriptState.messageText);
      }
      
      if (!success) {
        throw new Error('All typing methods failed');
      }
      
      // Send the message
      await sendTypedMessage();
      
      // Report success
      reportResult(true, 'Message sent successfully');
    } catch (e) {
      console.error('Error sending message:', e);
      reportResult(false, 'Error sending message: ' + e.message);
    } finally {
      contentScriptState.isTyping = false;
    }
  }

  // Type message using actual keyboard events for better compatibility with Facebook's editor
  async function typeMessageWithKeyboardEvents(element, message) {
    console.log('Typing message with keyboard events');
    showTooltip('Typing message...');
    contentScriptState.typingMethod = 'keyboard';
    
    try {
      // Split message into chunks for more natural typing
      const chunks = message.split(/([.!?,;]\s+)/).filter(s => s.trim());
      
      // If no chunks, treat the whole message as one chunk
      const textChunks = chunks.length > 0 ? chunks : [message];
      
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        
        // Longer pause between chunks
        if (i > 0) {
          await delay(500 + Math.random() * 700);
        }
        
        // Type the chunk character by character
        for (let j = 0; j < chunk.length; j++) {
          // Make sure we're not in a share dialog
          if (isInShareDialog()) {
            console.log('Detected share dialog during typing, closing it');
            const closeButton = findCloseButton();
            if (closeButton) {
              closeButton.click();
              await delay(1000);
              element.focus();
            }
          }
          
          // Re-find the input element after the first character (to handle Facebook's expanding text field)
          if (j === 1) {
            console.log('First character typed, re-finding input element to handle expansion');
            const newElement = refindInputElement();
            if (newElement && newElement !== element) {
              console.log('Input element changed after first character, updating reference');
              element = newElement;
              contentScriptState.messageInputElement = newElement;
              element.focus();
              await delay(300);
            }
          }
          
          const char = chunk[j];
          
          // Try multiple approaches to insert the character
          let charInserted = false;
          
          // Approach 1: Use keyboard events
          try {
            // KeyDown event
            const keyDownEvent = new KeyboardEvent('keydown', {
              key: char,
              code: 'Key' + char.toUpperCase(),
              keyCode: char.charCodeAt(0),
              which: char.charCodeAt(0),
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(keyDownEvent);
            await delay(10); // Small delay between events
            
            // Input event - this is critical for React-based editors
            const inputEvent = new InputEvent('input', {
              inputType: 'insertText',
              data: char,
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(inputEvent);
            await delay(10);
            
            // KeyUp event
            const keyUpEvent = new KeyboardEvent('keyup', {
              key: char,
              code: 'Key' + char.toUpperCase(),
              keyCode: char.charCodeAt(0),
              which: char.charCodeAt(0),
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(keyUpEvent);
            
            // Check if character was inserted
            await delay(50);
            if (element.textContent && element.textContent.includes(contentScriptState.lastTypedText + char)) {
              charInserted = true;
              contentScriptState.lastTypedText += char;
            }
          } catch (e) {
            console.log('Error with keyboard events:', e);
          }
          
          // Approach 2: If keyboard events didn't work, try execCommand
          if (!charInserted) {
            try {
              document.execCommand('insertText', false, char);
              await delay(50);
              
              if (element.textContent && element.textContent.includes(contentScriptState.lastTypedText + char)) {
                charInserted = true;
                contentScriptState.lastTypedText += char;
              }
            } catch (e) {
              console.log('Error with execCommand:', e);
            }
          }
          
          // Approach 3: Direct DOM manipulation as last resort
          if (!charInserted) {
            try {
              // Try to insert at cursor position if possible
              const selection = window.getSelection();
              if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(char);
                range.insertNode(textNode);
                
                // Move cursor after inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
                
                await delay(50);
                if (element.textContent && element.textContent.includes(contentScriptState.lastTypedText + char)) {
                  charInserted = true;
                  contentScriptState.lastTypedText += char;
                }
              }
            } catch (e) {
              console.log('Error with direct DOM manipulation:', e);
            }
          }
          
          // If all approaches failed for this character, try appending to textContent
          if (!charInserted) {
            try {
              const currentText = element.textContent || '';
              element.textContent = currentText + char;
              
              await delay(50);
              if (element.textContent && element.textContent.includes(contentScriptState.lastTypedText + char)) {
                charInserted = true;
                contentScriptState.lastTypedText += char;
              }
            } catch (e) {
              console.log('Error with textContent assignment:', e);
            }
          }
          
          // If we still couldn't insert the character, log the failure
          if (!charInserted) {
            console.error(`Failed to insert character: ${char}`);
          }
          
          // Random typing delay (50-150ms) with occasional longer pauses
          let typingDelay = 50 + Math.floor(Math.random() * 100);
          
          // Occasionally add a longer pause (10% chance)
          if (Math.random() < 0.1) {
            typingDelay += 300 + Math.floor(Math.random() * 500);
          }
          
          await delay(typingDelay);
          
          // Show progress occasionally
          if (j % 5 === 0 || j === chunk.length - 1) {
            const totalLength = message.length;
            const typedLength = textChunks.slice(0, i).join('').length + j + 1;
            const progress = Math.round((typedLength / totalLength) * 100);
            showTooltip(`Typing message... ${progress}%`);
          }
          
          // Every 2 characters, check if we need to re-find the input element
          if (j > 0 && j % 2 === 0) {
            const newElement = refindInputElement();
            if (newElement && newElement !== element) {
              console.log('Input element changed during typing, updating reference');
              element = newElement;
              contentScriptState.messageInputElement = newElement;
              element.focus();
              await delay(300);
            }
          }
          
          // Verify progress every 5 characters
          if (j > 0 && j % 5 === 0) {
            // Check if we're making progress
            if (element.textContent && element.textContent.length < contentScriptState.lastTypedText.length / 2) {
              console.log('Text content appears incomplete, typing may be failing');
              // Return false to indicate this method is failing
              return false;
            }
          }
        }
      }
      
      // Pause before sending (as if reviewing the message)
      await delay(1000 + Math.random() * 1000);
      showTooltip('Message typed, preparing to send...');
      
      // Final check to ensure text was entered
      console.log('Final text content:', element.textContent);
      console.log('Expected text content:', message);
      
      // If text content is less than half the expected length, consider it a failure
      if (!element.textContent || element.textContent.length < message.length / 2) {
        console.log('Text content appears incomplete, keyboard method failed');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Error in keyboard typing method:', e);
      return false;
    }
  }

  // Type message using clipboard paste method
  async function typeMessageWithClipboard(element, message) {
    console.log('Typing message with clipboard paste method');
    showTooltip('Typing message using clipboard...');
    
    try {
      // Focus the element
      element.focus();
      await delay(300);
      
      // Clear any existing text
      element.textContent = '';
      await delay(300);
      
      // Try to use the clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(message);
          console.log('Copied message to clipboard');
          
          // Create and dispatch paste event
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          
          // Set the clipboard data
          pasteEvent.clipboardData.setData('text/plain', message);
          
          element.dispatchEvent(pasteEvent);
          console.log('Dispatched paste event');
          
          // Check if paste worked
          await delay(500);
          if (element.textContent && element.textContent.includes(message)) {
            contentScriptState.lastTypedText = message;
            return true;
          }
        } catch (e) {
          console.log('Error using Clipboard API:', e);
        }
      }
      
      // Fallback: Try using execCommand for paste
      try {
        // Create a temporary textarea to hold the text
        const textarea = document.createElement('textarea');
        textarea.value = message;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        
        // Copy the text
        const copySuccess = document.execCommand('copy');
        if (copySuccess) {
          console.log('Copied message using execCommand');
          
          // Focus back on the input element
          element.focus();
          await delay(300);
          
          // Paste the text
          const pasteSuccess = document.execCommand('paste');
          console.log('Paste result:', pasteSuccess);
          
          // Check if paste worked
          await delay(500);
          if (element.textContent && element.textContent.includes(message)) {
            contentScriptState.lastTypedText = message;
            document.body.removeChild(textarea);
            return true;
          }
        }
        
        document.body.removeChild(textarea);
      } catch (e) {
        console.log('Error using execCommand for paste:', e);
      }
      
      return false;
    } catch (e) {
      console.error('Error in clipboard paste method:', e);
      return false;
    }
  }

  // Type message directly by setting textContent
  async function typeMessageDirectly(element, message) {
    console.log('Typing message directly by setting textContent');
    showTooltip('Typing message directly...');
    
    try {
      // Focus the element
      element.focus();
      await delay(300);
      
      // Set the text content directly
      element.textContent = message;
      
      // Dispatch an input event to notify React
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(inputEvent);
      
      // Check if direct assignment worked
      await delay(500);
      if (element.textContent && element.textContent.includes(message)) {
        contentScriptState.lastTypedText = message;
        return true;
      }
      
      // Try using innerHTML as a last resort
      element.innerHTML = message.replace(/\n/g, '<br>');
      
      // Dispatch another input event
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true
      }));
      
      await delay(500);
      return element.textContent && element.textContent.includes(message);
    } catch (e) {
      console.error('Error in direct typing method:', e);
      return false;
    }
  }

  // Send the typed message
  async function sendTypedMessage() {
    console.log('Sending typed message');
    showTooltip('Sending message...');
    
    // Re-find the send button as it might have changed
    contentScriptState.sendButtonElement = findSendButton();
    
    // First try clicking the send button if available
    if (contentScriptState.sendButtonElement && isElementVisible(contentScriptState.sendButtonElement)) {
      console.log('Using send button to send message');
      highlightElement(contentScriptState.sendButtonElement, 'green');
      
      // Click the send button
      contentScriptState.sendButtonElement.click();
      
      // Wait to ensure message is sent
      await delay(1000);
      return;
    }
    
    // If no send button, use Enter key
    console.log('Using Enter key to send message');
    
    // Make sure the input element is focused
    contentScriptState.messageInputElement.focus();
    await delay(200);
    
    // Create and dispatch Enter key events
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    contentScriptState.messageInputElement.dispatchEvent(enterKeyEvent);
    
    // Also try to dispatch a keypress event for older browsers
    const enterKeyPressEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    contentScriptState.messageInputElement.dispatchEvent(enterKeyPressEvent);
    
    // Wait a moment and dispatch keyup
    await delay(50);
    
    const enterKeyUpEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    contentScriptState.messageInputElement.dispatchEvent(enterKeyUpEvent);
    
    // Wait to ensure message is sent
    await delay(1000);
    
    // Check if message was sent (text field should be empty)
    if (contentScriptState.messageInputElement.textContent && 
        contentScriptState.messageInputElement.textContent.trim().length > 0) {
      console.log('Message may not have been sent, trying alternative method');
      
      // Try clicking the send button again if it exists
      contentScriptState.sendButtonElement = findSendButton(); // Re-find it
      if (contentScriptState.sendButtonElement && isElementVisible(contentScriptState.sendButtonElement)) {
        contentScriptState.sendButtonElement.click();
        await delay(1000);
      } else {
        // Try using execCommand as a last resort
        try {
          document.execCommand('insertText', false, '\n');
        } catch (e) {
          console.log('execCommand failed:', e);
        }
      }
    }
  }

  // Report the result back to the background script
  function reportResult(success, message) {
    console.log('Reporting result:', success, message);
    showTooltip(message, 3000);
    
    // Update operation status in storage
    chrome.storage.local.set({
      currentOperation: {
        status: success ? 'completed' : 'failed',
        message: message
      }
    });
    
    // Send result to background script
    try {
      chrome.runtime.sendMessage({
        action: 'messageResult',
        result: {
          success: success,
          message: message
        }
      });
    } catch (e) {
      console.error('Exception sending result to background:', e);
    }
  }

  // Helper function to check if an element is visible
  function isElementVisible(element, doc) {
    if (!element) return false;
    
    // Use the document that contains the element
    const ownerDoc = doc || element.ownerDocument || document;
    const win = ownerDoc.defaultView || window;
    
    const style = win.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // Helper function to highlight an element with a specific color
  function highlightElement(element, color = 'blue') {
    if (!element) return;
    
    // Remove any existing highlight
    element.classList.remove('fb-automation-highlight-red');
    element.classList.remove('fb-automation-highlight-green');
    element.classList.remove('fb-automation-highlight-blue');
    
    // Add highlight with specified color
    element.classList.add(`fb-automation-highlight-${color}`);
    
    // Remove highlight after a delay
    setTimeout(() => {
      element.classList.remove(`fb-automation-highlight-${color}`);
    }, 3000);
  }

  // Helper function to show a tooltip
  function showTooltip(message, duration = 5000) {
    // Remove any existing tooltip
    const existingTooltip = document.querySelector('.fb-automation-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    // Create new tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'fb-automation-tooltip';
    tooltip.textContent = message;
    document.body.appendChild(tooltip);
    
    // Remove tooltip after duration
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, duration);
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in content script:', message);
    
    // Ping handler to check if content script is loaded
    if (message.action === 'ping') {
      console.log('Received ping, responding to confirm content script is loaded');
      sendResponse({ status: 'content_script_ready' });
      return true;
    }
    
    // Start processing handler
    if (message.action === 'startProcessing') {
      console.log('Received startProcessing command with settings:', message.settings);
      
      // Update settings if provided
      if (message.settings) {
        contentScriptState.newLeadsOnly = message.settings.newLeadsOnly || false;
        console.log('Updated newLeadsOnly setting:', contentScriptState.newLeadsOnly);
      }
      
      startProcessing();
      sendResponse({ status: 'processing_started' });
      return true;
    }
    
    // Continue messaging after history check
    if (message.action === 'continueMessaging') {
      console.log('Received continueMessaging command, proceeding with message');
      
      // Proceed with sending the message
      sendMessage();
      sendResponse({ status: 'continuing_with_message' });
      return true;
    }
    
    // Always return true for async response
    return true;
  });

  // Initialize when the page loads
  window.addEventListener('load', () => {
    console.log('Page loaded, initializing content script');
    initialize();
  });

  // Initialize immediately in case the page is already loaded
  initialize();
}
