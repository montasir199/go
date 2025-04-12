document.addEventListener('DOMContentLoaded', function () {
    // =========================================
    // تهيئة المتغيرات وعناصر DOM
    // =========================================
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const reminderInput = document.getElementById('reminder-input'); // قد يكون هذا هو حقل الوقت الأولي أو يُستخدم داخل manageReminders
    const priorityInput = document.getElementById('priority-input'); // يُستخدم كفلتر أو في النموذج؟ افترض أنه في النموذج الآن
    const colorInput = document.getElementById('color-input');
    const tagsInput = document.getElementById('tags-input');
    const taskList = document.getElementById('task-list');
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');
    const sortSelect = document.getElementById('sort-select');
    const exportBtn = document.getElementById('export-btn');
    const importInput = document.getElementById('import-input'); // عنصر <input type="file">؟
    const taskTemplate = document.getElementById('task-template');
    const groupSelect = document.getElementById('group-select');
    const addTaskBtn = document.getElementById('add-task-btn'); // افترض وجود زر للإضافة/التحديث

    let tasks = []; // سيتم تحميلها لاحقًا
    let editItemId = null; // لتتبع المهمة التي يتم تعديلها
    let activeReminders = new Map(); // لتتبع مؤقتات التذكير النشطة { taskId: timerId }

    // =========================================
    // مكتبة الأصوات للتنبيهات
    // =========================================
    const NOTIFICATION_SOUNDS = {
        bell: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3', name: 'جرس', preview: true, category: 'تنبيهات' },
        chime: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3', name: 'رنين', preview: true, category: 'تنبيهات' },
        melody: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-happy-bells-notification-937.mp3', name: 'نغمة', preview: true, category: 'موسيقى' },
        alert: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-alert-2573.mp3', name: 'تنبيه', preview: true, category: 'تنبيهات' },
        gentle: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-remove-2576.mp3', name: 'لطيف', preview: true, category: 'هادئ' },
        ding: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3', name: 'رنة', preview: true, category: 'تنبيهات' },
        success: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3', name: 'نجاح', preview: true, category: 'إنجاز' },
        complete: { url: 'https://assets.mixkit.co/sfx/preview/mixkit-achievement-completed-2068.mp3', name: 'إكمال', preview: true, category: 'إنجاز' }
    };

    // تخزين تفضيلات الصوت
    let soundPreferences = JSON.parse(localStorage.getItem('soundPreferences')) || {
        defaultVolume: 0.7,
        defaultSound: 'bell',
        muteAll: false
    };

    // =========================================
    // الدوال المساعدة الأساسية
    // =========================================

    // دالة لحفظ المهام في التخزين المحلي (تحتاج للتأكد من وجودها أو تعريفها)
    function saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('خطأ في حفظ المهام:', error);
            showNotification('حدث خطأ أثناء حفظ المهام.', 'error');
        }
    }

    // دالة لتحميل المهام من التخزين المحلي
    function loadTasks() {
        try {
            const storedTasks = localStorage.getItem('tasks');
            tasks = storedTasks ? JSON.parse(storedTasks) : [];
        } catch (error) {
            console.error('خطأ في تحميل المهام:', error);
            tasks = []; // ابدأ بمصفوفة فارغة في حالة الخطأ
            showNotification('حدث خطأ أثناء تحميل المهام.', 'error');
        }
    }

    // دالة إظهار الإشعارات للمستخدم
    function showNotification(message, type = 'info') { // Default type to 'info'
        const notification = document.createElement('div');
        notification.className = `notification ${type}`; // success, error, info
        // إضافة أيقونة (اختياري)
        let iconClass = '';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        else if (type === 'info') iconClass = 'fas fa-info-circle';
        if (iconClass) {
             notification.innerHTML = `<i class="${iconClass}"></i> `;
        }
        notification.appendChild(document.createTextNode(message)); // استخدام textNode للأمان

        document.body.appendChild(notification);

        // بدء الأنيميشن للدخول (يفترض أن CSS يتعامل مع animation: slideIn)
        // Set initial state for animation if not handled by CSS animation 'from' state
         notification.style.opacity = '1'; // Make sure it's visible before fadeOut timeout

        setTimeout(() => {
            // بدء الأنيميشن للخروج (يفترض وجود .fade-out في CSS مع animation: fadeOut)
            notification.classList.add('fade-out');
            // إزالة العنصر بعد انتهاء أنيميشن الخروج
            notification.addEventListener('animationend', () => notification.remove());
             // Fallback removal if animationend doesn't fire reliably
             setTimeout(() => notification.remove(), 500);
        }, 3000); // مدة بقاء الإشعار
    }

    // دالة العثور على مهمة بواسطة ID
    function findTaskById(taskId) {
        // قد تحتاج لتحويل taskId إلى نفس نوع البيانات المخزن في tasks (رقم أو سلسلة نصية)
        return tasks.find(task => String(task.id) === String(taskId));
    }

    // دالة الحصول على نص التكرار
    function getRepeatText(interval) {
        switch (interval) {
            case 'daily': return 'يومياً';
            case 'weekly': return 'أسبوعياً';
            case 'monthly': return 'شهرياً';
            default: return '';
        }
    }

    // =========================================
    // دوال التذكير والأصوات
    // =========================================

    // دالة تشغيل صوت معاينة
    function previewSound(soundId) {
        if (soundPreferences.muteAll) {
            showNotification('الأصوات مكتومة حالياً', 'info');
            return;
        }

        const sound = NOTIFICATION_SOUNDS[soundId];
        if (sound && sound.preview) {
            const audio = new Audio(sound.url);
            audio.volume = soundPreferences.defaultVolume;
            
            // إضافة مؤثرات صوتية
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audio);
            const gainNode = audioContext.createGain();
            const panNode = audioContext.createStereoPanner();
            
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(audioContext.destination);
            
            // تطبيق مؤثرات الصوت
            gainNode.gain.value = soundPreferences.defaultVolume;
            panNode.pan.value = 0; // توازن الصوت في الوسط
            
            audio.play()
                .then(() => console.log(`تشغيل صوت المعاينة: ${soundId}`))
                .catch(error => {
                    console.error('خطأ في تشغيل صوت المعاينة:', error);
                    showNotification('تعذر تشغيل الصوت', 'error');
                });
        }
    }

    // دالة الحصول على بيانات صوت التنبيه
    function getNotificationSound(soundId) {
        return NOTIFICATION_SOUNDS[soundId] || NOTIFICATION_SOUNDS.bell; // صوت افتراضي
    }

    // دالة لجدولة تذكير لمهمة (تحتاج للتنفيذ الكامل)
    function scheduleReminder(task) {
        // 1. التحقق من وجود تذكير وأن وقته في المستقبل
        if (!task.reminder || task.completed) return; // لا تذكير للمهام المكتملة
        const reminderDate = new Date(task.reminder);
        const now = new Date();
        const timeDiff = reminderDate - now;

        if (timeDiff <= 0) return; // الوقت قد مضى

        // 2. إلغاء أي مؤقت قديم لهذه المهمة
        if (activeReminders.has(task.id)) {
            clearTimeout(activeReminders.get(task.id));
            activeReminders.delete(task.id);
        }

        // 3. جدولة المؤقت الجديد مع مراعاة الأولوية
        const timerId = setTimeout(() => {
            // عند حلول وقت التذكير:
            const notificationOptions = {
                priority: task.reminderPriority || 'normal',
                sound: task.reminderSound || 'bell',
                volume: task.volume !== undefined ? task.volume : 0.7,
                type: task.reminderType || 'both',
                message: task.reminderMessage || task.text
            };
            
            triggerReminder(task, notificationOptions);

            // 4. إعادة الجدولة إذا كان التذكير متكررًا
            if (task.repeatInterval) {
                rescheduleRepeatingReminder(task);
            } else {
                activeReminders.delete(task.id);
            }
            
            // 5. تحديث حالة المهمة وإعادة العرض
            if (task.reminderPriority === 'urgent') {
                task.priority = 'high';
                saveTasks();
            }
            renderTasks();
        }, timeDiff);

        // 6. تخزين معرّف المؤقت
        activeReminders.set(task.id, timerId);
    }

    // دالة تشغيل التنبيه (صوت و/أو إشعار)
    function triggerReminder(task) {
         if (task.completed) return; // لا تنبه للمهام المكتملة

         const reminderMessage = task.reminderMessage || task.text;
         const reminderType = task.reminderType || 'both'; // افتراضي: إشعار وصوت
         const soundData = getNotificationSound(task.reminderSound);
         const volume = task.volume !== undefined ? task.volume : 0.7; // استخدام مستوى الصوت المحدد أو الافتراضي

         console.log(`تذكير للمهمة: ${task.text}`); // للتصحيح

         // تشغيل الصوت
         if (reminderType === 'sound' || reminderType === 'both') {
             try {
                 const audio = new Audio(soundData.url);
                 audio.volume = volume;
                 audio.play().catch(err => console.error("خطأ تشغيل صوت التذكير:", err));
             } catch (error) {
                 console.error("خطأ في إنشاء أو تشغيل الصوت:", error);
             }
         }

         // إظهار الإشعار
         if (reminderType === 'notification' || reminderType === 'both') {
             // يمكنك استخدام API الإشعارات الخاص بالمتصفح إذا أردت تنبيهات النظام
             // navigator.serviceWorker.ready.then(registration => {
             //     registration.showNotification('تذكير بالمهمة', {
             //         body: reminderMessage,
             //         icon: 'path/to/icon.png' // اختياري
             //     });
             // });
             // أو استخدام الإشعار المخصص داخل الصفحة
             showNotification(`تذكير: ${reminderMessage}`, 'info'); // أو يمكن استخدام نوع خاص 'reminder'
         }
    }

     // دالة إعادة جدولة التذكيرات المتكررة (تحتاج للتنفيذ الكامل)
     function rescheduleRepeatingReminder(task) {
        if (!task.reminder || !task.repeatInterval) return;

        let nextReminderDate = new Date(task.reminder);
        const now = new Date();

        // حساب وقت التذكير التالي بناءً على الفاصل الزمني ونقطة الانطلاق الأصلية
        // ضمان أن الوقت التالي يكون دائماً في المستقبل بالنسبة للوقت الحالي
        do {
             switch (task.repeatInterval) {
                 case 'daily':
                     nextReminderDate.setDate(nextReminderDate.getDate() + 1);
                     break;
                 case 'weekly':
                     nextReminderDate.setDate(nextReminderDate.getDate() + 7);
                     break;
                 case 'monthly':
                     nextReminderDate.setMonth(nextReminderDate.getMonth() + 1);
                     break;
                 default:
                     return; // فاصل غير معروف
             }
        } while (nextReminderDate <= now); // استمر في الإضافة حتى يصبح الوقت في المستقبل

        task.reminder = nextReminderDate.toISOString(); // تحديث وقت التذكير في المهمة
        saveTasks(); // حفظ التغيير
        scheduleReminder(task); // جدولة التذكير الجديد
     }

    // دالة لإدارة (فتح مربع حوار) التذكيرات (مكتملة جزئياً وتحتاج لتنفيذ الحفظ والعرض)
    function manageReminders(taskId) {
        const task = findTaskById(taskId);
        if (!task) {
            showNotification('لم يتم العثور على المهمة', 'error');
            return;
        }

        // --- إنشاء وعرض مربع الحوار ---
        // (هذا الجزء يحتاج إلى تنفيذ - يمكنك استخدام مكتبة Modals أو إنشاء عنصر div بسيط)

        // مثال باستخدام عنصر div بسيط:
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay'; // لعمل خلفية معتمة

        const reminderDialog = document.createElement('div');
        reminderDialog.className = 'reminder-dialog'; // قم بتنسيق هذا الكلاس في CSS
        reminderDialog.innerHTML = `
            <h3>إدارة التذكير للمهمة: "${task.text}"</h3>
            <div class="reminder-options">
                <div class="reminder-option">
                    <label for="dialog-reminder-time">وقت التذكير:</label>
                    <input type="datetime-local" id="dialog-reminder-time" value="${task.reminder ? task.reminder.substring(0, 16) : ''}">
                </div>
                <div class="reminder-option">
                    <label for="dialog-reminder-repeat">تكرار التذكير:</label>
                    <select id="dialog-reminder-repeat">
                        <option value="">بدون تكرار</option>
                        <option value="daily" ${task.repeatInterval === 'daily' ? 'selected' : ''}>يومياً</option>
                        <option value="weekly" ${task.repeatInterval === 'weekly' ? 'selected' : ''}>أسبوعياً</option>
                        <option value="monthly" ${task.repeatInterval === 'monthly' ? 'selected' : ''}>شهرياً</option>
                    </select>
                </div>
                 <div class="reminder-option">
                     <label for="dialog-reminder-sound">صوت التنبيه:</label>
                     <div style="display: flex; align-items: center; gap: 10px;">
                         <select id="dialog-reminder-sound" style="flex-grow: 1;">
                             ${Object.entries(NOTIFICATION_SOUNDS).map(([key, sound]) => `
                                 <option value="${key}" ${task.reminderSound === key || (!task.reminderSound && key === 'bell') ? 'selected' : ''}>${sound.name}</option>
                             `).join('')}
                         </select>
                         <button type="button" class="preview-sound-btn btn btn-secondary" style="padding: 0.4rem 0.8rem;">معاينة</button>
                     </div>
                 </div>
                <div class="reminder-option volume-control">
                    <label for="dialog-reminder-volume">مستوى الصوت (<span id="volume-value">${task.volume !== undefined ? Math.round(task.volume * 100) : 70}</span>%):</label>
                    <input type="range" id="dialog-reminder-volume" min="0" max="1" step="0.1" value="${task.volume !== undefined ? task.volume : 0.7}">
                </div>
                <div class="reminder-option">
                    <label for="dialog-reminder-message">رسالة التنبيه:</label>
                    <textarea id="dialog-reminder-message" rows="3">${task.reminderMessage || task.text}</textarea>
                </div>
                <div class="reminder-option">
                    <label for="dialog-reminder-type">نوع التنبيه:</label>
                    <select id="dialog-reminder-type">
                        <option value="notification" ${task.reminderType === 'notification' ? 'selected' : ''}>إشعار فقط</option>
                        <option value="sound" ${task.reminderType === 'sound' ? 'selected' : ''}>صوت فقط</option>
                        <option value="both" ${!task.reminderType || task.reminderType === 'both' ? 'selected' : ''}>إشعار وصوت</option>
                    </select>
                </div>
                 <div class="reminder-option">
                     <label for="dialog-reminder-priority">أولوية التنبيه (للاستخدام المستقبلي):</label>
                     <select id="dialog-reminder-priority">
                         <option value="normal" ${task.reminderPriority === 'normal' ? 'selected' : ''}>عادي</option>
                         <option value="important" ${task.reminderPriority === 'important' ? 'selected' : ''}>مهم</option>
                         <option value="urgent" ${task.reminderPriority === 'urgent' ? 'selected' : ''}>عاجل</option>
                     </select>
                 </div>
            </div>
            <div class="dialog-actions">
                 <button type="button" id="save-reminder-btn" class="btn btn-primary">حفظ التغييرات</button>
                 <button type="button" id="cancel-reminder-btn" class="btn btn-secondary">إلغاء</button>
                 <button type="button" id="clear-reminder-btn" class="btn btn-danger" style="margin-right: auto;">مسح التذكير</button>
             </div>
        `;

        dialogOverlay.appendChild(reminderDialog);
        document.body.appendChild(dialogOverlay);

        // --- إضافة مستمعي الأحداث لعناصر مربع الحوار ---
        const dialogReminderTimeInput = reminderDialog.querySelector('#dialog-reminder-time');
        const dialogReminderRepeatInput = reminderDialog.querySelector('#dialog-reminder-repeat');
        const dialogReminderSoundInput = reminderDialog.querySelector('#dialog-reminder-sound');
        const dialogPreviewSoundBtn = reminderDialog.querySelector('.preview-sound-btn');
        const dialogReminderVolumeInput = reminderDialog.querySelector('#dialog-reminder-volume');
         const volumeValueSpan = reminderDialog.querySelector('#volume-value');
        const dialogReminderMessageInput = reminderDialog.querySelector('#dialog-reminder-message');
        const dialogReminderTypeInput = reminderDialog.querySelector('#dialog-reminder-type');
        const dialogReminderPriorityInput = reminderDialog.querySelector('#dialog-reminder-priority');
        const saveBtn = reminderDialog.querySelector('#save-reminder-btn');
        const cancelBtn = reminderDialog.querySelector('#cancel-reminder-btn');
        const clearBtn = reminderDialog.querySelector('#clear-reminder-btn');

         // تحديث قيمة مؤشر مستوى الصوت
         dialogReminderVolumeInput.addEventListener('input', () => {
             volumeValueSpan.textContent = Math.round(dialogReminderVolumeInput.value * 100);
         });

         // معاينة الصوت
        dialogPreviewSoundBtn.addEventListener('click', () => {
            previewSound(dialogReminderSoundInput.value);
        });

        // زر الإلغاء أو النقر على الخلفية
        cancelBtn.addEventListener('click', () => dialogOverlay.remove());
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.remove();
            }
        });

         // زر مسح التذكير
         clearBtn.addEventListener('click', () => {
             if (confirm('هل أنت متأكد من مسح إعدادات التذكير لهذه المهمة؟')) {
                 task.reminder = null;
                 task.repeatInterval = null;
                 task.reminderSound = null;
                 task.volume = null;
                 task.reminderMessage = null;
                 task.reminderType = null;
                 task.reminderPriority = null;

                 // إلغاء المؤقت النشط إن وجد
                 if (activeReminders.has(task.id)) {
                     clearTimeout(activeReminders.get(task.id));
                     activeReminders.delete(task.id);
                 }

                 saveTasks();
                 renderTasks();
                 dialogOverlay.remove();
                 showNotification('تم مسح التذكير بنجاح.', 'success');
             }
         });


        // --- زر الحفظ (الأهم - يحتاج للتنفيذ) ---
        saveBtn.addEventListener('click', () => {
            const newReminderTime = dialogReminderTimeInput.value;

             // التحقق من صحة الوقت المدخل
             if (newReminderTime && new Date(newReminderTime) <= new Date()) {
                 showNotification('لا يمكن تعيين تذكير لوقت قد مضى.', 'error');
                 return;
             }
             if (newReminderTime && isNaN(new Date(newReminderTime))) {
                showNotification('صيغة التاريخ أو الوقت غير صالحة.', 'error');
                return;
             }

            // تحديث بيانات المهمة
            task.reminder = newReminderTime ? new Date(newReminderTime).toISOString() : null;
            task.repeatInterval = dialogReminderRepeatInput.value || null;
            task.reminderSound = dialogReminderSoundInput.value;
            task.volume = parseFloat(dialogReminderVolumeInput.value);
            task.reminderMessage = dialogReminderMessageInput.value.trim();
            task.reminderType = dialogReminderTypeInput.value;
            task.reminderPriority = dialogReminderPriorityInput.value;

            // حفظ المهام وتحديث الواجهة وإعادة جدولة التذكير
            saveTasks();
            renderTasks(); // ستقوم بإعادة الجدولة داخلها
            dialogOverlay.remove(); // إغلاق مربع الحوار
            showNotification('تم حفظ إعدادات التذكير بنجاح.', 'success');
        });
    }


    // =========================================
    // دوال العرض (Rendering) والواجهة
    // =========================================

    // دالة إنشاء عنصر مهمة في DOM
    function createTaskElement(task) {
        if (!taskTemplate) {
             console.error("قالب المهمة #task-template غير موجود!");
             return document.createElement('div'); // عنصر احتياطي
        }
        const clone = document.importNode(taskTemplate.content, true);
        const taskItem = clone.querySelector('.task-item');
        const taskTextSpan = clone.querySelector('.task-text'); // عنصر النص الرئيسي
        const checkbox = clone.querySelector('.task-checkbox');
        const deleteBtn = clone.querySelector('.delete-btn');
        const editBtn = clone.querySelector('.edit-btn');
        const taskActions = clone.querySelector('.task-actions'); // مكان أزرار الإجراءات

         // زر إدارة التذكير (نضيفه ديناميكيًا)
         const reminderBtn = document.createElement('button');
         reminderBtn.type = 'button'; // مهم للأزرار داخل النماذج أو القوائم
         reminderBtn.className = 'reminder-btn btn-icon'; // استخدام كلاسات CSS للأيقونات والأزرار
         reminderBtn.title = 'إدارة التذكير'; // نص يظهر عند المرور
         reminderBtn.innerHTML = '<i class="fas fa-bell"></i>'; // استخدام Font Awesome كمثال
         reminderBtn.addEventListener('click', (e) => {
             e.stopPropagation(); // منع أي أحداث أخرى على taskItem
             manageReminders(task.id);
         });
         // إضافة زر التذكير إلى منطقة الأزرار
         if (taskActions) {
            taskActions.appendChild(reminderBtn);
         } else {
             console.warn("لم يتم العثور على .task-actions في القالب للمهمة:", task.id);
             taskItem.appendChild(reminderBtn); // إضافة احتياطية
         }

        taskItem.dataset.id = task.id;
        taskTextSpan.textContent = task.text; // استخدام textContent للأمان
        checkbox.checked = task.completed;
        taskItem.style.backgroundColor = task.color || 'var(--item-bg-color, white)'; // استخدام متغير CSS أو لون افتراضي
        taskItem.classList.toggle('task-completed', task.completed); // تطبيق الكلاس مباشرة

         // إضافة مؤشر الأولوية
         if (task.priority && task.priority !== 'none') {
             const priorityIndicator = document.createElement('span');
             priorityIndicator.className = `priority-indicator priority-${task.priority}`;
             priorityIndicator.title = `الأولوية: ${task.priority}`;
             // يمكنك إضافة نص أو أيقونة هنا حسب تصميمك
             priorityIndicator.textContent = `(${task.priority})`; // مثال بسيط
             taskItem.insertBefore(priorityIndicator, taskTextSpan); // وضعه قبل النص
         }

        // عرض الوسوم (إذا وجدت)
        if (task.tags && task.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'task-tags';
            task.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'task-tag';
                tagElement.textContent = tag.trim();
                tagsContainer.appendChild(tagElement);
            });
            // إضافة الوسوم تحت النص الرئيسي
             const textWrapper = document.createElement('div'); // حاوية للنص والوسوم
             textWrapper.style.flexGrow = '1'; // جعلها تتمدد
             textWrapper.appendChild(taskTextSpan);
             textWrapper.appendChild(tagsContainer);
             // استبدال taskTextSpan الأصلي بالحاوية الجديدة
             taskItem.replaceChild(textWrapper, taskTextSpan);

        }

        // عرض وقت التذكير (إذا وجد)
        if (task.reminder) {
            const reminderSpan = document.createElement('span');
            reminderSpan.className = 'reminder-time';
            try {
                const reminderDate = new Date(task.reminder);
                 if (!isNaN(reminderDate)) {
                     reminderSpan.textContent = `⏰ ${reminderDate.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}`;

                     const now = new Date();
                     const timeDiff = reminderDate - now;
                     // علامة التذكير القريب (خلال 24 ساعة) وغير مكتمل
                     if (!task.completed && timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
                         reminderSpan.classList.add('reminder-soon');
                         reminderSpan.title = 'التذكير قريب!';
                     } else if (!task.completed && timeDiff <= 0) {
                         reminderSpan.classList.add('reminder-past'); // تذكير فات وقته
                         reminderSpan.title = 'فات وقت التذكير!';
                     }

                     // عرض نص التكرار
                    if (task.repeatInterval) {
                         const repeatText = getRepeatText(task.repeatInterval);
                         if (repeatText) {
                             const repeatSpan = document.createElement('span');
                             repeatSpan.className = 'reminder-repeat';
                             repeatSpan.textContent = ` (يتكرر ${repeatText})`;
                             repeatSpan.style.fontSize = '0.8em'; // تصغير حجم نص التكرار
                             reminderSpan.appendChild(repeatSpan);
                         }
                     }
                    // إضافة عنصر التذكير إلى taskItem (ربما بجانب الأزرار أو في مكان آخر حسب التصميم)
                    taskItem.appendChild(reminderSpan); // كمثال يوضع في النهاية
                } else {
                     console.warn("تاريخ تذكير غير صالح للمهمة:", task.id, task.reminder);
                 }

            } catch (e) {
                console.error("خطأ في تنسيق تاريخ التذكير:", e);
            }
        }


        // إضافة مستمعي الأحداث للعناصر التفاعلية
        checkbox.addEventListener('change', () => toggleTask(task.id));
        deleteBtn.addEventListener('click', (e) => {
             e.stopPropagation(); // منع النقر على العنصر الأب
            deleteTask(task.id);
        });
        editBtn.addEventListener('click', (e) => {
             e.stopPropagation();
            editTask(task.id);
        });

        // السماح بالنقر على العنصر نفسه لتبديل الحالة (اختياري)
         // taskItem.addEventListener('click', (e) => {
         //    // تجنب التبديل عند النقر على الأزرار أو المدخلات
         //    if (e.target.closest('button, input, select, textarea, .task-actions')) {
         //        return;
         //    }
         //    toggleTask(task.id);
         // });


        return taskItem;
    }

    // دالة عرض جميع المهام (مع الفلترة والفرز والتجميع)
    function renderTasks() {
        if (!taskList) return; // تأكد من وجود عنصر القائمة

        taskList.innerHTML = ''; // مسح القائمة الحالية
        const filteredResult = filterAndGroupTasks(tasks); // استخدام دالة مدمجة للفلترة والتجميع

        if (Array.isArray(filteredResult)) { // إذا كانت النتيجة مصفوفة (لا يوجد تجميع)
            const sortedTasks = sortTasks(filteredResult);
            if (sortedTasks.length === 0) {
                 taskList.innerHTML = '<p class="empty-list-message">لا توجد مهام تطابق البحث أو الفلتر الحالي.</p>';
            } else {
                sortedTasks.forEach(task => {
                    taskList.appendChild(createTaskElement(task));
                });
            }
        } else { // إذا كانت النتيجة كائن (تجميع)
             if (Object.keys(filteredResult).length === 0) {
                 taskList.innerHTML = '<p class="empty-list-message">لا توجد مهام لعرضها في المجموعات.</p>';
             } else {
                // ترتيب أسماء المجموعات (اختياري)
                const sortedGroupNames = Object.keys(filteredResult).sort((a, b) => {
                    // يمكنك إضافة منطق ترتيب مخصص للمجموعات هنا إذا أردت
                    // على سبيل المثال، ترتيب الأولويات: high -> medium -> low
                     if (groupSelect.value === 'priority') {
                         const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'بدون أولوية': 0 };
                         return (priorityOrder[b] || 0) - (priorityOrder[a] || 0);
                     }
                     return a.localeCompare(b, 'ar'); // ترتيب أبجدي افتراضي
                });

                // Object.entries(filteredResult).forEach(([groupName, groupTasks]) => {
                 sortedGroupNames.forEach(groupName => {
                     const groupTasks = filteredResult[groupName];
                     const groupContainer = document.createElement('div');
                     groupContainer.className = 'task-group';

                     const groupHeader = document.createElement('div');
                     groupHeader.className = 'task-group-header';
                     groupHeader.innerHTML = `
                         <h3>${groupName || 'غير مصنف'}</h3>
                         <span class="task-count">${groupTasks.length} مهمة</span>
                     `;
                     // جعل رأس المجموعة قابلاً للطي (اختياري)
                     groupHeader.style.cursor = 'pointer';
                     groupHeader.addEventListener('click', () => {
                        groupContainer.classList.toggle('collapsed');
                        // تغيير أيقونة أو شكل للإشارة للطي
                     });

                     groupContainer.appendChild(groupHeader);

                     const groupTaskList = document.createElement('ul'); // قائمة فرعية للمجموعة
                     groupTaskList.className = 'task-group-list'; // للتنسيق

                     const sortedGroupTasks = sortTasks(groupTasks); // فرز المهام داخل كل مجموعة
                     sortedGroupTasks.forEach(task => {
                         groupTaskList.appendChild(createTaskElement(task));
                     });

                     groupContainer.appendChild(groupTaskList);
                     taskList.appendChild(groupContainer);
                 });
             }
        }

        // إعادة جدولة جميع التذكيرات الضرورية بعد إعادة العرض
         clearAndRescheduleAllReminders();
    }

     // دالة مسح وإعادة جدولة التذكيرات
     function clearAndRescheduleAllReminders() {
         // إلغاء جميع المؤقتات النشطة السابقة
         activeReminders.forEach(timerId => clearTimeout(timerId));
         activeReminders.clear();

         // إعادة جدولة التذكيرات للمهام غير المكتملة والتي لها وقت تذكير في المستقبل
         tasks.forEach(task => {
             if (!task.completed && task.reminder) {
                 scheduleReminder(task);
             }
         });
     }


    // =========================================
    // دوال الفرز والفلترة والتجميع
    // =========================================

     // دالة موحدة للفلترة والتجميع
     function filterAndGroupTasks(tasksToProcess) {
        const filterValue = filterSelect.value;
        const searchText = searchInput.value.toLowerCase().trim();
         // تعديل: أخذ قيمة الأولوية من الفلتر وليس من حقل الإدخال
        const priorityFilter = document.getElementById('filter-priority-select') ? document.getElementById('filter-priority-select').value : 'all'; // عنصر فلتر أولوية منفصل
        const groupValue = groupSelect.value;

        // 1. الفلترة أولاً
        const filteredTasks = tasksToProcess.filter(task => {
            const matchesFilter =
                filterValue === 'all' ||
                (filterValue === 'active' && !task.completed) ||
                (filterValue === 'completed' && task.completed) ||
                (filterValue === 'withReminder' && task.reminder && new Date(task.reminder) > new Date() && !task.completed); // فقط التذكيرات النشطة للمهام غير المكتملة

            const matchesSearch = searchText === '' || (
                task.text.toLowerCase().includes(searchText) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchText))) ||
                (task.priority && task.priority.toLowerCase().includes(searchText)) || // البحث في الأولوية
                (task.reminder && new Date(task.reminder).toLocaleString('ar-SA').includes(searchText)) // البحث في وقت التذكير
            );

            const matchesPriority =
                priorityFilter === 'all' || // تعديل للفلتر
                task.priority === priorityFilter;

            return matchesFilter && matchesSearch && matchesPriority;
        });

        // 2. التجميع ثانياً (إذا طُلب)
        if (groupValue !== 'none') {
            const groupedTasks = {};

            filteredTasks.forEach(task => {
                let groupKeys = []; // قد تنتمي المهمة لأكثر من مجموعة (مثل الوسوم)

                switch (groupValue) {
                    case 'priority':
                        groupKeys.push(task.priority || 'بدون أولوية');
                        break;
                    case 'date':
                        // التجميع حسب تاريخ الإنشاء أو تاريخ الاستحقاق؟ لنفترض الإنشاء
                        groupKeys.push(task.createdAt ? new Date(task.createdAt).toLocaleDateString('ar-SA') : 'بدون تاريخ إنشاء');
                        break;
                    case 'tags':
                        if (task.tags && task.tags.length > 0) {
                            task.tags.forEach(tag => groupKeys.push(tag.trim() || 'وسم فارغ'));
                        } else {
                            groupKeys.push('بدون وسوم');
                        }
                        break;
                    case 'reminder':
                         // التجميع حسب حالة التذكير (نشط، فات وقته، لا يوجد)
                        if (task.reminder && !task.completed) {
                            if (new Date(task.reminder) > new Date()) {
                                 groupKeys.push('تذكير نشط');
                            } else {
                                groupKeys.push('تذكير فائت');
                            }
                        } else {
                            groupKeys.push('بدون تذكير أو مكتمل');
                        }
                        break;
                    case 'status':
                         groupKeys.push(task.completed ? 'مكتملة' : 'نشطة');
                         break;
                    default:
                         groupKeys.push('غير مصنف');
                }

                 // إضافة المهمة لكل مجموعة تنتمي إليها
                groupKeys.forEach(key => {
                    if (!groupedTasks[key]) {
                        groupedTasks[key] = [];
                    }
                    groupedTasks[key].push(task);
                });
            });

            return groupedTasks; // إرجاع الكائن المجمع
        }

        return filteredTasks; // إرجاع المصفوفة المفلترة إذا لم يكن هناك تجميع
    }


    // دالة فرز المهام
    function sortTasks(tasksToSort) {
        const sortValue = sortSelect.value;
        const priorityOrder = { high: 3, medium: 2, low: 1 }; // لفرز الأولوية

        // استخدام slice() لإنشاء نسخة جديدة قبل الفرز لتجنب تعديل المصفوفة الأصلية
        return tasksToSort.slice().sort((a, b) => {
            switch (sortValue) {
                case 'date': // الأحدث أولاً
                    return (b.createdAt ? new Date(b.createdAt) : 0) - (a.createdAt ? new Date(a.createdAt) : 0);
                case 'priority': // الأعلى أولوية أولاً
                     // التعامل مع القيم غير الموجودة
                    const priorityA = priorityOrder[a.priority] || 0;
                    const priorityB = priorityOrder[b.priority] || 0;
                    return priorityB - priorityA;
                case 'reminder': // الأقرب تذكيرًا أولاً
                    const reminderTimeA = a.reminder && !a.completed ? new Date(a.reminder).getTime() : Infinity; // تأجيل التي بدون تذكير أو مكتملة
                    const reminderTimeB = b.reminder && !b.completed ? new Date(b.reminder).getTime() : Infinity;
                     // ضع التذكيرات الفائتة في النهاية أيضاً
                     const now = Date.now();
                     const effectiveTimeA = reminderTimeA < now ? Infinity : reminderTimeA;
                     const effectiveTimeB = reminderTimeB < now ? Infinity : reminderTimeB;

                     if (effectiveTimeA === Infinity && effectiveTimeB === Infinity) return 0; // كلاهما بدون تذكير صالح
                     return effectiveTimeA - effectiveTimeB; // الأقدم (الأصغر) يأتي أولاً
                case 'alphabetical': // أبجديًا
                    return a.text.localeCompare(b.text, 'ar');
                case 'status': // غير المكتملة أولاً
                     return a.completed - b.completed; // false (0) comes before true (1)
                default: // بدون فرز محدد (أو حسب الترتيب الأصلي إذا كان slice يحافظ عليه)
                    return 0;
            }
        });
    }

    // =========================================
    // دوال معالجة المهام (إضافة، تعديل، حذف، تبديل)
    // =========================================

    // دالة تبديل حالة الإكمال للمهمة
    function toggleTask(taskId) {
        const task = findTaskById(taskId);
        if (task) {
            task.completed = !task.completed;
             // عند إكمال مهمة، ربما ترغب في إلغاء تذكيرها النشط؟
             if (task.completed && activeReminders.has(task.id)) {
                 clearTimeout(activeReminders.get(task.id));
                 activeReminders.delete(task.id);
                 // قد ترغب أيضًا في إزالة بيانات التذكير نفسها إذا لم تكن متكررة
                 // if (!task.repeatInterval) task.reminder = null;
             } else if (!task.completed && task.reminder) {
                 // إعادة جدولة التذكير عند إلغاء الإكمال
                 scheduleReminder(task);
             }
            saveTasks();
            renderTasks(); // إعادة العرض لتحديث الواجهة
        } else {
             console.error("لم يتم العثور على المهمة لتبديل حالتها:", taskId);
        }
    }

    // دالة حذف مهمة
    function deleteTask(taskId) {
        // استخدام مربع حوار تأكيد مخصص بدلاً من confirm (اختياري)
        showConfirmationDialog('هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.', () => {
            // إلغاء المؤقت النشط إن وجد
            if (activeReminders.has(taskId)) {
                clearTimeout(activeReminders.get(taskId));
                activeReminders.delete(taskId);
            }

            tasks = tasks.filter(t => String(t.id) !== String(taskId));
            saveTasks();
            renderTasks();
            showNotification('تم حذف المهمة بنجاح.', 'success');
        });
    }
     // دالة عرض مربع حوار تأكيد بسيط (مثال)
     function showConfirmationDialog(message, onConfirm) {
         if (confirm(message)) { // استخدام confirm المؤقت
             onConfirm();
         }
         // يمكنك استبدال confirm بمربع حوار مخصص (Modal)
     }

    // دالة بدء تعديل مهمة (ملء النموذج)
    function editTask(taskId) {
        const task = findTaskById(taskId);
        if (task) {
            editItemId = task.id;
            taskInput.value = task.text;
            priorityInput.value = task.priority || 'low';
            colorInput.value = task.color || '#ffffff';
            tagsInput.value = task.tags ? task.tags.join(', ') : '';

            // إضافة زر إدارة التذكير
            const reminderBtn = document.createElement('button');
            reminderBtn.type = 'button';
            reminderBtn.className = 'btn btn-secondary';
            reminderBtn.innerHTML = '<i class="fas fa-bell"></i> إدارة التذكير';
            reminderBtn.onclick = () => manageReminders(task.id);

            // إضافة الزر بعد حقل الوسوم
            const tagsContainer = tagsInput.parentElement;
            if (!tagsContainer.querySelector('.reminder-manage-btn')) {
                tagsContainer.appendChild(reminderBtn);
                reminderBtn.classList.add('reminder-manage-btn');
            }

            addTaskBtn.textContent = 'تحديث المهمة';
            taskInput.focus();
            taskForm.scrollIntoView({ behavior: 'smooth' });

            // إظهار معلومات التذكير الحالية إن وجدت
            if (task.reminder) {
                const reminderInfo = document.createElement('div');
                reminderInfo.className = 'reminder-info';
                reminderInfo.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <span>تم تعيين تذكير: ${new Date(task.reminder).toLocaleString('ar-SA')}</span>
                    ${task.repeatInterval ? `<span class="repeat-badge">${getRepeatText(task.repeatInterval)}</span>` : ''}
                `;
                tagsContainer.appendChild(reminderInfo);
            }
        } else {
            console.error("لم يتم العثور على المهمة للتعديل:", taskId);
            showNotification('لم يتم العثور على المهمة المحددة.', 'error');
        }
    }

    // دالة مساعدة لعرض نص التكرار
    function getRepeatText(interval) {
        const intervals = {
            daily: 'يومياً',
            weekly: 'أسبوعياً',
            monthly: 'شهرياً'
        };
        return intervals[interval] || '';
    }
    }

    // دالة لإلغاء وضع التعديل
    function cancelEdit() {
        editItemId = null;
        taskForm.reset(); // إعادة تعيين حقول النموذج
        addTaskBtn.textContent = 'إضافة مهمة'; // استعادة نص الزر الأصلي
        // إعادة تعيين أي قيم افتراضية أخرى قد لا يعيدها reset()
        colorInput.value = '#ffffff';
        priorityInput.value = 'low';
        
        // إزالة أي معلومات تذكير إضافية
        const reminderManageBtn = taskForm.querySelector('.reminder-manage-btn');
        if (reminderManageBtn) {
            reminderManageBtn.remove();
        }
        const reminderInfo = taskForm.querySelector('.reminder-info');
        if (reminderInfo) {
            reminderInfo.remove();
        }
    }


    // معالج حدث إرسال النموذج (إضافة أو تحديث مهمة) - (تحتاج للتنفيذ الكامل)
    taskForm.addEventListener('submit', function(event) {
        event.preventDefault(); // منع الإرسال الافتراضي للصفحة

        const taskText = taskInput.value.trim();
        const taskPriority = priorityInput.value;
        const taskColor = colorInput.value;
        // تحويل الوسوم إلى مصفوفة مع إزالة الفراغات الزائدة وتجاهل الفارغة
        const taskTags = tagsInput.value.split(',')
                           .map(tag => tag.trim())
                           .filter(tag => tag !== '');

        // --- التحقق من صحة الإدخال ---
        if (!taskText) {
            showNotification('الرجاء إدخال نص المهمة.', 'error');
            taskInput.focus();
            return;
        }

        if (editItemId) {
            // --- وضع التحديث ---
            const task = findTaskById(editItemId);
            if (task) {
                task.text = taskText;
                task.priority = taskPriority;
                task.color = taskColor;
                task.tags = taskTags;
                // ملاحظة: لا يتم تحديث التذكير من النموذج الرئيسي هنا، استخدم manageReminders
                showNotification('تم تحديث المهمة بنجاح.', 'success');
            } else {
                 showNotification('خطأ: لم يتم العثور على المهمة المراد تحديثها.', 'error');
            }
        } else {
            // --- وضع الإضافة ---
            const newTask = {
                id: Date.now().toString(), // استخدام timestamp بسيط كـ ID (أو UUID)
                text: taskText,
                completed: false,
                createdAt: new Date().toISOString(), // تخزين تاريخ الإنشاء
                priority: taskPriority,
                color: taskColor,
                tags: taskTags,
                reminder: null, // التذكير يُضاف لاحقًا عبر manageReminders
                // إضافة باقي خصائص التذكير الافتراضية إذا أردت
                 repeatInterval: null,
                 reminderSound: 'bell', // صوت افتراضي
                 volume: 0.7,
                 reminderMessage: '',
                 reminderType: 'both',
                 reminderPriority: 'normal'
            };
            tasks.push(newTask);
            showNotification('تمت إضافة المهمة بنجاح.', 'success');
        }

        saveTasks();
        renderTasks();
        cancelEdit(); // إعادة تعيين النموذج وإلغاء وضع التعديل
    });

    // =========================================
    // دوال الاستيراد والتصدير (تحتاج للتنفيذ)
    // =========================================
     function exportTasks() {
         if (tasks.length === 0) {
             showNotification("لا توجد مهام لتصديرها.", "info");
             return;
         }
         try {
            const tasksJson = JSON.stringify(tasks, null, 2); // التنسيق لسهولة القراءة
            const blob = new Blob([tasksJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
             const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            a.download = `tasks_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
             showNotification("تم تصدير المهام بنجاح.", "success");
        } catch (error) {
            console.error("خطأ في تصدير المهام:", error);
            showNotification("حدث خطأ أثناء تصدير المهام.", "error");
        }
     }

     function importTasks(event) {
         const file = event.target.files[0];
         if (!file) {
             return;
         }
         if (file.type !== 'application/json') {
             showNotification("الرجاء تحديد ملف JSON صالح.", "error");
             return;
         }

         const reader = new FileReader();
         reader.onload = function(e) {
             try {
                 const importedData = JSON.parse(e.target.result);
                 // التحقق من صحة البيانات المستوردة (هل هي مصفوفة؟ هل تحتوي على الخصائص المتوقعة؟)
                 if (!Array.isArray(importedData)) {
                    throw new Error("الملف لا يحتوي على مصفوفة مهام صالحة.");
                 }
                  // يمكنك اختيار دمج المهام المستوردة مع الحالية أو استبدالها
                  // مثال: الاستبدال بعد التأكيد
                 showConfirmationDialog(`سيتم استبدال جميع المهام الحالية (${tasks.length}) بـ ${importedData.length} مهمة من الملف. هل أنت متأكد؟`, () => {
                    tasks = importedData;
                    // إعادة تعيين التذكيرات النشطة بعد الاستيراد
                    activeReminders.forEach(timerId => clearTimeout(timerId));
                    activeReminders.clear();
                    saveTasks();
                    renderTasks(); // ستقوم بإعادة جدولة التذكيرات الجديدة
                    showNotification(`تم استيراد ${tasks.length} مهمة بنجاح.`, "success");
                 });

             } catch (error) {
                 console.error("خطأ في استيراد المهام:", error);
                 showNotification(`حدث خطأ أثناء استيراد الملف: ${error.message}`, "error");
             } finally {
                 // إعادة تعيين قيمة حقل الإدخال للسماح باختيار نفس الملف مرة أخرى
                 importInput.value = '';
             }
         };
         reader.onerror = function() {
            showNotification("حدث خطأ أثناء قراءة الملف.", "error");
            importInput.value = '';
         };
         reader.readAsText(file);
     }


    // =========================================
    // ربط الأحداث للعناصر الأخرى (الفلاتر، الفرز، إلخ)
    // =========================================
    searchInput.addEventListener('input', renderTasks);
    filterSelect.addEventListener('change', renderTasks);
    sortSelect.addEventListener('change', renderTasks);
    groupSelect.addEventListener('change', renderTasks);
     // افترض وجود عنصر فلتر أولوية منفصل
     const filterPrioritySelect = document.getElementById('filter-priority-select');
     if (filterPrioritySelect) {
        filterPrioritySelect.addEventListener('change', renderTasks);
     }

     // أزرار الاستيراد والتصدير
     if (exportBtn) {
        exportBtn.addEventListener('click', exportTasks);
     }
     if (importInput) {
        // قد تحتاج لزر لفتح نافذة اختيار الملف بدلاً من input مباشرة
         const importBtn = document.getElementById('import-btn'); // زر وسيط
         if (importBtn) {
            importBtn.addEventListener('click', () => importInput.click());
         }
        importInput.addEventListener('change', importTasks);
     }

     // زر لإلغاء وضع التعديل (إذا كان لديك زر منفصل لذلك)
     const cancelEditBtn = document.getElementById('cancel-edit-btn');
     if (cancelEditBtn) {
         cancelEditBtn.addEventListener('click', cancelEdit);
     }


    // =========================================
    // التنفيذ الأولي عند تحميل الصفحة
    // =========================================
    loadTasks(); // تحميل المهام أولاً
    renderTasks(); // ثم عرضها
});
