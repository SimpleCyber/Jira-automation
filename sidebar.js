/**
 * Jira Helper – Sidebar Logic
 * Parses pasted test scripts and communicates with content script
 */

// ==================== DOM Elements ====================
const scriptInput = document.getElementById('script-input');
const parseBtn = document.getElementById('parse-btn');
const clearBtn = document.getElementById('clear-btn');
const editBtn = document.getElementById('edit-btn');
const fillBtn = document.getElementById('fill-btn');
const stopBtn = document.getElementById('stop-btn');
const stepCount = document.getElementById('step-count');
const stepsList = document.getElementById('steps-list');
const delaySlider = document.getElementById('delay-slider');
const delayValue = document.getElementById('delay-value');
const progressBar = document.getElementById('progress-bar');
const logContainer = document.getElementById('log-container');

const inputSection = document.getElementById('input-section');
const previewSection = document.getElementById('preview-section');
const fillSection = document.getElementById('fill-section');
const logSection = document.getElementById('log-section');
const copyPromptBtn = document.getElementById('copy-prompt-btn');

let parsedSteps = [];
let isFilling = false;

// ==================== Prompt Generator ====================

const AI_PROMPT = `You are a QA automation expert writing test cases for Zephyr Scale. Please generate the requested test cases strictly using the following markdown format:

### TC-01: [Test Case Title]
**Steps:**
1. [Step 1 description]
2. [Step 2 description]

**Test Data:**
[Test Data for steps, if any. Leave blank or (none) if not applicable]

**Expected Result:**
[Expected overall result for the test case]

Note: 
- Use '### ' for the Test Case Title.
- Use exact bold headers: '**Steps:**', '**Test Data:**', and '**Expected Result:**'.
- Group all steps into a single numbered list. Do not split steps and results individually.`;

