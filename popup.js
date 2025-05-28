// Popup script for Facebook Automation Tool

// DOM elements
const elements = {
  tabs: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  startBot: document.getElementById('startBot'),
  pauseBot: document.getElementById('pauseBot'),
  stopBot: document.getElementById('stopBot'),
  botStatus: document.getElementById('botStatus'),
  messagesSent: document.getElementById('messagesSent'),
  queueRemaining: document.getElementById('queueRemaining'),
  minDelay: document.getElementById('minDelay'),
  maxDelay: document.getElementById('maxDelay'),
  typingSpeed: document.getElementById('typingSpeed'),
  newLeadsOnly: document.getElementById('newLeadsOnly'),
  templateList: document.getElementById('templateList'),
  templateName: document.getElementById('templateName'),
  templateContent: document.getElementById('templateContent'),
  saveTemplate: document.getElementById('saveTemplate'),
  previewTemplate: document.getElementById('previewTemplate'),
  templatePreview: document.getElementById('templatePreview').querySelector('.preview-content'),
  csvFile: document.getElementById('csvFile'),
  uploadCsv: document.getElementById('uploadCsv'),
  sheetUrl: document.getElementById('sheetUrl'),
  importSheet: document.getElementById('importSheet'),
  dataTable: document.getElementById('dataTable').querySelector('tbody')
};

// State management
let state = {
  botRunning: false,
  botPaused: false,
  messagesSent: 0,
  queueRemaining: 0,
  contacts: [],
  templates: [],
  settings: {
    minDelay: 60,
    maxDelay: 120,
    typingSpeed: 'medium',
    newLeadsOnly: false
  }
};

// Initialize the extension
function init() {
  // Load saved state from storage
  chrome.storage.local.get(['botState', 'contacts', 'templates', 'settings'], (result) => {
    if (result.botState) {
      state.botRunning = result.botState.running || false;
      state.botPaused = result.botState.paused || false;
      state.messagesSent = result.botState.messagesSent || 0;
      state.queueRemaining = result.botState.queueRemaining || 0;
    }
    if (result.contacts) state.contacts = result.contacts || [];
    if (result.templates) state.templates = result.templates || [];
    if (result.settings) {
      state.settings = {
        ...state.settings,
        ...result.settings
      };
    }
    
    // Update UI with loaded settings
    elements.minDelay.value = state.settings.minDelay;
    elements.maxDelay.value = state.settings.maxDelay;
    elements.typingSpeed.value = state.settings.typingSpeed;
    elements.newLeadsOnly.checked = state.settings.newLeadsOnly;
    
    updateUI();
    renderTemplates();
    renderDataTable();
  });
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in popup:', message);
    
    if (message.action === 'messageResult') {
      // Update counters
      if (message.result && message.result.success) {
        state.messagesSent++;
      }
      
      // Update UI
      updateUI();
    }
    
    if (message.action === 'botStateUpdate') {
      state.botRunning = message.state.running;
      state.botPaused = message.state.paused || false;
      state.messagesSent = message.state.messagesSent || state.messagesSent;
      state.queueRemaining = message.state.queueRemaining || state.queueRemaining;
      
      updateUI();
    }
    
    if (message.action === 'leadSkipped') {
      // Update UI to show a lead was skipped
      const skippedCount = message.skippedCount || 0;
      console.log(`Lead skipped (${skippedCount} total)`);
      
      // Update UI if needed
      updateUI();
    }
  });
}

// Update UI based on current state
function updateUI() {
  // Update bot status
  if (state.botPaused) {
    elements.botStatus.textContent = 'Paused';
    elements.botStatus.className = 'status-indicator paused';
  } else if (state.botRunning) {
    elements.botStatus.textContent = 'Running';
    elements.botStatus.className = 'status-indicator running';
  } else {
    elements.botStatus.textContent = 'Stopped';
    elements.botStatus.className = 'status-indicator stopped';
  }
  
  // Update buttons
  elements.startBot.disabled = state.botRunning;
  elements.pauseBot.disabled = !state.botRunning || state.botPaused;
  elements.stopBot.disabled = !state.botRunning && !state.botPaused;
  
  // Update counters
  elements.messagesSent.textContent = state.messagesSent;
  elements.queueRemaining.textContent = state.queueRemaining;
  
  // Update settings inputs
  elements.minDelay.disabled = state.botRunning || state.botPaused;
  elements.maxDelay.disabled = state.botRunning || state.botPaused;
  elements.typingSpeed.disabled = state.botRunning || state.botPaused;
  elements.newLeadsOnly.disabled = state.botRunning || state.botPaused;
}

