/**
 * Jira Helper – Content Script
 * Interacts with Zephyr Scale test case editor (Froala rich-text editors)
 */

console.log(`[JiraHelper] Content script initializing in ${window.location.host}. Depth: ${window.parent === window ? 'Top' : 'Iframe'}`);
remoteLog(`Initialized in frame: ${window.location.href}`, 'info');

let stopRequested = false;
let isCurrentlyFilling = false;

// ==================== Utilities ====================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendProgress(index, total, status, msg) {
  try {
    chrome.runtime.sendMessage({
      target: 'sidebar',
      action: 'stepProgress',
      index,
      total,
      status,
      msg,
    });
  } catch (e) {}
}

function sendComplete(total) {
  try {
    chrome.runtime.sendMessage({
      target: 'sidebar',
      action: 'fillComplete',
      total,
    });
  } catch (e) {
    console.warn('[JiraHelper] sendComplete failed:', e.message);
  }
}

function sendError(msg) {
  try {
    chrome.runtime.sendMessage({
      target: 'sidebar',
      action: 'fillError',
      msg,
    });
  } catch (e) {}
}

function remoteLog(msg, type = 'info') {
  console.log('[JiraHelper]', msg);
  try {
    chrome.runtime.sendMessage({
      target: 'sidebar',
      action: 'remoteLog',
      msg: msg,
      type: type
    });
  } catch (e) {}
}

/**
 * Visual feedback for the user
 */
function highlight(el, type = 'active') {
  if (!el) return;
  const originalOutline = el.style.outline;
  const originalTransition = el.style.transition;
  const originalZIndex = el.style.zIndex;

  el.style.transition = 'outline 0.2s ease-in-out';
  el.style.outline = type === 'active' ? '3px solid #7c3aed' : '3px solid #3fb950';
  el.style.outlineOffset = '2px';
  el.style.zIndex = '2147483647'; // Max z-index

  setTimeout(() => {
    el.style.outline = originalOutline;
    el.style.transition = originalTransition;
    el.style.zIndex = originalZIndex;
  }, 1000);
}

/**
 * Recursive search for elements in Shadow DOMs and iframes
 */
function findEverywhere(selectorOrFn) {
  const check = (root) => {
    if (typeof selectorOrFn === 'function') {
      return selectorOrFn(root);
    }
    return root.querySelector(selectorOrFn);
  };

  const search = (root) => {
    if (!root) return null;

    // 1. Try simple search in current root
    let found = check(root);
    if (found) return found;

    // 2. Search through all elements to find Shadow Roots
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
      if (el.shadowRoot) {
        found = search(el.shadowRoot);
        if (found) return found;
      }
    }

    // 3. Search Iframes (if root is a document/element)
    const iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        found = search(doc);
        if (found) return found;
      } catch (e) { /* ignore cross-origin */ }
    }

    return null;
  };

  return search(document);
}

/**
 * Robust click that triggers React/Event listeners
 */
async function simulateClick(el) {
  if (!el) return;
  console.log('[JiraHelper] Clicking element:', el);
  
  // Ensure it's in view
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {}
  
  highlight(el);
  await sleep(150); // Small wait for layout to settle

  // Simplified click simulation to prevent duplicate duplicate triggers
  // (React buttons sometimes trigger twice if both mouseup/down and click() are fired redundantly)
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  await sleep(20);
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  
  if (typeof el.click === 'function') {
    el.click();
  }

  if (el.focus) el.focus();
  await sleep(100);
}

/**
 * Wait for a specific number of draggable rows to exist anywhere
 */
