// Application State
let tasksState = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.nav-item');
const currentFilterTitle = document.getElementById('current-filter-title');

// Sidebar counts
const countAll = document.getElementById('count-all');
const countPending = document.getElementById('count-pending');
const countCompleted = document.getElementById('count-completed');

// Progress indicators
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Modal Elements
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title-input');
const taskDescInput = document.getElementById('task-desc-input');
const taskDueInput = document.getElementById('task-due-input');
const modalTitle = document.getElementById('modal-title');

// Button controllers
const openAddModalBtn = document.getElementById('open-add-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Search input handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });

    // Sidebar filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            
            // Update UI title
            const filterTitles = {
                'all': 'All Tasks',
                'pending': 'Pending Tasks',
                'completed': 'Completed Tasks'
            };
            currentFilterTitle.textContent = filterTitles[currentFilter] || 'Tasks';
            renderTasks();
        });
    });

    // Modal Control
    openAddModalBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    
    // Close modal on clicking backdrop
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    // Form Submit
    taskForm.addEventListener('submit', handleFormSubmit);
}

// Show Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12L11 15L16 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    if (type === 'error') {
        icon = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Fetch Tasks from API
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        tasksState = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showToast('Error loading tasks. Please try again.', 'error');
        taskList.innerHTML = `
            <div class="empty-state">
                <p>Could not connect to the database. Make sure the server is running.</p>
            </div>
        `;
    }
}

// Handle Form Submission (Add or Edit)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const dueDate = taskDueInput.value;
    
    if (!title) {
        showToast('Task title is required.', 'error');
        return;
    }
    
    const payload = {
        title: title,
        description: description,
        due_date: dueDate
    };
    
    try {
        let response;
        if (id) {
            // Edit mode
            response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create mode
            response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server request failed');
        }
        
        const savedTask = await response.json();
        
        if (id) {
            // Update local state
            const index = tasksState.findIndex(t => t.id === parseInt(id));
            if (index !== -1) tasksState[index] = savedTask;
            showToast('Task updated successfully!');
        } else {
            // Add to local state (prepend since we order desc by date created)
            tasksState.unshift(savedTask);
            showToast('Task created successfully!');
        }
        
        closeModal();
        renderTasks();
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message || 'Error saving task.', 'error');
    }
}

// Toggle task completion status
async function toggleTaskComplete(taskId, currentStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !currentStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update task');
        
        const updatedTask = await response.json();
        
        // Update local state
        const index = tasksState.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasksState[index] = updatedTask;
        }
        
        if (updatedTask.completed) {
            showToast('Task completed! Keep it up.');
        } else {
            showToast('Task marked as pending.');
        }
        
        renderTasks();
    } catch (error) {
        console.error('Error toggling complete:', error);
        showToast('Failed to update task status.', 'error');
    }
}

// Delete a task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        
        // Remove from local state
        tasksState = tasksState.filter(t => t.id !== taskId);
        showToast('Task deleted successfully.');
        renderTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Failed to delete task.', 'error');
    }
}

// Modal management
function openModal(task = null) {
    if (task) {
        // Edit mode
        modalTitle.textContent = 'Edit Task';
        taskIdInput.value = task.id;
        taskTitleInput.value = task.title;
        taskDescInput.value = task.description || '';
        taskDueInput.value = task.due_date || '';
    } else {
        // Add mode
        modalTitle.textContent = 'Create New Task';
        taskForm.reset();
        taskIdInput.value = '';
    }
    taskModal.classList.add('open');
    taskTitleInput.focus();
}

function closeModal() {
    taskModal.classList.remove('open');
    taskForm.reset();
    taskIdInput.value = '';
}

// Helper to determine due date category (today, overdue, normal)
function getDueDateStatus(dueDateStr) {
    if (!dueDateStr) return { label: '', class: '' };
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (dueDateStr === todayStr) {
        return { label: 'Due Today', class: 'today' };
    } else if (dueDateStr < todayStr) {
        return { label: 'Overdue', class: 'overdue' };
    } else {
        // Format date string to a friendlier output
        const parts = dueDateStr.split('-');
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const formatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return { label: `Due ${formatted}`, class: '' };
    }
}

// Render tasks UI based on filters and search
function renderTasks() {
    // 1. Calculate general stats across ALL tasks (unfiltered)
    const totalCount = tasksState.length;
    const completedCount = tasksState.filter(t => t.completed).length;
    const pendingCount = totalCount - completedCount;
    
    countAll.textContent = totalCount;
    countPending.textContent = pendingCount;
    countCompleted.textContent = completedCount;
    
    // Update progress bar
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${completedCount} of ${totalCount} tasks completed`;

    // 2. Filter tasks based on current filter state & search query
    let filteredTasks = tasksState;
    
    if (currentFilter === 'pending') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }
    
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(searchQuery) || 
            (t.description && t.description.toLowerCase().includes(searchQuery))
        );
    }

    // 3. Render list
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <h3>No tasks found</h3>
                <p>${searchQuery ? 'Try clearing your search query' : 'Create a task to get started!'}</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = '';
    
    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed' : ''}`;
        
        // Due date analysis
        const dueStatus = getDueDateStatus(task.due_date);
        const dueBadgeHtml = dueStatus.label 
            ? `<span class="badge badge-due-date ${dueStatus.class}">${dueStatus.label}</span>` 
            : '';
            
        // Build card HTML
        card.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            </div>
            <div class="task-info">
                <span class="task-title">${escapeHTML(task.title)}</span>
                ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="badge badge-status">${task.completed ? 'Completed' : 'Pending'}</span>
                    ${dueBadgeHtml}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon edit-btn" title="Edit Task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="btn-icon delete btn-icon delete-btn" title="Delete Task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add card event listeners
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => toggleTaskComplete(task.id, task.completed));
        
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => openModal(task));
        
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        taskList.appendChild(card);
    });
}

// Simple HTML escaping helper to prevent XSS injection
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