if(copyPromptBtn) {
  copyPromptBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      const originalText = copyPromptBtn.innerHTML;
      copyPromptBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style="vertical-align: middle;">Copied!</span>
      `;
      copyPromptBtn.style.backgroundColor = '#3fb950';
      copyPromptBtn.style.color = '#ffffff';
      
      setTimeout(() => {
        copyPromptBtn.innerHTML = originalText;
        copyPromptBtn.style.backgroundColor = '';
        copyPromptBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  });
}

// ==================== Parser ====================

/**
 * Parse multi-TC or single-TC test script text into step objects.
 * Each step = { step: string, testData: string, expectedResult: string }
 */
function parseTestScript(text) {
  const steps = [];

  // Match any Test Case header, even without ###
  // Captures the title: e.g., "TC-01: Valid Data"
  const tcPattern = /^(?:###|##)?\s*\*{0,2}(TC-?\d+.*?)\*{0,2}\s*$/gim;
  const tcHeaders = [...text.matchAll(tcPattern)];

  let blocks = [];
  if (tcHeaders.length > 0) {
    for (let i = 0; i < tcHeaders.length; i++) {
        const title = tcHeaders[i][1].trim(); 
        const start = tcHeaders[i].index + tcHeaders[i][0].length;
        const end = i + 1 < tcHeaders.length ? tcHeaders[i + 1].index : text.length;
        blocks.push({
            title: title,
            content: text.slice(start, end)
        });
    }
  } else {
    // If no TC headers found, treat entire text as 1 block
    blocks.push({ title: '', content: text });
  }

  for (const block of blocks) {
    const parsed = parseSingleBlock(block.content);
    if (parsed) {
      // PREPEND THE TITLE AND "Steps:" AS REQUESTED!
      if (block.title) {
        parsed.step = `**${block.title}**\nSteps:\n${parsed.step}`;
      }
      steps.push(parsed);
    }
  }

  return steps;
}

function parseSingleBlock(block) {
  const normText = block.replace(/\r\n/g, '\n');
  
  // Use strictly line-anchored regexes so it ignores inline markdown
  const stepRegex = /^(?:\*\*|###|##|-)?\s*Steps?\s*:?(?:\*\*)?\s*$/im;
  const dataRegex = /^(?:\*\*|###|##|-)?\s*Test\s*Data\s*:?(?:\*\*)?\s*$/im;
  const expectedRegex = /^(?:\*\*|###|##|-)?\s*Expected\s*Result[s]?\s*:?(?:\*\*)?\s*$/im;

  const mStep = stepRegex.exec(normText);
  const mData = dataRegex.exec(normText);
  const mExpected = expectedRegex.exec(normText);

  const headers = [];
  if (mStep) headers.push({ type: 'step', index: mStep.index, length: mStep[0].length });
  if (mData) headers.push({ type: 'testData', index: mData.index, length: mData[0].length });
  if (mExpected) headers.push({ type: 'expectedResult', index: mExpected.index, length: mExpected[0].length });

  if (headers.length === 0) {
    const trimmed = cleanContent(normText);
    return trimmed ? { step: trimmed, testData: '', expectedResult: '' } : null;
  }

  headers.sort((a, b) => a.index - b.index);

  const result = { step: '', testData: '', expectedResult: '' };
  
  for (let i = 0; i < headers.length; i++) {
    const cur = headers[i];
    const next = headers[i + 1];
    const start = cur.index + cur.length;
    const end = next ? next.index : normText.length;
    
    result[cur.type] = cleanContent(normText.substring(start, end));
  }

  return result;
}

function cleanContent(text) {
  if (!text) return '';

  return text
    // Remove markdown code fences
    .replace(/```[\w]*\s*\n?([\s\S]*?)```/g, '$1')
    // Deliberately preserving `**` and numbered lists so they output cleanly into Jira
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .trim();
}

// ==================== UI Rendering ====================

function renderSteps() {
  stepsList.innerHTML = '';

  parsedSteps.forEach((step, i) => {
    const card = document.createElement('div');
    card.className = 'step-card';
    card.dataset.index = i;
    card.innerHTML = `
      <div class="step-card-header">
        <span class="step-number">${i + 1}</span>
        <span class="step-card-title">${truncate(step.step, 60)}</span>
      </div>
      <div class="step-card-fields">
        <div class="step-field">
          <span class="step-field-label">Test Data:</span>
          <span class="step-field-value ${step.testData ? '' : 'empty'}">
            ${step.testData ? truncate(step.testData, 50) : '(none)'}
          </span>
        </div>
        <div class="step-field">
          <span class="step-field-label">Expected:</span>
          <span class="step-field-value ${step.expectedResult ? '' : 'empty'}">
            ${step.expectedResult ? truncate(step.expectedResult, 50) : '(none)'}
          </span>
        </div>
      </div>
    `;
    stepsList.appendChild(card);
  });
}

function truncate(str, maxLen) {
  const firstLine = str.split('\n')[0];
  if (firstLine.length > maxLen) {
    return escapeHtml(firstLine.slice(0, maxLen)) + '…';
  }
  return escapeHtml(firstLine);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addLog(msg, type = '') {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-msg ${type}" style="white-space: pre-wrap;">${escapeHtml(msg)}</span>
  `;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function updateProgress(current, total) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  progressBar.style.width = pct + '%';
}

function markCard(index, status) {
  const card = stepsList.querySelector(`[data-index="${index}"]`);
  if (card) {
    card.classList.remove('filled', 'active', 'error');
    if (status) card.classList.add(status);
  }
}

// ==================== Actions ====================

parseBtn.addEventListener('click', () => {
  const text = scriptInput.value.trim();
  if (!text) return;

  parsedSteps = parseTestScript(text);

  if (parsedSteps.length === 0) {
    stepCount.textContent = 'No steps found';
    stepCount.style.color = 'var(--red)';
    return;
  }

  stepCount.textContent = `${parsedSteps.length} step${parsedSteps.length > 1 ? 's' : ''} found`;
  stepCount.style.color = 'var(--green)';

  renderSteps();

  inputSection.style.display = 'none';
  previewSection.style.display = 'block';
  fillSection.style.display = 'block';
});

