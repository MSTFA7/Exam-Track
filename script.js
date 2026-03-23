const COLORS = [
    { name: 'Gold', value: '#e8d5a3' },
    { name: 'Mint', value: '#7ec8a0' },
    { name: 'Sky', value: '#80b4e8' },
    { name: 'Rose', value: '#e88080' },
    { name: 'Peach', value: '#e8b480' },
    { name: 'Lavender', value: '#b480e8' },
    { name: 'Coral', value: '#e880b4' },
    { name: 'Teal', value: '#80e8d5' },
];

let exams = JSON.parse(localStorage.getItem('examvault_exams') || '[]');
let editingId = null;
let activeFilter = 'all';
let selectedColor = COLORS[0].value;
let currentView = 'grid';
let calendarDate = new Date();
const CALENDAR_FIELDS = [
    { key: 'countdown', label: 'Time Remaining' },
    { key: 'time', label: 'Exam Time' },
    { key: 'location', label: 'Room' },
    { key: 'duration', label: 'Duration' },
    { key: 'priority', label: 'Priority' },
];
let calendarFieldPrefs = JSON.parse(localStorage.getItem('examvault_cal_fields') || '{"countdown":true,"time":false,"location":false,"duration":false,"priority":false}');
let calendarFullscreen = false;

function initColorGrid() {
    const grid = document.getElementById('color-grid');
    grid.innerHTML = COLORS.map(c => `
    <div class="color-opt ${c.value === selectedColor ? 'selected' : ''}"
      style="background:${c.value}"
      title="${c.name}"
      onclick="selectColor('${c.value}', this)">
    </div>
  `).join('');
}

function selectColor(val, el) {
    selectedColor = val;
    document.querySelectorAll('.color-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
}

function saveToStorage() {
    localStorage.setItem('examvault_exams', JSON.stringify(exams));
}
function switchView(view, btn) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const grid = document.getElementById('exams-grid');
    const layout = document.querySelector('.calendar-layout');

    const sidebar = document.getElementById('calendar-sidebar');

    if (view === 'grid') {
        grid.classList.remove('hidden');
        layout.classList.remove('active');
        sidebar.classList.remove('visible');
        renderExams();
    } else {
        grid.classList.add('hidden');
        layout.classList.add('active');
        sidebar.classList.add('visible');
        renderSidebar();
        renderCalendar();
    }
}

function toggleCalendarFullscreen() {
    calendarFullscreen = !calendarFullscreen;
    const btn = document.getElementById('fs-btn');
    const sidebar = document.getElementById('calendar-sidebar');
    const controls = document.querySelector('.controls');
    const statsBar = document.querySelector('.stats-bar');
    const header = document.querySelector('header');
    const app = document.querySelector('.app');
    const layout = document.querySelector('.calendar-layout');
    const calGrid = document.querySelector('.calendar-grid');

    if (calendarFullscreen) {
        header.style.display = 'none';
        statsBar.style.display = 'none';
        controls.style.display = 'none';
        sidebar.style.display = 'none';
        app.style.padding = '16px 100px';
        app.style.maxWidth = '100%';
        layout.style.margin = '0';
        btn.textContent = '✕';
        btn.title = 'Exit Fullscreen';
        calGrid.classList.add('fullscreen');
    } else {
        header.style.display = '';
        statsBar.style.display = '';
        controls.style.display = '';
        sidebar.style.display = '';
        app.style.padding = '';
        app.style.maxWidth = '';
        layout.style.margin = '';
        btn.textContent = '⛶';
        btn.title = 'Fullscreen';
        calGrid.classList.remove('fullscreen');
    }
}

