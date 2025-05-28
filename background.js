// Background script for Facebook Automation Tool
console.log('Background script loaded');

// Global state to track bot operation
let botState = {
  running: false,
  paused: false,
  contacts: [],
  currentIndex: 0,
  settings: {
    minDelay: 60,
    maxDelay: 120,
    typingSpeed: 'medium',
    newLeadsOnly: false
  },
  templates: [],
  activeTabId: null,
  skippedLeads: 0,
  pauseTimeout: null
};

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  if (message.action === 'startBot') {
    console.log('Starting bot automation with settings:', message.settings);
    
    // Get contacts and templates from storage
    chrome.storage.local.get(['contacts', 'templates'], (result) => {
      botState.running = true;
      botState.paused = false;
      botState.contacts = result.contacts || [];
      botState.templates = result.templates || [];
      botState.currentIndex = 0;
      botState.settings = message.settings || botState.settings;
      botState.skippedLeads = 0;
      
      // Start processing contacts
      if (botState.contacts.length > 0) {
        processNextContact();
      } else {
        console.error('No contacts available to process');
        sendResponse({ status: 'Error', message: 'No contacts available' });
      }
    });
    
    sendResponse({ status: 'Bot started' });
    return true;
  }
  
  if (message.action === 'pauseBot') {
    console.log('Pausing bot automation');
    botState.paused = true;
    
    // Clear any pending timeout
    if (botState.pauseTimeout) {
      clearTimeout(botState.pauseTimeout);
      botState.pauseTimeout = null;
    }
    
    // Update state in storage
    chrome.storage.local.set({ 
      botState: { 
        running: botState.running,
        paused: true,
        messagesSent: botState.messagesSent,
        queueRemaining: botState.contacts.length - botState.currentIndex
      } 
    });
    
    sendResponse({ status: 'Bot paused' });
    return true;
  }
  
  if (message.action === 'resumeBot') {
    console.log('Resuming bot automation');
    botState.paused = false;
    botState.running = true;
    
    // Update state in storage
    chrome.storage.local.set({ 
      botState: { 
        running: true,
        paused: false,
        messagesSent: botState.messagesSent,
        queueRemaining: botState.contacts.length - botState.currentIndex
      } 
    });
    
    // Resume processing if we have contacts left
    if (botState.currentIndex < botState.contacts.length) {
      processNextContact();
    }
    
    sendResponse({ status: 'Bot resumed' });
    return true;
  }
  
  if (message.action === 'stopBot') {
    console.log('Stopping bot automation');
    botState.running = false;
    botState.paused = false;
    
    // Clear any pending timeout
    if (botState.pauseTimeout) {
      clearTimeout(botState.pauseTimeout);
      botState.pauseTimeout = null;
    }
    
    // Update state in storage
    chrome.storage.local.set({ 
      botState: { 
        running: false,
        paused: false
      } 
    });
    
    sendResponse({ status: 'Bot stopped' });
    return true;
  }
  
  if (message.action === 'messageResult') {
    console.log('Message result received:', message.result);
    
    // Update counters in storage
    chrome.storage.local.get(['botState'], (result) => {
      const state = result.botState || {};
      state.messagesSent = (state.messagesSent || 0) + (message.result.success ? 1 : 0);
      
      chrome.storage.local.set({ botState: state }, () => {
        console.log('Updated message count:', state.messagesSent);
      });
    });
    
    // Process next contact after delay if bot is still running and not paused
    if (botState.running && !botState.paused) {
      // Use random delay within the specified range
      const minDelay = botState.settings.minDelay || 60;
      const maxDelay = botState.settings.maxDelay || 120;
      const delayInSeconds = getRandomDelay(minDelay, maxDelay);
      const delayInMs = delayInSeconds * 1000;
      
      console.log(`Using random delay of ${delayInSeconds} seconds before next message`);
      
      // Store the timeout so we can cancel it if paused
      botState.pauseTimeout = setTimeout(() => {
        botState.pauseTimeout = null;
        processNextContact();
      }, delayInMs);
    }
    
    sendResponse({ status: 'Received result' });
    return true;
  }
  
  if (message.action === 'conversationHistoryCheck') {
    // Content script is reporting whether there's existing conversation history
    console.log('Conversation history check result:', message.hasHistory);
    
    if (message.hasHistory && botState.settings.newLeadsOnly) {
      console.log('Skipping lead because conversation history exists and newLeadsOnly is enabled');
      botState.skippedLeads++;
      
      // Close the tab
      if (botState.activeTabId) {
        try {
          chrome.tabs.remove(botState.activeTabId, () => {
            console.log('Closed tab for skipped lead');
            
            // Notify popup about the skipped lead
            try {
              chrome.runtime.sendMessage({ 
                action: 'leadSkipped', 
                skippedCount: botState.skippedLeads
              });
            } catch (e) {
              console.log('Error sending skipped notification to popup:', e);
            }
            
            // Process next contact after a short delay if not paused
            if (botState.running && !botState.paused) {
              setTimeout(() => {
                processNextContact();
              }, 1000);
            }
          });
        } catch (e) {
          console.error('Error closing tab for skipped lead:', e);
          // Still try to process next contact if not paused
          if (botState.running && !botState.paused) {
            processNextContact();
          }
        }
      }
    } else {
      // Continue with the messaging process
      console.log('Proceeding with messaging process');
      
      // Tell content script to continue
      try {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'continueMessaging' });
      } catch (e) {
        console.error('Error telling content script to continue:', e);
      }
    }
    
    sendResponse({ status: 'Received history check' });
    return true;
  }
  
  // Always return true for async response
  return true;
});

