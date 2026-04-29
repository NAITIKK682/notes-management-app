/**
 * ============ ENTERPRISE NOTES MANAGEMENT LOGIC ============
 * Refactored for: Clean Architecture, Human-Centric UI, 
 * Mobile-First Responsiveness, and Robust Error Handling.
 */

// ============ Configuration & State ============
const CONFIG = {
  // Update this to your deployed backend URL on Vercel later
  API_BASE: import.meta.env?.VITE_API_BASE || '/notes',
  TOAST_DURATION: 3000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 10000
};

const MESSAGES = {
  TITLE_CONTENT_REQUIRED: 'Please provide both a heading and details.',
  TITLE_CONTENT_CANNOT_EMPTY: 'Notes cannot be saved with empty fields.',
  NOTE_ADDED: 'Note successfully added to repository.',
  NOTE_UPDATED: 'Note updated successfully.',
  NOTE_DELETED: 'Note removed from collection.',
  CONFIRMATION_DELETE: 'Are you sure you want to delete this note?',
  FETCH_NOTES_FAILED: 'Unable to load your repository.',
  ADD_NOTE_FAILED: 'Could not save the note.',
  UPDATE_NOTE_FAILED: 'Update failed.',
  DELETE_NOTE_FAILED: 'Deletion failed.',
  TIMEOUT_ERROR: 'Connection timed out. Please try again.',
  NETWORK_ERROR: 'Network issue detected. Check your connection.',
  SAVING: 'Saving...',
  ADD_NOTE: 'Add Note'
};

// ============ DOM Elements ============
const noteForm = document.getElementById('noteForm');
const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('emptyState');
const submitBtn = noteForm?.querySelector('button[type="submit"]');

// Modal Elements for Edit Functionality
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModalBtn = document.getElementById('closeModalBtn');

// ============ Utility Functions ============

/**
 * XSS Protection: Escapes HTML characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Modern Toast System
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white; padding: 0.8rem 1.5rem; border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    z-index: 1000; font-weight: 500; animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, CONFIG.TOAST_DURATION);
}

/**
 * UI State Management
 */
function toggleLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? MESSAGES.SAVING : MESSAGES.ADD_NOTE;
  submitBtn.style.opacity = isLoading ? '0.7' : '1';
}

function updateEmptyState(isEmpty) {
  if (!emptyState) return;
  emptyState.style.display = isEmpty ? 'block' : 'none';
}

/**
 * Date Formatter: Fixes the "Invalid Date" issue seen in screenshot
 */
function formatDate(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently'; // Fallback if date parsing fails
  
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// ============ Core Operations ============

/**
 * GET: Fetch and Sort Notes
 */
async function fetchNotes(retryCount = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    const response = await fetch(CONFIG.API_BASE, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(MESSAGES.FETCH_NOTES_FAILED);

    const result = await response.json();
    const notes = result.data || result; // Handles both {data: []} and direct array responses
    
    // Sort by newest first (handling both created_at and createdAt)
    notes.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

    updateEmptyState(notes.length === 0);
    renderNotes(notes);

  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES && error.name !== 'AbortError') {
      setTimeout(() => fetchNotes(retryCount + 1), CONFIG.RETRY_DELAY);
    } else {
      showToast(error.name === 'AbortError' ? MESSAGES.TIMEOUT_ERROR : MESSAGES.FETCH_NOTES_FAILED, 'error');
    }
  }
}

/**
 * RENDER: Build Note Items
 */
function renderNotes(notes) {
  if (!notesList) return;
  
  notesList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  notes.forEach(note => {
    const noteEl = document.createElement('div');
    noteEl.className = 'note-item';
    noteEl.setAttribute('data-id', note._id);

    // Using either created_at or createdAt to avoid "Invalid Date"
    const timestamp = note.created_at || note.createdAt;

    noteEl.innerHTML = `
      <div class="note-actions">
        <button class="action-btn edit-btn" title="Edit Note" 
          data-id="${note._id}" 
          data-title="${escapeHtml(note.title)}" 
          data-content="${escapeHtml(note.content)}">
          <i data-lucide="pencil" style="width:18px"></i>
        </button>
        <button class="action-btn delete-btn" title="Delete Note" data-id="${note._id}">
          <i data-lucide="trash-2" style="width:18px"></i>
        </button>
      </div>
      <h3 class="note-heading">${escapeHtml(note.title)}</h3>
      <p class="note-body">${escapeHtml(note.content)}</p>
      <div class="note-date">Created: ${formatDate(timestamp)}</div>
    `;

    fragment.appendChild(noteEl);
  });

  notesList.appendChild(fragment);
  if (window.lucide) window.lucide.createIcons();
}

/**
 * POST: Add Note
 */
async function addNote(event) {
  event.preventDefault();

  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    showToast(MESSAGES.TITLE_CONTENT_REQUIRED, 'error');
    return;
  }

  toggleLoading(true);

  try {
    const response = await fetch(CONFIG.API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });

    if (!response.ok) throw new Error(MESSAGES.ADD_NOTE_FAILED);

    showToast(MESSAGES.NOTE_ADDED);
    noteForm.reset();
    await fetchNotes();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    toggleLoading(false);
  }
}

/**
 * PUT: Update existing Note
 */
async function handleEdit(event) {
  event.preventDefault();
  
  const id = document.getElementById('editNoteId').value;
  const title = document.getElementById('editTitle').value.trim();
  const content = document.getElementById('editContent').value.trim();

  if (!title || !content) {
    showToast(MESSAGES.TITLE_CONTENT_CANNOT_EMPTY, 'error');
    return;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });

    if (!response.ok) throw new Error(MESSAGES.UPDATE_NOTE_FAILED);

    showToast(MESSAGES.NOTE_UPDATED);
    editModal.classList.add('hidden');
    await fetchNotes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * DELETE: Remove Note
 */
async function handleDelete(id, noteEl) {
  if (!confirm(MESSAGES.CONFIRMATION_DELETE)) return;

  noteEl.style.opacity = '0.5';
  noteEl.style.pointerEvents = 'none';

  try {
    const response = await fetch(`${CONFIG.API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(MESSAGES.DELETE_NOTE_FAILED);
    
    noteEl.remove();
    showToast(MESSAGES.NOTE_DELETED);
    
    if (notesList.children.length === 0) updateEmptyState(true);
  } catch (error) {
    noteEl.style.opacity = '1';
    noteEl.style.pointerEvents = 'auto';
    showToast(MESSAGES.DELETE_NOTE_FAILED, 'error');
  }
}

// ============ Event Delegation & Listeners ============

function handleListClick(event) {
  const deleteBtn = event.target.closest('.delete-btn');
  const editBtn = event.target.closest('.edit-btn');

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const noteEl = deleteBtn.closest('.note-item');
    handleDelete(id, noteEl);
  }

  if (editBtn) {
    document.getElementById('editNoteId').value = editBtn.dataset.id;
    document.getElementById('editTitle').value = editBtn.dataset.title;
    document.getElementById('editContent').value = editBtn.dataset.content;
    editModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }
}

// ============ Initialization ============

function init() {
  if (noteForm) noteForm.addEventListener('submit', addNote);
  if (notesList) notesList.addEventListener('click', handleListClick);
  
  // Modal listeners
  if (editForm) editForm.addEventListener('submit', handleEdit);
  if (closeModalBtn) closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
  
  fetchNotes();
}

// Ensuring DOM is fully ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}