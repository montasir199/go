// وظائف مساعدة مشتركة

// دالة لحفظ المهام في التخزين المحلي
// ملاحظة: تقوم هذه الدالة بتنظيف والتحقق من صحة بيانات كل مهمة قبل الحفظ.
function saveTasks() {
    // التحقق الأولي من أن 'tasks' هو مصفوفة
    if (!Array.isArray(tasks)) {
        console.error('بيانات المهام غير صالحة: المتغير "tasks" ليس مصفوفة.');
        // قد ترغب في إظهار إشعار للمستخدم هنا أيضًا إذا كان هذا خطأ غير متوقع
        // showNotification('خطأ داخلي: بيانات المهام غير صالحة.', 'error');
        return false; // فشل الحفظ
    }

    try {
        // إنشاء نسخة نظيفة ومتحقق منها من المهام للحفظ
        const tasksToSave = tasks.map(task => {
            // التحقق من أن 'task' هو كائن صالح
            if (typeof task !== 'object' || task === null) {
                console.warn('تم العثور على عنصر غير صالح في مصفوفة المهام، سيتم تخطيه:', task);
                return null; // تجاهل العناصر غير الصالحة (سيتم فلترتها لاحقًا)
            }

            // تنظيف وتعيين قيم افتراضية لكل خاصية
            return {
                // ID و createdAt: يجب أن يتم إنشاؤها بشكل مثالي عند إضافة المهمة فقط.
                // استخدام fallback هنا يجعل الحفظ أكثر مرونة ولكنه قد يخفي أخطاء في منطق إضافة المهام.
                id: task.id || Date.now().toString() + Math.random().toString(16).slice(2), // إضافة جزء عشوائي لتقليل احتمالية التصادم
                text: String(task.text || ''), // ضمان أن النص هو سلسلة نصية
                completed: Boolean(task.completed), // ضمان أنه قيمة منطقية
                createdAt: task.createdAt || new Date().toISOString(), // تاريخ الإنشاء

                // خصائص التذكير
                reminder: task.reminder || null, // التأكد من أنه null إذا لم يكن موجودًا
                repeatInterval: ['daily', 'weekly', 'monthly'].includes(task.repeatInterval) ? task.repeatInterval : null, // التحقق من القيم المسموح بها
                reminderSound: typeof task.reminderSound === 'string' ? task.reminderSound : 'bell', // افتراضي: bell
                // التحقق من صحة وتحديد نطاق مستوى الصوت (0 إلى 1)
                volume: Math.min(Math.max(parseFloat(task.volume) || 0.7, 0), 1), // افتراضي: 0.7
                reminderMessage: String(task.reminderMessage || ''), // ضمان أنه سلسلة نصية
                reminderType: ['notification', 'sound', 'both'].includes(task.reminderType) ? task.reminderType : 'both', // افتراضي: both
                reminderPriority: ['normal', 'important', 'urgent'].includes(task.reminderPriority) ? task.reminderPriority : 'normal', // افتراضي: normal

                // خصائص أخرى
                priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium', // افتراضي: medium (تأكد من التناسق مع النموذج)
                color: typeof task.color === 'string' ? task.color : '#ffffff', // افتراضي: أبيض
                // التحقق من أن الوسوم هي مصفوفة من السلاسل النصية الفارغة
                tags: Array.isArray(task.tags) ? task.tags.filter(tag => typeof tag === 'string' && tag.trim() !== '') : [],
            };
        }).filter(task => task !== null); // إزالة أي عناصر تم تجاهلها (كانت غير صالحة)

        // حفظ المصفوفة النظيفة في localStorage
        localStorage.setItem('tasks', JSON.stringify(tasksToSave));

        // إظهار إشعار النجاح (ملاحظة: قد يكون مزعجًا إذا تم الحفظ بشكل متكرر جدًا)
        // فكر في جعل الإشعار اختياريًا بناءً على السياق الذي تم فيه استدعاء saveTasks
        // console.log('Tasks saved successfully.'); // بديل للإشعار المتكرر
        // showNotification('تم حفظ المهام بنجاح.', 'success'); // أبقيته الآن حسب الكود الأصلي

        return true; // نجح الحفظ
    } catch (error) {
        console.error('خطأ في حفظ المهام:', error);
        showNotification('حدث خطأ أثناء حفظ المهام.', 'error');
        return false; // فشل الحفظ
    }
}