// Get a random delay between min and max seconds
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Process the next contact in the queue
function processNextContact() {
  // Check if bot is paused or stopped
  if (!botState.running || botState.paused) {
    console.log('Bot is paused or stopped, not processing next contact');
    return;
  }
  
  // Check if we've reached the end of the queue
  if (botState.currentIndex >= botState.contacts.length) {
    console.log('Bot finished processing all contacts');
    botState.running = false;
    chrome.storage.local.set({ botState: { running: false, paused: false } });
    return;
  }
  
  const contact = botState.contacts[botState.currentIndex];
  botState.currentIndex++;
  
  // Update remaining count
  chrome.storage.local.get(['botState'], (result) => {
    const state = result.botState || {};
    state.queueRemaining = botState.contacts.length - botState.currentIndex;
    chrome.storage.local.set({ botState: state });
  });
  
  console.log('Processing contact:', contact);
  
  // Check if contact has a profile URL
  if (!contact.profileurl && !contact.profile_url) {
    console.error('Contact missing profile URL, skipping');
    processNextContact();
    return;
  }
  
  const profileUrl = contact.profileurl || contact.profile_url;
  
  // Prepare message text
  let messageText = '';
  
  // If contact has a specific message, use it
  if (contact.message && contact.message.trim()) {
    messageText = contact.message.trim();
  } 
  // Otherwise use a template if available
  else if (botState.templates.length > 0) {
    // Use the first template for now (could be randomized or selected)
    const template = botState.templates[0];
    messageText = processTemplate(template.content, contact);
  }
  
  if (!messageText) {
    console.error('No message available for contact, skipping');
    processNextContact();
    return;
  }
  
  // Open the profile URL in a new tab
  chrome.tabs.create({ url: ensureValidUrl(profileUrl) }, (tab) => {
    console.log('Opened profile in tab:', tab.id);
    botState.activeTabId = tab.id;
    
    // Store the message in local storage for the content script to retrieve
    // This avoids message passing issues
    chrome.storage.local.set({
      currentOperation: {
        tabId: tab.id,
        messageText: messageText,
        status: 'pending',
        newLeadsOnly: botState.settings.newLeadsOnly
      }
    }, () => {
      console.log('Stored message data for content script to retrieve');
    });
    
    // Wait for page to load before proceeding
    setTimeout(() => {
      ensureContentScriptLoaded(tab.id);
    }, 5000);
  });
}

// Ensure content script is loaded
function ensureContentScriptLoaded(tabId) {
  // First try to ping the content script
  try {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not loaded, injecting manually:', chrome.runtime.lastError);
        injectContentScript(tabId);
      } else if (response && response.status === 'content_script_ready') {
        console.log('Content script already loaded, proceeding');
        notifyContentScriptToStart(tabId);
      } else {
        console.log('Unexpected response from content script, injecting again:', response);
        injectContentScript(tabId);
      }
    });
  } catch (e) {
    console.error('Error checking content script:', e);
    injectContentScript(tabId);
  }
}

