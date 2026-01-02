// Todo App - Task Management Application

class TodoApp {
    constructor() {
        // DOM Elements
        this.form = document.getElementById('todo-form');
        this.input = document.getElementById('todo-input');
        this.todoList = document.getElementById('todo-list');
        this.emptyState = document.getElementById('empty-state');
        this.totalTasks = document.getElementById('total-tasks');
        this.completedTasks = document.getElementById('completed-tasks');
        this.clearCompletedBtn = document.getElementById('clear-completed');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        // Application state
        this.todos = this.loadFromStorage();
        this.currentFilter = 'all';

        // Initialize
        this.init();
    }

    init() {
        // Event listeners
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        // Initial render
        this.render();
    }

    // Load tasks from localStorage
    loadFromStorage() {
        const stored = localStorage.getItem('todos');
        return stored ? JSON.parse(stored) : [];
    }

    // Save tasks to localStorage
    saveToStorage() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    // Generate a unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Handle form submission
    handleSubmit(e) {
        e.preventDefault();
        const text = this.input.value.trim();
        
        if (text) {
            this.addTodo(text);
            this.input.value = '';
            this.input.focus();
        }
    }

    // Add a new task
    addTodo(text) {
        const todo = {
            id: this.generateId(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.saveToStorage();
        this.render();
    }

    // Toggle task status
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveToStorage();
            this.render();
        }
    }

    // Delete a task
    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveToStorage();
        this.render();
    }

    // Clear all completed tasks
    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.saveToStorage();
        this.render();
    }

    // Handle filter change
    handleFilter(e) {
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
    }

    // Filter tasks based on current filter
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'pending':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    // Update statistics
    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;

        this.totalTasks.textContent = `${total} task${total !== 1 ? 's' : ''}`;
        this.completedTasks.textContent = `${completed} completed`;

        // Show/hide clear completed button
        this.clearCompletedBtn.style.display = completed > 0 ? 'inline-block' : 'none';
    }

    // Create HTML element for a task
    createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        li.innerHTML = `
            <div class="checkbox" role="checkbox" aria-checked="${todo.completed}" tabindex="0"></div>
            <span class="todo-text">${this.escapeHtml(todo.text)}</span>
            <button class="delete-btn" aria-label="Delete task">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        // Event listeners for the task
        const checkbox = li.querySelector('.checkbox');
        const deleteBtn = li.querySelector('.delete-btn');

        checkbox.addEventListener('click', () => this.toggleTodo(todo.id));
        checkbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTodo(todo.id);
            }
        });

        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

        return li;
    }

    // Escape HTML characters to prevent XSS attacks
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Render the interface
    render() {
        const filteredTodos = this.getFilteredTodos();

        // Clear the list
        this.todoList.innerHTML = '';

        // Display filtered tasks
        filteredTodos.forEach(todo => {
            const element = this.createTodoElement(todo);
            this.todoList.appendChild(element);
        });

        // Handle empty state
        if (filteredTodos.length === 0) {
            this.emptyState.classList.remove('hidden');
        } else {
            this.emptyState.classList.add('hidden');
        }

        // Update statistics
        this.updateStats();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