clearBtn.addEventListener('click', () => {
  scriptInput.value = '';
  parsedSteps = [];
  stepCount.textContent = '';
  stepsList.innerHTML = '';
  previewSection.style.display = 'none';
  fillSection.style.display = 'none';
  logSection.style.display = 'none';
  logContainer.innerHTML = '';
  progressBar.style.width = '0%';
});

editBtn.addEventListener('click', () => {
  inputSection.style.display = 'block';
  previewSection.style.display = 'none';
  fillSection.style.display = 'none';
});

delaySlider.addEventListener('input', () => {
  delayValue.textContent = (delaySlider.value / 1000).toFixed(1) + 's';
});

fillBtn.addEventListener('click', async () => {
  if (parsedSteps.length === 0) return;

  // 1. Check if content script is alive
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('No active tab found');
    
    // Check if we can talk to the content script
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (resp) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(resp);
      });
    });

    if (!response) {
      addLog('Could not connect to page. Please refresh Jira and try again.', 'error');
      // Continue anyway in case ping failed but it will still work
    }
  } catch (err) {
    addLog('Error connecting to tab: ' + err.message, 'error');
  }

  isFilling = true;
  fillBtn.style.display = 'none';
  stopBtn.style.display = 'flex';
  logSection.style.display = 'block';
  logContainer.innerHTML = '';

  const delay = parseInt(delaySlider.value);
  addLog(`Starting to fill ${parsedSteps.length} steps...`, 'info');

  chrome.runtime.sendMessage({
    target: 'content',
    action: 'fillSteps',
    steps: parsedSteps,
    delay: delay,
  });
});

stopBtn.addEventListener('click', async () => {
  isFilling = false;
  fillBtn.style.display = 'flex';
  stopBtn.style.display = 'none';

  // Send stop directly to all frames in the active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'stopFilling' }, () => {
        if (chrome.runtime.lastError) { /* ignore */ }
      });
    }
  } catch (e) { /* ignore */ }

  addLog('Filling stopped by user', 'warning');
});

// ==================== Message Listener ====================

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'stepProgress') {
    const { index, total, status, msg } = message;

    if (status === 'start') {
      markCard(index, 'active');
      addLog(msg || `Filling step ${index + 1}...`, 'info');
    } else if (status === 'done') {
      markCard(index, 'filled');
      addLog(msg || `Step ${index + 1} filled ✓`, 'success');
      updateProgress(index + 1, total);
    } else if (status === 'error') {
      markCard(index, 'error');
      addLog(msg || `Error on step ${index + 1}`, 'error');
    }
  }

  if (message.action === 'fillComplete') {
    addLog(`All ${message.total} steps filled successfully!`, 'success');
    isFilling = false;
    fillBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    fillBtn.disabled = true;
    fillBtn.textContent = '✓ Done';
  }

  if (message.action === 'fillError') {
    addLog(message.msg || 'Fill process encountered an error', 'error');
    isFilling = false;
    fillBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
  }
  
  if (message.action === 'remoteLog') {
    let msg = message.msg;
    let type = message.type;
    
    // Check for structured content headers like [STEP CONTENT]
    if (msg.startsWith('[') && msg.includes(']')) {
      const headerEnd = msg.indexOf(']') + 1;
      const header = msg.substring(0, headerEnd);
      const content = msg.substring(headerEnd).trim();
      addLog(`<b>${header}</b>\n${content}`, type);
    } else {
      addLog('[Remote] ' + msg, type);
    }
  }
});

// ==================== Init ====================

// Load saved delay
chrome.storage.local.get('stepDelay', (data) => {
  if (data.stepDelay) {
    delaySlider.value = data.stepDelay;
    delayValue.textContent = (data.stepDelay / 1000).toFixed(1) + 's';
  }
});

delaySlider.addEventListener('change', () => {
  chrome.storage.local.set({ stepDelay: parseInt(delaySlider.value) });
});