// Set up all event listeners
function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab button
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show selected tab pane
      elements.tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabId) pane.classList.add('active');
      });
    });
  });
  
  // Bot control buttons
  elements.startBot.addEventListener('click', startBot);
  elements.pauseBot.addEventListener('click', pauseBot);
  elements.stopBot.addEventListener('click', stopBot);
  
  // Settings change handlers
  elements.minDelay.addEventListener('change', updateSettings);
  elements.maxDelay.addEventListener('change', updateSettings);
  elements.typingSpeed.addEventListener('change', updateSettings);
  elements.newLeadsOnly.addEventListener('change', updateSettings);
  
  // Validate min/max delay relationship
  elements.minDelay.addEventListener('input', validateDelayRange);
  elements.maxDelay.addEventListener('input', validateDelayRange);
  
  // Template management
  elements.saveTemplate.addEventListener('click', saveTemplate);
  elements.previewTemplate.addEventListener('click', previewTemplate);
  
  // Data import
  elements.uploadCsv.addEventListener('click', uploadCsv);
  elements.importSheet.addEventListener('click', importFromSheet);
}

// Validate that min delay is less than max delay
function validateDelayRange() {
  const minValue = parseInt(elements.minDelay.value);
  const maxValue = parseInt(elements.maxDelay.value);
  
  if (minValue > maxValue) {
    elements.maxDelay.value = minValue;
  }
  
  // Ensure values are within allowed range
  if (minValue < 30) elements.minDelay.value = 30;
  if (maxValue < 30) elements.maxDelay.value = 30;
}

// Update settings when changed
function updateSettings() {
  state.settings.minDelay = parseInt(elements.minDelay.value);
  state.settings.maxDelay = parseInt(elements.maxDelay.value);
  state.settings.typingSpeed = elements.typingSpeed.value;
  state.settings.newLeadsOnly = elements.newLeadsOnly.checked;
  
  // Save settings to storage
  chrome.storage.local.set({ settings: state.settings });
  
  console.log('Settings updated:', state.settings);
}

// Start the bot
function startBot() {
  if (state.contacts.length === 0) {
    alert('No contacts loaded. Please import contacts first.');
    return;
  }
  
  if (state.templates.length === 0) {
    alert('No message templates created. Please create at least one template.');
    return;
  }
  
  // Validate delay range
  validateDelayRange();
  
  // Update settings before starting
  updateSettings();
  
  // If bot was paused, resume it
  if (state.botPaused) {
    state.botPaused = false;
    state.botRunning = true;
    
    // Save state
    chrome.storage.local.set({ 
      botState: { 
        running: true,
        paused: false,
        messagesSent: state.messagesSent,
        queueRemaining: state.queueRemaining
      } 
    });
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'resumeBot',
      settings: state.settings
    });
  } else {
    // Start fresh
    state.botRunning = true;
    state.botPaused = false;
    state.queueRemaining = state.contacts.length;
    
    // Save state
    chrome.storage.local.set({ 
      botState: { 
        running: true,
        paused: false,
        messagesSent: state.messagesSent,
        queueRemaining: state.queueRemaining
      } 
    });
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'startBot',
      settings: state.settings
    });
  }
  
  updateUI();
}

// Pause the bot
function pauseBot() {
  state.botPaused = true;
  
  // Save state
  chrome.storage.local.set({ 
    botState: { 
      running: state.botRunning,
      paused: true,
      messagesSent: state.messagesSent,
      queueRemaining: state.queueRemaining
    } 
  });
  
  // Send message to background script
  chrome.runtime.sendMessage({ action: 'pauseBot' });
  
  updateUI();
}

// Stop the bot
function stopBot() {
  state.botRunning = false;
  state.botPaused = false;
  
  // Save state
  chrome.storage.local.set({ 
    botState: { 
      running: false,
      paused: false,
      messagesSent: state.messagesSent,
      queueRemaining: state.queueRemaining
    } 
  });
  
  // Send message to background script
  chrome.runtime.sendMessage({ action: 'stopBot' });
  
  updateUI();
}