// Inject content script manually
function injectContentScript(tabId) {
  console.log('Injecting content script into tab:', tabId);
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to inject content script:', chrome.runtime.lastError);
      handleMessageFailure(tabId, 'Failed to inject content script');
      return;
    }
    
    // Also inject the CSS
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to inject CSS:', chrome.runtime.lastError);
      }
      
      console.log('Content script and CSS injected, waiting before proceeding');
      
      // Wait for content script to initialize
      setTimeout(() => {
        notifyContentScriptToStart(tabId);
      }, 2000);
    });
  });
}

// Notify content script to start processing
function notifyContentScriptToStart(tabId) {
  try {
    chrome.tabs.sendMessage(tabId, { 
      action: 'startProcessing',
      settings: botState.settings
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error notifying content script to start:', chrome.runtime.lastError);
        handleMessageFailure(tabId, 'Failed to communicate with content script');
      } else {
        console.log('Content script notified to start processing:', response);
      }
    });
  } catch (e) {
    console.error('Exception notifying content script:', e);
    handleMessageFailure(tabId, 'Exception communicating with content script');
  }
}

// Handle message failure
function handleMessageFailure(tabId, errorMessage) {
  console.error('Message operation failed:', errorMessage);
  
  // Update operation status
  chrome.storage.local.set({
    currentOperation: {
      tabId: tabId,
      status: 'failed',
      error: errorMessage
    }
  });
  
  // Notify popup about the result
  try {
    chrome.runtime.sendMessage({ 
      action: 'messageResult', 
      result: { success: false, error: errorMessage }
    });
  } catch (e) {
    console.log('Error sending result to popup (this is normal if popup is closed):', e);
  }
  
  // Close the tab after a delay
  setTimeout(() => {
    try {
      chrome.tabs.remove(tabId, () => {
        console.log('Closed tab after failure');
        
        // Process next contact if not paused
        if (botState.running && !botState.paused) {
          // Use random delay within the specified range
          const minDelay = botState.settings.minDelay || 60;
          const maxDelay = botState.settings.maxDelay || 120;
          const delayInSeconds = getRandomDelay(minDelay, maxDelay);
          const delayInMs = delayInSeconds * 1000;
          
          console.log(`Using random delay of ${delayInSeconds} seconds before next message`);
          
          botState.pauseTimeout = setTimeout(processNextContact, delayInMs);
        }
      });
    } catch (e) {
      console.error('Error closing tab:', e);
      // Still try to process next contact if not paused
      if (botState.running && !botState.paused) {
        const minDelay = botState.settings.minDelay || 60;
        const maxDelay = botState.settings.maxDelay || 120;
        const delayInSeconds = getRandomDelay(minDelay, maxDelay);
        const delayInMs = delayInSeconds * 1000;
        
        botState.pauseTimeout = setTimeout(processNextContact, delayInMs);
      }
    }
  }, 5000);
}

// Process a template with contact data
function processTemplate(template, data) {
  let result = template;
  
  // Replace placeholders
  result = result.replace(/<first_name>/g, data.first_name || '');
  result = result.replace(/<last_name>/g, data.last_name || '');
  result = result.replace(/<company>/g, data.company || '');
  result = result.replace(/<name>/g, data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim());
  
  // Process spintax {option1|option2|option3}
  result = result.replace(/\{([^{}]+)\}/g, (match, options) => {
    const choices = options.split('|');
    return choices[Math.floor(Math.random() * choices.length)];
  });
  
  return result;
}

// Ensure URL is valid and has proper protocol
function ensureValidUrl(url) {
  if (!url) return '';
  
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  
  return url;
}

// Listen for tab updates to detect when Facebook is fully loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process tabs that are part of our automation
  if (botState.activeTabId === tabId && changeInfo.status === 'complete') {
    console.log('Tab fully loaded:', tabId);
    
    // Check if this is a Facebook URL
    if (tab.url && tab.url.includes('facebook.com')) {
      console.log('Facebook page loaded, ensuring content script is loaded');
      
      // Wait a moment for Facebook's JS to initialize
      setTimeout(() => {
        ensureContentScriptLoaded(tabId);
      }, 2000);
    }
  }
});