function renderCalendar() {
    const wrapper = document.getElementById('calendar-wrapper');
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    const examMap = {};
    exams.forEach(exam => {
        if (!examMap[exam.date]) examMap[exam.date] = [];
        examMap[exam.date].push(exam);
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const headers = dayNames.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    let cells = '';

    function makeCell(d, y, m, faded = false) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
        const dayExams = examMap[dateStr] || [];

        const pills = dayExams.map(exam => {
            const cd = getCountdown(exam.date, exam.time);
            const color = exam.color || COLORS[0].value;
            const countdownText = isCompleted(exam) ? 'Done' : cd ? `${cd.days}d ${cd.hours}h` : 'Done';
            return `
  <div class="cal-exam-pill" style="background:${color}" onclick="editExam('${exam.id}')" title="${exam.subject} — ${exam.name}">
  <div class="cal-exam-subject">${exam.subject}</div>
  <div class="cal-exam-name">${exam.name}</div>
    ${calendarFieldPrefs.countdown ? `<div class="cal-exam-countdown">${countdownText}</div>` : ''}
    ${calendarFieldPrefs.time ? `<div class="cal-exam-countdown">${formatTime(exam.time)}</div>` : ''}
    ${calendarFieldPrefs.location && exam.location ? `<div class="cal-exam-countdown">📍 ${exam.location}</div>` : ''}
    ${calendarFieldPrefs.duration && exam.duration ? `<div class="cal-exam-countdown">⏱ ${formatDuration(exam.duration)}</div>` : ''}
    ${calendarFieldPrefs.priority ? `<div class="cal-exam-countdown" style="color:rgba(0,0,0,0.6)">${exam.priority}</div>` : ''}
  </div>`;
        }).join('');

        return `
      <div class="cal-day ${isToday ? 'today' : ''} ${faded ? 'faded' : ''}">
        <div class="cal-day-num">${d}</div>
        ${pills}
      </div>`;
    }

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const prevMonth = month - 1 < 0 ? 11 : month - 1;
        const prevYear = month - 1 < 0 ? year - 1 : year;
        cells += makeCell(daysInPrevMonth - i, prevYear, prevMonth, true);
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        cells += makeCell(d, year, month, false);
    }

    // Next month's leading days
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const numRows = Math.ceil((totalCells + remaining) / 7);
    document.documentElement.style.setProperty('--cal-rows', numRows);

    for (let d = 1; d <= remaining; d++) {
        const nextMonth = month + 1 > 11 ? 0 : month + 1;
        const nextYear = month + 1 > 11 ? year + 1 : year;
        cells += makeCell(d, nextYear, nextMonth, true);
    }
    wrapper.innerHTML = `
  <div class="calendar-nav">
  <div class="calendar-nav-center">
    <button class="cal-nav-btn" onclick="changeMonth(-1)">‹</button>
    <div class="calendar-nav-title">${monthName}</div>
    <button class="cal-nav-btn" onclick="changeMonth(1)">›</button>
  </div>
  <button class="cal-nav-btn" onclick="toggleCalendarFullscreen()" id="fs-btn" title="Fullscreen">⛶</button>
</div>
  <div class="calendar-grid">
    ${headers}
    ${cells}
  </div>`;
}

function changeMonth(dir) {
    calendarDate.setMonth(calendarDate.getMonth() + dir);
    renderCalendar();
}

function renderSidebar() {
    const container = document.getElementById('sidebar-fields');
    container.innerHTML = CALENDAR_FIELDS.map(f => `
    <div class="sidebar-field-item ${calendarFieldPrefs[f.key] ? 'on' : ''}" onclick="toggleCalField('${f.key}')">
      <span class="sidebar-field-label">${f.label}</span>
      <div class="sidebar-toggle ${calendarFieldPrefs[f.key] ? 'on' : ''}"></div>
    </div>
  `).join('');
}

function toggleCalField(key) {
    calendarFieldPrefs[key] = !calendarFieldPrefs[key];
    localStorage.setItem('examvault_cal_fields', JSON.stringify(calendarFieldPrefs));
    renderSidebar();
    renderCalendar();
}
function getCountdown(examDateStr, examTimeStr) {
    const now = new Date();
    const examDT = new Date(`${examDateStr}T${examTimeStr || '00:00'}`);
    const diff = examDT - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, mins, total: diff };
}

function isCompleted(exam) {
    const examDT = new Date(`${exam.date}T${exam.time || '23:59'}`);
    const endDT = new Date(examDT.getTime() + (exam.duration || 0) * 60 * 1000);
    return new Date() > endDT;
}