// Save a message template
function saveTemplate() {
  const name = elements.templateName.value.trim();
  const content = elements.templateContent.value.trim();
  
  if (!name || !content) {
    alert('Please enter both template name and content.');
    return;
  }
  
  // Add new template or update existing
  const existingIndex = state.templates.findIndex(t => t.name === name);
  if (existingIndex >= 0) {
    state.templates[existingIndex].content = content;
  } else {
    state.templates.push({ name, content });
  }
  
  // Save to storage
  chrome.storage.local.set({ templates: state.templates });
  
  // Clear form and update UI
  elements.templateName.value = '';
  elements.templateContent.value = '';
  renderTemplates();
}

// Preview a message template
function previewTemplate() {
  const content = elements.templateContent.value;
  if (!content) {
    alert('Please enter template content to preview.');
    return;
  }
  
  // Process template with sample data
  const sampleData = {
    first_name: 'John',
    last_name: 'Smith',
    company: 'Acme Inc'
  };
  
  const processed = processTemplate(content, sampleData);
  elements.templatePreview.textContent = processed;
}

// Process a template with data
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

// Render templates list
function renderTemplates() {
  elements.templateList.innerHTML = '';
  
  if (state.templates.length === 0) {
    elements.templateList.innerHTML = '<p class="empty-state">No templates yet. Create your first template.</p>';
    return;
  }
  
  state.templates.forEach(template => {
    const templateEl = document.createElement('div');
    templateEl.className = 'template-item';
    
    const nameEl = document.createElement('h4');
    nameEl.textContent = template.name;
    
    const contentEl = document.createElement('p');
    contentEl.textContent = template.content.length > 50 
      ? template.content.substring(0, 50) + '...' 
      : template.content;
    
    const actionsEl = document.createElement('div');
    actionsEl.className = 'template-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn small secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      elements.templateName.value = template.name;
      elements.templateContent.value = template.content;
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn small danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete template "${template.name}"?`)) {
        state.templates = state.templates.filter(t => t.name !== template.name);
        chrome.storage.local.set({ templates: state.templates });
        renderTemplates();
      }
    });
    
    actionsEl.appendChild(editBtn);
    actionsEl.appendChild(deleteBtn);
    
    templateEl.appendChild(nameEl);
    templateEl.appendChild(contentEl);
    templateEl.appendChild(actionsEl);
    
    elements.templateList.appendChild(templateEl);
  });
}

// Upload and process CSV file
function uploadCsv() {
  const fileInput = elements.csvFile;
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a CSV file to upload.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const csvData = event.target.result;
      console.log("Raw CSV data:", csvData); // Debug log
      
      // Check if the data is base64 encoded
      if (csvData.indexOf(',') === -1 && /^[A-Za-z0-9+/=]+$/.test(csvData)) {
        console.log("Data appears to be base64 encoded, attempting to decode");
        try {
          const decoded = atob(csvData);
          console.log("Decoded data:", decoded);
          processCSVData(decoded);
        } catch (e) {
          console.error("Base64 decoding failed:", e);
          processCSVData(csvData); // Try with original data
        }
      } else {
        processCSVData(csvData);
      }
    } catch (error) {
      console.error("CSV parsing error:", error); // Debug log
      alert('Error parsing file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
}

// Process CSV data after loading
function processCSVData(csvData) {
  // Detect if it's tab-delimited or comma-delimited
  const delimiter = csvData.includes('\t') ? '\t' : ',';
  console.log("Detected delimiter:", delimiter === '\t' ? "tab" : "comma"); // Debug log
  
  // Try to parse with our flexible parser
  let contacts = parseDelimitedFile(csvData, delimiter);
  
  // If no contacts found, try a more aggressive approach
  if (contacts.length === 0) {
    console.log("No contacts found with standard parsing, trying direct extraction");
    contacts = extractContactsDirectly(csvData);
  }
  
  console.log("Final parsed contacts:", contacts); // Debug log
  
  if (contacts.length === 0) {
    alert('No valid contacts found in the file. Please ensure your file contains Facebook URLs and messages.');
    return;
  }
  
  state.contacts = contacts;
  state.queueRemaining = contacts.length;
  
  // Save to storage
  chrome.storage.local.set({ contacts: state.contacts });
  
  // Update UI
  renderDataTable();
  updateUI();
  
  alert(`Successfully imported ${contacts.length} contacts.`);
}

// Extract contacts directly from text without relying on headers
function extractContactsDirectly(fileData) {
  const contacts = [];
  const lines = fileData.split(/\r?\n/).filter(line => line.trim());
  
  console.log("Attempting direct extraction from", lines.length, "lines");
  
  // Facebook URL pattern
  const fbUrlPattern = /(https?:\/\/(www\.)?(facebook|fb)\.com\/[a-zA-Z0-9._%+-]+)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`Processing line ${i}: ${line.substring(0, 50)}...`);
    
    // Try to find a Facebook URL in the line
    const urlMatch = line.match(fbUrlPattern);
    if (urlMatch) {
      const url = urlMatch[0];
      console.log(`Found URL: ${url}`);
      
      // Extract the rest as a potential message
      let message = line.replace(url, '').trim();
      
      // If there's no message in this line, check the next line
      if (!message && i + 1 < lines.length) {
        message = lines[i + 1].trim();
      }
      
      // Create a contact with the URL and message
      const contact = {
        profileurl: url,
        message: message
      };
      
      // Try to extract a name from the URL
      const nameMatch = url.match(/facebook\.com\/([a-zA-Z0-9._%+-]+)/);
      if (nameMatch && nameMatch[1]) {
        const possibleName = nameMatch[1].replace(/\./g, ' ');
        contact.name = possibleName;
        
        // Split into first and last name
        const nameParts = possibleName.split(' ');
        if (nameParts.length > 0) {
          contact.first_name = nameParts[0];
          if (nameParts.length > 1) {
            contact.last_name = nameParts.slice(1).join(' ');
          }
        }
      }
      
      contacts.push(contact);
      console.log("Added contact:", contact);
    } else if (line.includes('http') && (line.includes('facebook') || line.includes('fb.com'))) {
      // More lenient URL detection
      const parts = line.split(/\s+/);
      for (const part of parts) {
        if (part.includes('http') && (part.includes('facebook') || part.includes('fb.com'))) {
          console.log(`Found URL with lenient detection: ${part}`);
          const contact = {
            profileurl: part,
            message: line.replace(part, '').trim()
          };
          contacts.push(contact);
          console.log("Added contact with lenient URL detection:", contact);
          break;
        }
      }
    }
  }
  
  // If we still have no contacts, try to parse each line as a comma or tab separated value
  if (contacts.length === 0) {
    console.log("No contacts found with URL detection, trying to parse each line");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Try comma first, then tab
      let parts = line.split(',');
      if (parts.length === 1) {
        parts = line.split('\t');
      }
      
      if (parts.length >= 2) {
        // Assume first part might be a URL or name, second part might be a message
        const firstPart = parts[0].trim();
        const secondPart = parts[1].trim();
        
        const contact = {};
        
        // Check if first part looks like a URL
        if (firstPart.includes('http') || firstPart.includes('facebook') || firstPart.includes('fb.com')) {
          contact.profileurl = firstPart;
          contact.message = secondPart;
        } else {
          // Assume it's a name
          contact.name = firstPart;
          
          // Check if second part looks like a URL
          if (secondPart.includes('http') || secondPart.includes('facebook') || secondPart.includes('fb.com')) {
            contact.profileurl = secondPart;
            // If there's a third part, use it as message
            if (parts.length > 2) {
              contact.message = parts.slice(2).join(',').trim();
            }
          } else {
            // Assume second part is a message
            contact.message = secondPart;
          }
        }
        
        // Only add if we have at least a URL or a name
        if (contact.profileurl || contact.name) {
          contacts.push(contact);
          console.log("Added contact from line parsing:", contact);
        }
      }
    }
  }
  
  return contacts;
}

// Parse delimited file (CSV or TSV)
function parseDelimitedFile(fileData, delimiter) {
  // Split into lines and filter out empty lines
  const lines = fileData.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('File is empty');
  }
  
  // Parse headers (first line)
  const headers = parseDelimitedLine(lines[0], delimiter)
    .map(h => h.trim().toLowerCase());
  
  console.log("Headers detected:", headers); // Debug log
  
  // Map common header variations to standard field names
  const headerMap = {
    // Maps for profile URL
    'profile_url': ['profile_url', 'profileurl', 'profile url', 'url', 'link', 'facebook', 'fb'],
    // Maps for name fields
    'name': ['name', 'full name', 'fullname', 'contact', 'person'],
    'first_name': ['first_name', 'firstname', 'first'],
    'last_name': ['last_name', 'lastname', 'last', 'surname'],
    // Maps for other fields
    'company': ['company', 'organization', 'org', 'business', 'employer'],
    'email': ['email', 'e-mail', 'mail'],
    'phone': ['phone', 'telephone', 'mobile', 'cell'],
    'message': ['message', 'msg', 'text', 'custom message']
  };
  
  // Create a mapping from actual headers to standardized field names
  const fieldMapping = {};
  headers.forEach((header, index) => {
    for (const [standardField, variations] of Object.entries(headerMap)) {
      if (variations.includes(header)) {
        fieldMapping[index] = standardField;
        break;
      }
    }
    // If no mapping found, use the original header
    if (!fieldMapping[index]) {
      fieldMapping[index] = header;
    }
  });
  
  console.log("Field mapping:", fieldMapping); // Debug log
  
  const contacts = [];
  
  // Process data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseDelimitedLine(lines[i], delimiter);
    const contact = {};
    
    // Map values to fields using our mapping
    values.forEach((value, index) => {
      if (index < headers.length && value.trim()) {
        const fieldName = fieldMapping[index] || headers[index];
        contact[fieldName] = value.trim();
      }
    });
    
    // Handle name fields
    if (contact.name && !contact.first_name && !contact.last_name) {
      const nameParts = contact.name.split(' ');
      contact.first_name = nameParts[0] || '';
      contact.last_name = nameParts.slice(1).join(' ') || '';
    } else if (!contact.name && (contact.first_name || contact.last_name)) {
      contact.name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    
    // Special handling for profile URL field
    if (contact.profile_url && !contact.profileurl) {
      contact.profileurl = contact.profile_url;
    }
    
    // Add contact if it has at least one useful piece of information
    if (Object.keys(contact).length > 0) {
      contacts.push(contact);
    }
  }
  
  return contacts;
}

// Parse a delimited line, handling quoted values
function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  // Clean up quotes from fields
  return result.map(field => {
    field = field.trim();
    // Remove surrounding quotes if present
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.substring(1, field.length - 1);
    }
    // Replace double quotes with single quotes (CSV escaping)
    return field.replace(/""/g, '"');
  });
}

// Import from Google Sheet
function importFromSheet() {
  const url = elements.sheetUrl.value.trim();
  
  if (!url) {
    alert('Please enter a Google Sheet URL.');
    return;
  }
  
  // This is a placeholder - actual implementation would require Google Sheets API
  alert('Google Sheets import functionality requires additional setup with Google Sheets API. This is a placeholder.');
}

// Render data table
function renderDataTable() {
  elements.dataTable.innerHTML = '';
  
  if (state.contacts.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.textContent = 'No contacts imported yet. Upload a CSV file or import from Google Sheets.';
    emptyCell.className = 'empty-state';
    emptyRow.appendChild(emptyCell);
    elements.dataTable.appendChild(emptyRow);
    return;
  }
  
  // Show first 10 contacts
  const contactsToShow = state.contacts.slice(0, 10);
  
  contactsToShow.forEach(contact => {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'N/A';
    
    const companyCell = document.createElement('td');
    companyCell.textContent = contact.company || 'N/A';
    
    const urlCell = document.createElement('td');
    if (contact.profileurl || contact.profile_url) {
      const urlLink = document.createElement('a');
      urlLink.href = contact.profileurl || contact.profile_url;
      urlLink.textContent = 'Profile';
      urlLink.target = '_blank';
      urlCell.appendChild(urlLink);
    } else {
      urlCell.textContent = 'N/A';
    }
    
    const messageCell = document.createElement('td');
    messageCell.textContent = contact.message 
      ? (contact.message.length > 30 ? contact.message.substring(0, 30) + '...' : contact.message)
      : 'Using template';
    
    row.appendChild(nameCell);
    row.appendChild(companyCell);
    row.appendChild(urlCell);
    row.appendChild(messageCell);
    
    elements.dataTable.appendChild(row);
  });
  
  if (state.contacts.length > 10) {
    const moreRow = document.createElement('tr');
    const moreCell = document.createElement('td');
    moreCell.colSpan = 4;
    moreCell.textContent = `...and ${state.contacts.length - 10} more contacts`;
    moreCell.className = 'more-indicator';
    moreRow.appendChild(moreCell);
    elements.dataTable.appendChild(moreRow);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
