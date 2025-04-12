// script.js
document.addEventListener('DOMContentLoaded', function() {

    // عناصر DOM
    const elements = {
        taskForm: document.getElementById('task-form'),
        taskInput: document.getElementById('task-input'),
        reminderInput: document.getElementById('reminder-input'),
        priorityInput: document.getElementById('priority-input'),
        colorInput: document.getElementById('color-input'),
        tagsInput: document.getElementById('tags-input'),
        taskList: document.getElementById('task-list'),
        searchInput: document.getElementById('search-input'),
        filterSelect: document.getElementById('filter-select'),
        sortSelect: document.getElementById('sort-select'),
        groupSelect: document.getElementById('group-select'),
        exportBtn: document.getElementById('export-btn'),
        importInput: document.getElementById('import-input'),
        taskTemplate: document.getElementById('task-template')
    };

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let editingTaskId = null;

    // ========== دوال المساعدة ==========
    
    function saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            showNotification('تم حفظ المهام بنجاح', 'success');
        } catch (error) {
            console.error('Error saving tasks:', error);
            showNotification('حدث خطأ أثناء حفظ المهام', 'error');
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }, 100);
    }

    // ========== دوال إدارة المهام ==========

    function createTaskElement(task) {
        const clone = document.importNode(elements.taskTemplate.content, true);
        const taskItem = clone.querySelector('.task-item');
        const taskText = clone.querySelector('.task-text');
        const checkbox = clone.querySelector('.task-checkbox');
        const deleteBtn = clone.querySelector('.delete-btn');
        const editBtn = clone.querySelector('.edit-btn');
        const reminderBtn = clone.querySelector('.reminder-btn');
        const tagsContainer = clone.querySelector('.task-tags');

        taskItem.dataset.id = task.id;
        taskText.textContent = task.text;
        checkbox.checked = task.completed;
        taskItem.style.backgroundColor = task.color || '#ffffff';
        taskItem.classList.add(`priority-${task.priority}`);
        
        // إضافة العلامات
        if (task.tags?.length) {
            task.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'task-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }

        // إضافة التذكير
        if (task.reminder) {
            const reminderDate = new Date(task.reminder);
            const reminderSpan = document.createElement('span');
            reminderSpan.className = 'reminder-time';
            reminderSpan.textContent = reminderDate.toLocaleString('ar-SA');
            
            const now = new Date();
            const timeDiff = reminderDate - now;
            if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
                reminderSpan.classList.add('reminder-soon');
            }
            
            taskText.appendChild(document.createElement('br'));
            taskText.appendChild(reminderSpan);
        }

        if (task.completed) {
            taskItem.classList.add('task-completed');
        }

        // معالجات الأحداث
        checkbox.addEventListener('change', () => toggleTask(task.id));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        editBtn.addEventListener('click', () => editTask(task.id));
        reminderBtn.addEventListener('click', () => manageReminders(task.id));

        return taskItem;
    }

    function renderTasks() {
        elements.taskList.innerHTML = '';
        const filteredTasks = filterTasks(tasks);
        const groupedTasks = groupTasks(filteredTasks);
        
        if (elements.groupSelect.value === 'none') {
            sortTasks(filteredTasks).forEach(task => {
                elements.taskList.appendChild(createTaskElement(task));
            });
        } else {
            Object.entries(groupedTasks).forEach(([groupName, groupTasks]) => {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'task-group';
                
                const groupHeader = document.createElement('div');
                groupHeader.className = 'task-group-header';
                groupHeader.innerHTML = `
                    <h3>${groupName}</h3>
                    <span class="task-count">${groupTasks.length} مهمة</span>
                `;
                
                groupContainer.appendChild(groupHeader);
                sortTasks(groupTasks).forEach(task => {
                    groupContainer.appendChild(createTaskElement(task));
                });
                
                elements.taskList.appendChild(groupContainer);
            });
        }
    }

    function filterTasks(tasks) {
        const filterValue = elements.filterSelect.value;
        const searchText = elements.searchInput.value.toLowerCase();

        return tasks.filter(task => {
            const matchesFilter = 
                filterValue === 'all' ||
                (filterValue === 'active' && !task.completed) ||
                (filterValue === 'completed' && task.completed) ||
                (filterValue === 'withReminder' && task.reminder);

            const matchesSearch = searchText === '' || (
                task.text.toLowerCase().includes(searchText) ||
                (task.tags?.some(tag => tag.toLowerCase().includes(searchText))) ||
                (task.reminder && new Date(task.reminder).toLocaleDateString('ar-SA').includes(searchText))
            );

            return matchesFilter && matchesSearch;
        });
    }

    function sortTasks(tasks) {
        const sortValue = elements.sortSelect.value;
        
        return [...tasks].sort((a, b) => {
            switch (sortValue) {
                case 'date': return new Date(b.createdAt) - new Date(a.createdAt);
                case 'priority': 
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'alphabetical': return a.text.localeCompare(b.text, 'ar');
                case 'reminder':
                    if (!a.reminder && !b.reminder) return 0;
                    if (!a.reminder) return 1;
                    if (!b.reminder) return -1;
                    return new Date(a.reminder) - new Date(b.reminder);
                default: return 0;
            }
        });
    }

    function groupTasks(tasks) {
        const groupValue = elements.groupSelect.value;
        if (groupValue === 'none') return tasks;
        
        const grouped = {};
        
        tasks.forEach(task => {
            let groupKey = 'آخر';
            
            switch (groupValue) {
                case 'priority':
                    groupKey = task.priority === 'high' ? 'عالي' : 
                              task.priority === 'medium' ? 'متوسط' : 'منخفض';
                    break;
                case 'date':
                    groupKey = new Date(task.createdAt).toLocaleDateString('ar-SA');
                    break;
                case 'tags':
                    if (task.tags?.length) {
                        task.tags.forEach(tag => {
                            if (!grouped[tag]) grouped[tag] = [];
                            grouped[tag].push(task);
                        });
                        return;
                    }
                    groupKey = 'بدون وسوم';
                    break;
                case 'reminder':
                    groupKey = task.reminder ? 'مع تذكير' : 'بدون تذكير';
                    break;
            }
            
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(task);
        });
        
        return grouped;
    }

    // ========== دوال العمليات الأساسية ==========

    function toggleTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        }
    }

    function deleteTask(taskId) {
        // تعطيل زر الحذف لمنع النقر المتكرر
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        const deleteBtn = taskElement.querySelector('.delete-btn');
        deleteBtn.disabled = true;

        // عرض رسالة تأكيد مع تفاصيل المهمة
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            deleteBtn.disabled = false;
            return;
        }

        if (confirm(`هل أنت متأكد من حذف المهمة التالية؟\n\n${task.text}`)) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
            showNotification('تم حذف المهمة بنجاح', 'success');
        } else {
            deleteBtn.disabled = false;
        }
    }

    function editTask(taskId) {
        // تعطيل زر التعديل لمنع النقر المتكرر
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        const editBtn = taskElement.querySelector('.edit-btn');
        editBtn.disabled = true;

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('لم يتم العثور على المهمة', 'error');
            editBtn.disabled = false;
            return;
        }

        // تعطيل جميع أزرار التعديل الأخرى
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.disabled = true;
        });

        elements.taskInput.value = task.text;
        elements.reminderInput.value = task.reminder || '';
        elements.priorityInput.value = task.priority;
        elements.colorInput.value = task.color || '#ffffff';
        elements.tagsInput.value = task.tags?.join(', ') || '';
        
        editingTaskId = taskId;
        const addButton = elements.taskForm.querySelector('.add-btn');
        addButton.textContent = 'تحديث';
        addButton.classList.add('edit-mode');
        elements.taskInput.focus();
    }

    function manageReminders(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('لم يتم العثور على المهمة', 'error');
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'reminder-dialog';
        dialog.innerHTML = `
            <div class="reminder-dialog-content">
                <h2>إدارة التذكيرات</h2>
                <div class="reminder-options">
                    <div class="reminder-option">
                        <label>وقت التذكير</label>
                        <input type="datetime-local" id="reminder-time" value="${task.reminder || ''}">
                    </div>
                    <div class="reminder-option">
                        <label>تكرار التذكير</label>
                        <select id="reminder-repeat">
                            <option value="">بدون تكرار</option>
                            <option value="daily">يومياً</option>
                            <option value="weekly">أسبوعياً</option>
                            <option value="monthly">شهرياً</option>
                        </select>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="save-btn">حفظ</button>
                    <button class="cancel-btn">إلغاء</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const reminderTimeInput = dialog.querySelector('#reminder-time');
        const reminderRepeatSelect = dialog.querySelector('#reminder-repeat');
        
        if (task.repeatInterval) {
            reminderRepeatSelect.value = task.repeatInterval;
        }

        dialog.querySelector('.save-btn').addEventListener('click', () => {
            const reminderTime = reminderTimeInput.value;
            const repeatInterval = reminderRepeatSelect.value;

            task.reminder = reminderTime || null;
            task.repeatInterval = repeatInterval || null;
            
            saveTasks();
            renderTasks();
            dialog.remove();
            showNotification('تم حفظ التذكير بنجاح', 'success');
        });

        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });
    }

    // ========== معالجات الأحداث ==========

    elements.taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taskText = elements.taskInput.value.trim();
        if (!taskText) return;
        
        const taskData = {
            text: taskText,
            reminder: elements.reminderInput.value || null,
            priority: elements.priorityInput.value,
            color: elements.colorInput.value,
            tags: elements.tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag),
            createdAt: new Date().toISOString(),
            completed: false
        };

        if (editingTaskId) {
            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            if (taskIndex !== -1) {
                taskData.completed = tasks[taskIndex].completed;
                tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
                showNotification('تم تحديث المهمة بنجاح', 'success');
            }
            
            editingTaskId = null;
            const addButton = elements.taskForm.querySelector('.add-btn');
            addButton.textContent = 'إضافة';
            addButton.classList.remove('edit-mode');
        } else {
            taskData.id = Date.now().toString();
            tasks.push(taskData);
            showNotification('تمت إضافة المهمة بنجاح', 'success');
        }

        saveTasks();
        renderTasks();
        this.reset();
    });

    elements.searchInput.addEventListener('input', renderTasks);
    elements.filterSelect.addEventListener('change', renderTasks);
    elements.sortSelect.addEventListener('change', renderTasks);
    elements.groupSelect.addEventListener('change', renderTasks);

    elements.exportBtn.addEventListener('click', function() {
        const dataStr = JSON.stringify(tasks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('تم تصدير المهام بنجاح', 'success');
    });

    elements.importInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (confirm('هل تريد استيراد المهام؟ سيتم استبدال المهام الحالية.')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedTasks = JSON.parse(e.target.result);
                    if (Array.isArray(importedTasks)) {
                        tasks = importedTasks;
                        saveTasks();
                        renderTasks();
                        showNotification('تم استيراد المهام بنجاح', 'success');
                    } else {
                        showNotification('ملف غير صالح', 'error');
                    }
                } catch (err) {
                    console.error('Error importing tasks:', err);
                    showNotification('حدث خطأ أثناء استيراد المهام', 'error');
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    });

    // التحقق من التذكيرات
    setInterval(() => {
        const now = new Date();
        tasks.forEach(task => {
            if (task.reminder && !task.completed) {
                const reminderTime = new Date(task.reminder);
                if (now >= reminderTime) {
                    showNotification(`تذكير: ${task.text}`, 'warning');
                    
                    if (task.repeatInterval) {
                        const nextReminder = new Date(reminderTime);
                        
                        switch (task.repeatInterval) {
                            case 'daily': nextReminder.setDate(nextReminder.getDate() + 1); break;
                            case 'weekly': nextReminder.setDate(nextReminder.getDate() + 7); break;
                            case 'monthly': nextReminder.setMonth(nextReminder.getMonth() + 1); break;
                        }
                        
                        task.reminder = nextReminder.toISOString();
                    } else {
                        task.reminder = null;
                    }
                    
                    saveTasks();
                    renderTasks();
                }
            }
        });
    }, 60000);

    // التهيئة الأولية
    renderTasks();
});