function formatDate(dateStr, timeStr) {
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatDuration(mins) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function getUrgency(countdown) {
    if (!countdown) return 'completed';
    if (countdown.days < 1) return 'urgent';
    if (countdown.days < 7) return 'soon';
    return 'normal';
}

function getPriorityColor(priority) {
    if (priority === 'critical') return 'var(--red)';
    if (priority === 'high') return 'var(--orange)';
    return 'var(--text3)';
}

function renderExams() {
    const grid = document.getElementById('exams-grid');
    const sort = document.getElementById('sort-select').value;

    let filtered = [...exams];

    if (activeFilter === 'upcoming') filtered = filtered.filter(e => !isCompleted(e));
    if (activeFilter === 'completed') filtered = filtered.filter(e => isCompleted(e));
    if (activeFilter === 'urgent') filtered = filtered.filter(e => {
        const cd = getCountdown(e.date, e.time);
        return cd && cd.days < 7;
    });

    if (sort === 'date-asc') filtered.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    if (sort === 'date-desc') filtered.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
    if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'priority') {
        const order = { critical: 0, high: 1, normal: 2 };
        filtered.sort((a, b) => order[a.priority] - order[b.priority]);
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('stat-total').textContent = exams.length;
    document.getElementById('stat-upcoming').textContent = exams.filter(e => !isCompleted(e)).length;
    document.getElementById('stat-week').textContent = exams.filter(e => {
        const d = new Date(`${e.date}T${e.time}`);
        return d >= now && d <= weekFromNow;
    }).length;
    document.getElementById('stat-done').textContent = exams.filter(e => isCompleted(e)).length;

    if (filtered.length === 0) {
        grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
</div>
        <h3>${activeFilter === 'all' ? 'No exams yet' : 'Nothing here'}</h3>
        <p>${activeFilter === 'all' ? 'Add your first exam to start tracking.' : 'No exams match this filter.'}</p>
      </div>`;
        return;
    }

    grid.innerHTML = filtered.map(exam => renderCard(exam)).join('');
}
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error();
            exams = imported;
            saveToStorage();
            renderExams();
            showToast(`✓ Imported ${imported.length} exams.`, 'var(--green)');
        } catch {
            showToast('⚠ Invalid file.', 'var(--red)');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function renderCard(exam) {
    const completed = isCompleted(exam);
    const cd = getCountdown(exam.date, exam.time);
    const urgency = getUrgency(cd);
    const color = exam.color || COLORS[0].value;

    const created = new Date(exam.createdAt || exam.date);
    const examDT = new Date(`${exam.date}T${exam.time || '00:00'}`);
    const totalDays = Math.max(1, (examDT - created) / (1000 * 60 * 60 * 24));
    const elapsed = (new Date() - created) / (1000 * 60 * 60 * 24);
    const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

    const progressColor = completed ? 'var(--green)' :
        urgency === 'urgent' ? 'var(--red)' :
            urgency === 'soon' ? 'var(--orange)' : color;

    const countdownHTML = completed
        ? `<div class="completed-badge">✓ Completed</div>`
        : cd ? `
      <div class="countdown-display">
        <div class="countdown-unit">
          <div class="countdown-num">${String(cd.days).padStart(2, '0')}</div>
          <div class="countdown-unit-label">Days</div>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <div class="countdown-num">${String(cd.hours).padStart(2, '0')}</div>
          <div class="countdown-unit-label">Hrs</div>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <div class="countdown-num">${String(cd.mins).padStart(2, '0')}</div>
          <div class="countdown-unit-label">Min</div>
        </div>
      </div>` : `<div class="completed-badge">✓ Completed</div>`;

    return `
  <div class="exam-card ${completed ? 'completed' : ''} ${!completed && urgency === 'urgent' ? 'urgent' : ''} ${!completed && urgency === 'soon' ? 'soon' : ''}" data-id="${exam.id}">
    <div class="card-top">
      <span class="subject-badge" style="background:${color}22;color:${color}">${exam.name || 'Exam'}</span>
      <div class="card-actions">
        <button class="card-btn" onclick="editExam('${exam.id}')" title="Edit">✎</button>
        <button class="card-btn delete" onclick="deleteExam('${exam.id}')" title="Delete">✕</button>
      </div>
    </div>

    <div class="exam-name">${exam.subject}</div>
    ${exam.code ? `<div class="exam-course">${exam.code}</div>` : ''}

    <div class="countdown-block">
      <div class="countdown-label">${completed ? 'Status' : 'Time Remaining'}</div>
      ${countdownHTML}
    </div>

    <div class="card-meta">
      <div class="meta-item">
        <span class="meta-key">Date</span>
        <span class="meta-val">${formatDate(exam.date, exam.time)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-key">Time</span>
        <span class="meta-val">${formatTime(exam.time)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-key">Duration</span>
        <span class="meta-val">${formatDuration(exam.duration)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-key">Priority</span>
        <span class="meta-val" style="color:${getPriorityColor(exam.priority)}">
          <span class="priority-dot" style="background:${getPriorityColor(exam.priority)}"></span>${exam.priority || 'Normal'}
        </span>
      </div>
      ${exam.location ? `
      <div class="meta-item full" style="grid-column:1/-1">
        <span class="meta-key">Location</span>
        <span class="meta-val">${exam.location}</span>
      </div>` : ''}
      ${exam.notes ? `
      <div class="meta-item" style="grid-column:1/-1">
        <span class="meta-key">Notes</span>
        <span class="meta-val" style="font-family:'DM Sans',sans-serif;color:var(--text2);font-size:0.8rem;line-height:1.5">${exam.notes}</span>
      </div>` : ''}
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width:${progress}%;background:${progressColor}"></div>
    </div>
  </div>`;
}

function openModal(id = null) {
    editingId = id;
    initColorGrid();
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = id ? 'Edit Exam' : 'Add Exam';

    if (id) {
        const exam = exams.find(e => e.id === id);
        document.getElementById('f-name').value = exam.name || '';
        document.getElementById('f-subject').value = exam.subject || '';
        document.getElementById('f-code').value = exam.code || '';
        document.getElementById('f-date').value = exam.date || '';
        document.getElementById('f-time').value = exam.time || '';
        document.getElementById('f-duration').value = exam.duration || '';
        document.getElementById('f-location').value = exam.location || '';
        document.getElementById('f-priority').value = exam.priority || 'normal';
        document.getElementById('f-notes').value = exam.notes || '';
        selectedColor = exam.color || COLORS[0].value;
        initColorGrid();
    } else {
        ['f-name', 'f-subject', 'f-code', 'f-date', 'f-time', 'f-duration', 'f-location', 'f-notes'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('f-priority').value = 'normal';
        selectedColor = COLORS[0].value;
        initColorGrid();
        document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    }

    overlay.classList.add('open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    editingId = null;
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function saveExam() {
    const name = document.getElementById('f-name').value.trim();
    const subject = document.getElementById('f-subject').value.trim();
    const date = document.getElementById('f-date').value;
    const time = document.getElementById('f-time').value;

    if (!name || !subject || !date || !time) {
        showToast('⚠ Please fill in all required fields.', 'var(--orange)');
        return;
    }

    const data = {
        name,
        subject,
        code: document.getElementById('f-code').value.trim(),
        date,
        time,
        duration: parseInt(document.getElementById('f-duration').value) || 0,
        location: document.getElementById('f-location').value.trim(),
        priority: document.getElementById('f-priority').value,
        notes: document.getElementById('f-notes').value.trim(),
        color: selectedColor,
    };

    if (editingId) {
        const idx = exams.findIndex(e => e.id === editingId);
        exams[idx] = { ...exams[idx], ...data };
        showToast('✓ Exam updated.', 'var(--green)');
    } else {
        data.id = Date.now().toString();
        data.createdAt = new Date().toISOString();
        exams.push(data);
        showToast('✓ Exam added.', 'var(--green)');
    }

    saveToStorage();
    closeModal();
    renderExams();
}

function editExam(id) {
    openModal(id);
}

function deleteExam(id) {
    if (!confirm('Delete this exam?')) return;
    exams = exams.filter(e => e.id !== id);
    saveToStorage();
    renderExams();
    showToast('Exam deleted.', 'var(--text2)');
}

document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderExams();
    });
});

function exportData() {
    const blob = new Blob([JSON.stringify(exams, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'examvault_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('↓ Exported successfully.', 'var(--blue)');
}

function showToast(msg, color = 'var(--text)') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color;
    toast.style.borderLeftWidth = '3px';
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

setInterval(() => {
    document.querySelectorAll('.exam-card:not(.completed)').forEach(card => {
        const id = card.dataset.id;
        const exam = exams.find(e => e.id === id);
        if (!exam) return;
        const cd = getCountdown(exam.date, exam.time);
        const block = card.querySelector('.countdown-display');
        if (!block) return;
        if (!cd) {
            card.classList.add('completed');
            renderExams();
            return;
        }
        const nums = block.querySelectorAll('.countdown-num');
        if (nums[0]) nums[0].textContent = String(cd.days).padStart(2, '0');
        if (nums[1]) nums[1].textContent = String(cd.hours).padStart(2, '0');
        if (nums[2]) nums[2].textContent = String(cd.mins).padStart(2, '0');
    });
}, 30000);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(); }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (calendarFullscreen) toggleCalendarFullscreen();
        else closeModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(); }
});
renderExams();