function waitForRowCount(count, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const getCount = () => {
      let total = 0;
      const countInRoot = (root) => {
        total += root.querySelectorAll('.draggable-row').length;
        const iframes = root.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            countInRoot(doc);
          } catch (e) {}
        });
      };
      countInRoot(document);
      return total;
    };

    if (getCount() >= count) return resolve();

    const observer = new MutationObserver(() => {
      if (getCount() >= count) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${count} rows (current: ${getCount()})`));
    }, timeout);
  });
}

/**
 * Robust check for a row element
 */
function isRow(el) {
  return el && (el.classList.contains('draggable-row') || el.querySelector('[data-testid="step-fields-layout"]'));
}

/**
 * Find all step rows anywhere
 */
function findAllRows() {
  let allRows = [];
  const searchRoot = (root) => {
    if (!root) return;

    // 1. Check for .draggable-row first in current root
    let rowsInRoot = Array.from(root.querySelectorAll('.draggable-row'));
    
    // 2. Fallback: Check for data-testid layouts if no explicit rows found
    if (rowsInRoot.length === 0) {
      const layouts = root.querySelectorAll('[data-testid="step-fields-layout"]');
      layouts.forEach(layout => {
        let container = layout.parentElement;
        while (container && container !== root && !container.classList.contains('draggable-row')) {
           if (container.parentElement && container.parentElement.querySelector(':scope > .step-sequence')) {
             break; 
           }
           container = container.parentElement;
        }
        if (container && !allRows.includes(container)) {
          allRows.push(container);
        }
      });
    } else {
      // Filter out duplicates
      rowsInRoot.forEach(r => {
        if (!allRows.includes(r)) allRows.push(r);
      });
    }

    // 3. RECURSIVE: Search Shadow DOMs
    const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of allElements) {
      if (el.shadowRoot) {
        searchRoot(el.shadowRoot);
      }
    }

    // 4. RECURSIVE: Search Iframes
    const iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) searchRoot(doc);
      } catch (e) {}
    }
  };

  searchRoot(document);
  return allRows;
}

/**
 * Find the last added step row anywhere
 */
function findLastRow() {
  const rows = findAllRows();
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

/**
 * Convert plain text to simple HTML
 */
/**
 * Find the "Checkmark" or "Save" button for a specific row.
 */
function findSaveButton(row) {
  // Common Zephyr Scale save button patterns
  const selectors = [
    'button[aria-label="Save"]',
    'button[data-testid="test-step-save-button"]',
    'button[data-testid*="save"]',
    'button[data-testid*="check"]',
    'button .css-1afrefi', // wrapper for some icons
    '.css-izvpvj button', // sometimes used for row actions
    'button span[aria-label="check"]',
    'button span[data-testid="check-icon"]'
  ];

  for (const s of selectors) {
    const btn = row.querySelector(s);
    if (btn) return btn;
  }
  
  // Try finding by icon path if classes are dynamic
  const svgs = row.querySelectorAll('svg');
  for (const svg of svgs) {
    if (svg.innerHTML.includes('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z') || // Checkmark path
        svg.getAttribute('aria-label') === 'check') {
      return svg.closest('button') || svg;
    }
  }

  return null;
}

function textToHtml(text) {
  if (!text) return '';
  return text.split('\n').map(line => {
    let safe = escapeHtml(line);
    // Convert Markdown bold into HTML bold for Froala
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return `<p>${safe}</p>`;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Check if the Zephyr Scale UI (Add step button or existing rows) is present
 */
function findAddStepButton() {
  // 1. Data Test IDs are the most reliable across different versions
  const testIds = [
    '[data-testid="testcase-view-add-step-button"]',
    '[data-testid="test-step-add-button"]',
    '[data-testid="add-step-button"]',
    '[data-testid="testcase-view-add-step-below-button"]'
  ];

  for (const id of testIds) {
    const btn = findEverywhere(id);
    if (btn) return btn;
  }

  // 2. Exact match by text content (i18n might break this but good fallback)
  const textBtn = findEverywhere((root) => {
    const allBtns = Array.from(root.querySelectorAll('button'));
    return allBtns.find(b => {
      const txt = b.textContent.trim().toLowerCase();
      return txt === 'add step' || txt === '+ add step';
    });
  });
  if (textBtn) return textBtn;

  // 3. Fallback to latest observed classes/containers
  return findEverywhere('.css-10oczdc.e25ffw72 button') || 
         findEverywhere('.css-1mwn02k button.css-1l34k60') ||
         findEverywhere('.css-1afrefi button');
}

function detectZephyrUI() {
  const addBtn = findAddStepButton();
  const rows = findAllRows();
  const hasRows = rows.length > 0;
  
  if (addBtn || hasRows) {
    console.log('[JiraHelper] UI Elements detected:', { addBtn: !!addBtn, rows: rows.length });
    return true;
  }
  
  return false;
}

// ==================== Froala Editor Interaction ====================

/**
 * Click into a Froala editor field to activate it, then set its content.
 */
async function fillField(row, selector, content) {
  if (!content) return;
  
  let fieldElement = row.querySelector(selector);
  if (!fieldElement) return;

  // 1. Check if it's already in edit mode
  let editable = fieldElement.querySelector('[contenteditable="true"]');
  
  if (!editable) {
    console.log('[JiraHelper] Activating field via simulation...');
    
    // Scroll and highlight
    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    await simulateClick(fieldElement);
    
    // 2. Wait for the editor to appear, RE-QUERYING the live DOM!
    let attempts = 0;
    while (!editable && attempts < 15) {
      await sleep(200);
      
      // Crucial: React unmounts the old read-only wrapper and mounts a new editing wrapper!
      // We must query the fresh DOM tree from the row every single tick.
      fieldElement = row.querySelector(selector);
      if (fieldElement) {
        editable = fieldElement.querySelector('.fr-element[contenteditable="true"]') || 
                   fieldElement.querySelector('[contenteditable="true"]');
      }
      attempts++;
    }
  }

  if (!editable) {
    console.error('[JiraHelper] Failed to find editable area for:', selector);
    remoteLog(`Failed to activate editing mode for: ${selector.substring(0, 20)}`, 'error');
    return;
  }

  console.log('[JiraHelper] Editable found! Injecting content...');
  highlight(fieldElement, 'active');
   // Bring focus cleanly
  editable.focus();
  await sleep(100);
  
  // CRITICAL FIX: To use execCommand, the browser MUST physically have a Caret (Selection Range)
  // placed securely inside the contenteditable div. Simply calling .focus() does not always 
  // initialize the text selection, causing execCommand to write data into the void.
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editable);
  selection.removeAllRanges();
  selection.addRange(range);
  await sleep(50);
  
  // Clear existing content utilizing the valid selection
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  await sleep(50);
  
  // Natively insert HTML now that the caret exists securely
  document.execCommand('insertHTML', false, textToHtml(content));
  await sleep(200);

  // CRITICAL FIX: Simulate an actual human typing two spaces and deleting them. 
  // This physically forces Froala Editor and React to trigger their internal onChange listeners
  // and sync the dirty element's innerHTML into the virtual DOM / React state.
  // We use two spaces to provide a larger buffer, preventing accidental deletion of the real content.
  document.execCommand('insertText', false, '  ');
  await sleep(50);
  
  const backspaceInit = { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true, cancelable: true };
  editable.dispatchEvent(new KeyboardEvent('keydown', backspaceInit));
  editable.dispatchEvent(new KeyboardEvent('keypress', backspaceInit));
  
  // Delete the two spaces
  document.execCommand('delete', false, null);
  document.execCommand('delete', false, null);
  
  editable.dispatchEvent(new KeyboardEvent('keyup', backspaceInit));
  await sleep(50);

  // Trigger strict InputEvent
  editable.dispatchEvent(new InputEvent('input', {
    inputType: 'deleteContentBackward',
    bubbles: true,
    cancelable: true
  }));

  // Final synthetic events including blur to force save
  ['input', 'change', 'blur', 'focusout'].forEach(type => {
    editable.dispatchEvent(new Event(type, { bubbles: true }));
  });
  
  // Traverse up to find React props to forcefully sync state
  try {
    let current = editable;
    let reactPropsFound = false;
    for (let i = 0; i < 3; i++) { // Check the element and its direct wrappers
      if (!current) break;
      const reactKeyPattern = Object.keys(current).find(key => key.startsWith('__reactProps$') || key.startsWith('__reactEventHandlers$'));
      if (reactKeyPattern && current[reactKeyPattern]) {
        const props = current[reactKeyPattern];
        // Trigger both onInput and onChange for React state updates
        if (props.onInput) props.onInput(new Event('input', { bubbles: true, target: editable }));
        if (props.onChange) props.onChange(new Event('change', { bubbles: true, target: editable }));
        if (props.onBlur) props.onBlur(new Event('blur', { bubbles: true, target: editable }));
        reactPropsFound = true;
      }
      current = current.parentElement;
    }
    
    // Fallback if no specific react key is found but generic exists
    if (!reactPropsFound) {
      const genericKey = Object.keys(editable).find(k => k.startsWith('__react'));
      if (genericKey && editable[genericKey]) {
        if (editable[genericKey].onInput) editable[genericKey].onInput({ target: editable });
        if (editable[genericKey].onChange) editable[genericKey].onChange({ target: editable });
      }
    }
  } catch(e) {}
  
  await sleep(400); // Give React time to process

  // CRITICAL: Click on the specific keyword/label above this field to force save
  console.log('[JiraHelper] Clicking label field to trigger autosave');
  const label = fieldElement.parentElement?.querySelector('.css-95ikl') || 
                fieldElement.previousElementSibling || 
                fieldElement.parentElement?.firstElementChild;
                
  if (label && label !== fieldElement) {
    await simulateClick(label);
  } else {
    // Esc fallback if label not found securely
    editable.blur();
  }
  
  await sleep(600); // Give Zephyr time to process the save block before moving to next field
}

// ==================== Main Fill Loop ====================

async function fillAllSteps(steps, delay) {
  if (isCurrentlyFilling && !stopRequested) return;
  isCurrentlyFilling = true;
  stopRequested = false;
  const total = steps.length;

  console.log('[JiraHelper] Starting fill loop. Total steps:', total);
  remoteLog(`Content script in ${window.location.host} starting automation for ${total} steps`, 'info');
  sendProgress(0, total, 'start', `Initializing automation for ${total} steps...`);
  
  // Ensure we wait for any floating modals to get out of the way
  await sleep(1000);

  try {
    // Check how many rows already exist (pre-existing empty rows)
    const existingRows = findAllRows();
    console.log('[JiraHelper] Existing rows found:', existingRows.length);

    for (let i = 0; i < total; i++) {
      if (stopRequested) break;

      try {
        sendProgress(i, total, 'start', `Filling step ${i + 1} of ${total}...`);

        let targetRow;
        const currentRows = findAllRows();

        if (i < currentRows.length) {
          // Reuse existing empty row
          targetRow = currentRows[i];
          console.log(`[JiraHelper] Reusing existing row ${i + 1}`);
        } else {
          // Need to add a new row
          console.log(`[JiraHelper] Adding new row for step ${i + 1}`);
          const addBtn = findAddStepButton();
          if (!addBtn) {
            throw new Error('Could not find "Add step" button');
          }

          // Use a strict native click to prevent React interceptors from duplicating the event
          addBtn.click();

          // Important: Wait for the row to visually render and database placeholders to attach
          await sleep(delay > 500 ? delay : 1000); 

          // STRICT ROW TARGETING: Retrieve the exact row mathematically, bypassing duplicate issues completely.
          const updatedRows = findAllRows();
          targetRow = updatedRows[i] || updatedRows[updatedRows.length - 1];
        }

        if (!targetRow) {
          throw new Error('Could not find target row');
        }

        // Always scroll to the row so it stays in absolute view
        try {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300); // let the scroll finish
        } catch (e) {}

        console.log(`[JiraHelper] Filling row ${i + 1}...`);
        await fillStepRowInContext(targetRow, steps[i]);

        // SECURE SAVE: Find the specific Zephyr Save button (Checkmark) to guarantee DB commit
        console.log(`[JiraHelper] Searching for save button on row ${i + 1}`);
        const saveBtn = findSaveButton(targetRow);
        
        if (saveBtn) {
          console.log(`[JiraHelper] Save button found. Clicking...`);
          await simulateClick(saveBtn);
        } else {
          console.log(`[JiraHelper] Save button not found. Using fallback click outside.`);
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          document.documentElement.click();
        }
        
        // CRITICAL BUGFIX
        // Wait extensively for Zephyr Cloud to completely commit the new node to its backend database.
        // We further increased this to 2500ms for extra safety on slow networks.
        await sleep(2500); 

        sendProgress(i, total, 'done', `Step ${i + 1} filled ✓`);

        await sleep(delay); // add user-requested delay on top

      } catch (err) {
        console.error('[JiraHelper] Step error:', err);
        remoteLog(`Step ${i + 1} error: ${err.message}`, 'error');
        sendProgress(i, total, 'error', `Step ${i + 1} skipped: ${err.message}`);
        await sleep(1000);
      }
    }

    if (!stopRequested) sendComplete(total);
  } catch (fatalErr) {
    console.error('[JiraHelper] Fatal fill error:', fatalErr);
    remoteLog(`Fatal error: ${fatalErr.message}`, 'error');
    sendError('Fatal error: ' + fatalErr.message);
  } finally {
    isCurrentlyFilling = false;
  }
}

/**
 * Fill a row within its own document context
 */
async function fillStepRowInContext(row, stepData) {
  highlight(row, 'success');
  console.log('[JiraHelper] Filling row content...');
  
  const selectors = {
    step: '[data-testid*="richTextEditor-test-step-description"]',
    testData: '[data-testid*="richTextEditor-test-step-testData"]',
    expected: '[data-testid*="richTextEditor-test-step-expectedResult"]'
  };

  if (stepData.step) {
    remoteLog(`[STEP CONTENT]\n${stepData.step}`, 'info');
    await fillField(row, selectors.step, stepData.step);
    await sleep(400); 
  } else {
    remoteLog(`> Skipping Step (Blank)`, 'warning');
  }
  
  if (stepData.testData) {
    remoteLog(`[TEST DATA CONTENT]\n${stepData.testData}`, 'info');
    await fillField(row, selectors.testData, stepData.testData);
    await sleep(400);
  } else {
    remoteLog(`> Skipping Test Data (Blank)`, 'warning');
  }
  
  if (stepData.expectedResult) {
    remoteLog(`[EXPECTED RESULT CONTENT]\n${stepData.expectedResult}`, 'info');
    await fillField(row, selectors.expected, stepData.expectedResult);
    await sleep(400);
  } else {
    remoteLog(`> Skipping Expected Result (Blank)`, 'warning');
  }
}

// ==================== Message Listener ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillSteps') {
    const frameInfo = `Frame: ${window.location.host}${window.location.pathname}`;
    console.log('[JiraHelper] Message RECEIVED:', frameInfo);
    
    // Log unconditionally so we can see which frames actually run the script
    const isUIFound = detectZephyrUI();
    remoteLog(`Received fillSteps in frame: ${window.location.host}. UI Detected: ${isUIFound}`, isUIFound ? 'success' : 'warning');

    if (isUIFound) {
      fillAllSteps(message.steps, message.delay || 1500);
      sendResponse({ status: 'started_in_frame', frame: frameInfo });
    } else {
      console.log('[JiraHelper] UI NOT detected in this frame.');
      sendResponse({ status: 'ignored_frame', frame: frameInfo });
    }
  } else if (message.action === 'stopFilling') {
    stopRequested = true;
    isCurrentlyFilling = false;
    sendResponse({ status: 'stopping' });
  } else if (message.action === 'ping') {
    sendResponse({ status: 'alive', url: window.location.href, uiSeen: detectZephyrUI() });
  }
  return true;
});

console.log('[JiraHelper] Content script initialized in frame:', window.location.href);
