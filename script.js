let RAW_DATA = [];
let currentData = [];
let MOCK_COMPLAINTS = [
    { id: 'CMP-7001', binId: 'BIN-104', type: 'Overflowing', reporter: 'Kamal P.', status: 'Pending', date: 'Just now', desc: 'Bin is completely full and spilling over.' },
    { id: 'CMP-7002', binId: 'BIN-088', type: 'Strong Odor', reporter: 'Nimali S.', status: 'Resolved', date: '2 hours ago', desc: 'Smells terrible near the park entrance.' }
];

const tableBody = document.getElementById('schedule-tbody');
const emptyState = document.getElementById('empty-state');
const tableObj = document.querySelector('.data-table');

const filterDay = document.getElementById('filter-day');
const filterType = document.getElementById('filter-type');
const filterFill = document.getElementById('filter-fill');

const widgetPrediction = document.getElementById('widget-prediction');
const widgetLogin = document.getElementById('widget-login');
const widgetLogout = document.getElementById('widget-logout');

const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const btnDoLogin = document.getElementById('btn-do-login');
const btnDoRegister = document.getElementById('btn-do-register');

const viewSections = document.querySelectorAll('.view-section');
const predictionModal = document.getElementById('prediction-modal');
const closePredictionModal = document.getElementById('close-prediction-modal');
const btnProfile = document.getElementById('btn-profile');
const btnNotifications = document.getElementById('btn-notifications');

const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const profileNameInput = document.getElementById('profile-name-input');
const userNameDisplays = document.querySelectorAll('.user-name');
const notificationsDropdown = document.getElementById('notifications-dropdown');
const notificationsList = document.getElementById('notifications-list');
const markAllReadBtn = document.getElementById('mark-all-read');

const roleSwitcher = document.getElementById('role-switcher');
const currentRoleDisplay = document.getElementById('current-role-display');
const userRoleLabel = document.querySelector('.user-role-label');

const refreshBtn = document.getElementById('refresh-data-btn');
const toastContainer = document.getElementById('toast-container');
const notifCount = document.getElementById('notification-count');
const profileEmailInput = document.getElementById('profile-email-input');
const profileThemeSelect = document.getElementById('profile-theme-select');
const settingsTheme = document.getElementById('settings-theme');
const settingsEmail = document.getElementById('settings-email');
const settingsName = document.getElementById('settings-name');
const saveAllSettingsBtn = document.getElementById('save-all-settings-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');


async function initApp() {
    console.log('EcoCity App Initializing...');

    try {
        attachAuthListeners();
    } catch (e) { console.error('Auth listener failure', e); }

    let session = null;
    try {
        const sessionStr = localStorage.getItem('ecocity_session');
        if (sessionStr) session = JSON.parse(sessionStr);
    } catch (e) { console.error('Session parse error', e); }

    if (session && session.name) {
        console.log('Session found for:', session.name);
        updateUserProfile(session.name, session.role || 'Admin', session.email || 'admin@ecocity.gov');
        if (session.theme) applyTheme(session.theme);

        setTimeout(() => {
            showDashboard(false);
        }, 50);
    }

    try {
        attachEventListeners();
        // loadSavedSettings(); // Removed undefined function call
    } catch (e) { console.error('Misc listener failure', e); }

    try {
        await fetchRoutesData();
        renderTable(currentData);
        if (typeof renderBinsList === 'function') renderBinsList(currentData);
        if (typeof renderComplaints === 'function') renderComplaints();
        updateNotifications();
    } catch (e) { console.error('Data loading failure', e); }

    setInterval(gradualFillAccumulation, 5000);
    setInterval(simulateRealTimeUpdate, 60000);
}

function showDashboard(saveToStorage = true) {
    authView.style.display = 'none';
    dashboardView.style.display = 'flex';
    renderTable(currentData);
    if (typeof renderBinsList === 'function') renderBinsList(currentData);
    updateNotifications();
    if (widgetLogin) widgetLogin.style.display = 'none';
    if (widgetLogout) widgetLogout.style.display = 'flex';

    const nameNode = document.querySelector('.user-name');
    const roleNode = document.querySelector('.user-role-label');
    const emailNode = document.getElementById('profile-email-input');

    const name = nameNode ? nameNode.textContent : 'Admin';
    const role = roleNode ? roleNode.textContent : 'Manager';
    const email = emailNode ? emailNode.value : 'admin@ecocity.gov';

    if (saveToStorage) {
        const theme = document.body.classList.contains('dark-mode') ? 'Dark' : 'Light';
        if (name && name !== 'Eco User' && email) {
            localStorage.setItem('ecocity_session', JSON.stringify({ name, role, email, theme }));
        }
    }

    // Apply Role Restrictions
    const isResident = role.toLowerCase() === 'resident';
        document.querySelectorAll('.nav-item').forEach(li => {
            const text = li.textContent.trim().toLowerCase();
            if (isResident && ['dashboard', 'bins', 'schedule', 'reports', 'settings'].includes(text)) {
                li.style.display = 'none';
            } else {
                li.style.display = '';
            }
        });
        
        const widgetsGroup = document.querySelector('.dashboard-widgets');
        if (widgetsGroup) {
            widgetsGroup.style.display = isResident ? 'none' : 'grid';
        }

        const btnNotifications = document.getElementById('btn-notifications');
        if (btnNotifications) {
            btnNotifications.style.display = isResident ? 'none' : '';
        }

        const savedTab = localStorage.getItem('ecocity_active_tab');

        if (isResident) {
            const targetTab = (savedTab && ['complaints'].includes(savedTab)) ? savedTab : 'complaints';
            const tabNode = Array.from(document.querySelectorAll('.nav-item')).find(li => li.textContent.trim().toLowerCase() === targetTab);
            if (tabNode) tabNode.click();
        } else {
            const targetTab = savedTab || 'dashboard';
            const tabNode = Array.from(document.querySelectorAll('.nav-item')).find(li => li.textContent.trim().toLowerCase() === targetTab);
            if (tabNode && tabNode.id !== 'sidebar-logout') tabNode.click();
        }
}

async function fetchRoutesData() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/routes');
        if (response.ok) {
            const result = await response.json();
            RAW_DATA = result.data;
            currentData = [...RAW_DATA];
            return;
        }
    } catch (err) {
        console.warn('API fetch failed, trying local routes.json fallback...', err);
    }

    try {
        const response = await fetch('routes.json');
        RAW_DATA = await response.json();
        currentData = [...RAW_DATA];
    } catch (e) {
        console.error('Failed to load data', e);
        showToast('Data Error', 'Failed to load route data.', 'danger');
    }
}

function updateNotifications() {
    if (!RAW_DATA) return;
    const missed = currentData.filter(d => d.status === 'Missed');
    notifCount.textContent = missed.length;
    if (missed.length === 0) {
        notifCount.style.display = 'none';
        if (notificationsList) notificationsList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:14px;">No new alerts</div>';
    } else {
        notifCount.style.display = 'flex';
        let html = '';
        missed.slice(0, 5).forEach(m => {
            html += `
                <div class="notif-item" style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size: 14px; cursor: pointer;">
                    <div style="font-weight:600;color:var(--color-danger)"><i class="fa-solid fa-circle-exclamation"></i> Missed Pickup: ${m.id}</div>
                    <div style="color:var(--text-muted);font-size:12px;margin-top:4px;">${m.type} - Expected ${m.day}</div>
                </div>
            `;
        });
        if (notificationsList) notificationsList.innerHTML = html;
    }
}

function attachAuthListeners() {
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.remove('hidden');
        formLogin.classList.add('active');
        formRegister.classList.add('hidden');
        formRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.remove('hidden');
        formRegister.classList.add('active');
        formLogin.classList.add('hidden');
        formLogin.classList.remove('active');
    });

    btnDoLogin.addEventListener('click', async () => {
        const emailInput = document.getElementById('login-email')?.value?.trim();
        const passInput = document.getElementById('login-pass')?.value?.trim();

        if (!emailInput || !passInput) return showToast('Input Required', 'Please enter both fields.', 'warning');

        try {
            const originalText = btnDoLogin.textContent;
            btnDoLogin.textContent = 'Authenticating...';
            btnDoLogin.disabled = true;

            const loginRoleNode = document.getElementById('login-role');
            const loginRole = loginRoleNode ? loginRoleNode.value : 'Resident';

            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, password: passInput, role: loginRole })
            });

            btnDoLogin.textContent = originalText;
            btnDoLogin.disabled = false;

            if (response.ok) {
                const data = await response.json();
                const displayName = data.name || (emailInput.includes('@') ? emailInput.split('@')[0] : emailInput);
                const role = data.role || 'Admin';
                updateUserProfile(displayName, role, emailInput);
                showDashboard();
                showToast('Authentication Successful', `Welcome back, ${displayName}!`, 'success');
            } else {
                showToast('Authentication Failed', 'Invalid email or password.', 'danger', 'fa-triangle-exclamation');
            }
        } catch (err) {
            btnDoLogin.disabled = false;
            btnDoLogin.textContent = 'Sign In';

            if (emailInput === 'admin@ecocity.gov' && passInput === 'password123') {
                updateUserProfile('admin', 'Admin (Offline)', 'admin@ecocity.gov');
                showDashboard();
                showToast('Authentication Successful', 'Welcome (Offline Mode).', 'success');
            } else {
                showToast('API Error', 'Backend offline. Use admin@ecocity.gov / password123.', 'warning', 'fa-triangle-exclamation');
            }
        }
    });

    btnDoRegister.addEventListener('click', async () => {
        const nameNode = formRegister.querySelector('input[placeholder="John Doe"]');
        const emailNode = document.getElementById('register-email');
        const passNode = document.getElementById('register-pass');

        const nameInput = nameNode?.value?.trim();
        const emailInput = emailNode?.value?.trim();
        const passInput = passNode?.value?.trim();

        if (!nameInput || !emailInput || !passInput) {
            return showToast('Input Required', 'All fields are mandatory.', 'warning');
        }

        try {
            const btnOriginalText = btnDoRegister.textContent;
            btnDoRegister.textContent = 'Saving to Database...';
            btnDoRegister.disabled = true;

            const response = await fetch('http://127.0.0.1:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput, email: emailInput, password: passInput })
            });

            btnDoRegister.textContent = btnOriginalText;
            btnDoRegister.disabled = false;

            if (response.ok) {
                updateUserProfile(nameInput || emailInput.split('@')[0], 'Field Operator', emailInput);
                showDashboard();
                showToast('Registration Complete', `Welcome, ${nameInput}! Account saved securely.`, 'success');
            } else {
                showToast('Registration Failed', 'Server rejected registration.', 'danger', 'fa-triangle-exclamation');
            }
        } catch (err) {
            btnDoRegister.disabled = false;
            btnDoRegister.textContent = 'Create Account';
            showToast('API Error', 'Could not reach backend.', 'danger');
        }
    });
}

function updateUserProfile(name, role, email) {
    if (!name) return;
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    document.querySelectorAll('.user-name').forEach(el => el.textContent = displayName);

    const roleLabel = document.querySelector('.user-role-label');
    if (roleLabel) roleLabel.textContent = role;

    const avatar = document.querySelector('.avatar');
    if (avatar) {
        avatar.setAttribute('title', displayName);
        avatar.setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff`);
    }

    if (profileNameInput) profileNameInput.value = displayName;
    if (profileEmailInput && email) profileEmailInput.value = email;
    if (settingsName) settingsName.value = displayName;
    if (settingsEmail && email) settingsEmail.value = email;
}

function applyTheme(theme) {
    if (theme === 'Dark Mode') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    if (profileThemeSelect) profileThemeSelect.value = theme;
    if (settingsTheme) settingsTheme.value = theme;
}

function gradualFillAccumulation() {
    if (!currentData || currentData.length === 0) return;

    let anyUpdates = false;
    currentData.forEach(bin => {
        if (bin.status !== 'Completed' && bin.status !== 'In Route' && bin.fillLevel < 100) {
            const inc = Math.random() * 0.4 + 0.1;
            bin.fillLevel = Math.min(100, bin.fillLevel + inc);
            anyUpdates = true;

            if (bin.fillLevel >= 90 && bin.fillLevel - inc < 90) {
                showToast('Urgent: Overflow Risk', `Bin ${bin.id} is at ${Math.round(bin.fillLevel)}% capacity!`, 'danger', 'fa-fire-flame-curved');
                updateNotifications();
            }
        }
    });

    if (anyUpdates) {
        renderTable(currentData);
        if (typeof renderBinsList === 'function') renderBinsList(currentData);
    }
}

function attachEventListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.id === 'sidebar-logout') return;
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const tabName = item.textContent.trim().toLowerCase();
            localStorage.setItem('ecocity_active_tab', tabName);

            viewSections.forEach(section => section.classList.add('hidden'));

            const targetView = document.getElementById('view-' + tabName);
            if (targetView) {
                targetView.classList.remove('hidden');
            } else {
                document.getElementById('view-dashboard').classList.remove('hidden');
            }

            if (tabName === 'schedule') renderSchedule();
            if (tabName === 'reports') renderReports();
        });
    });

    [filterDay, filterType, filterFill].forEach(select => {
        if (select) select.addEventListener('change', applyFilters);
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const iconElement = refreshBtn.querySelector('i');
            if (iconElement) iconElement.classList.add('fa-spin');

            setTimeout(() => {
                currentData = [...RAW_DATA];
                if (filterDay) filterDay.value = 'All';
                if (filterType) filterType.value = 'All';
                if (filterFill) filterFill.value = 'All';

                renderTable(currentData);
                if (typeof renderBinsList === 'function') renderBinsList(currentData);

                if (iconElement) iconElement.classList.remove('fa-spin');
                showToast('Data Refreshed', 'Latest schedules and statuses loaded.', 'success', 'fa-rotate-right');
            }, 800);
        });
    }

    if (widgetLogin) {
        widgetLogin.addEventListener('click', () => {
            showToast('Logged In', 'Welcome back to the dashboard!', 'success');
            widgetLogin.style.display = 'none';
            widgetLogout.style.display = 'flex';
        });
    }

    if (widgetLogout) {
        widgetLogout.addEventListener('click', () => {
            showToast('Logged Out', 'You have been successfully signed out.', 'warning');

            setTimeout(() => {
                dashboardView.style.display = 'none';
                authView.style.display = 'flex';
            }, 500);
        });
    }

    if (widgetPrediction) {
        widgetPrediction.addEventListener('click', async () => {
            predictionModal.classList.remove('hidden');
            const modalBody = predictionModal.querySelector('.modal-body');
            modalBody.innerHTML = '<p style="text-align:center;"><br>Querying Random Forest AI Model...<br><br><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br></p>';

            if (currentData.length === 0) {
                modalBody.innerHTML = '<p>No bins available for prediction.</p>';
                return;
            }

            const samples = currentData.sort(() => 0.5 - Math.random()).slice(0, 3);
            let resultsHtml = '<p style="margin-bottom: 16px;">AI predictions for fill levels based on dynamic trends:</p>';

            for (const bin of samples) {
                try {
                    const res = await fetch('http://127.0.0.1:5000/api/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ geo_point_X: bin.geo_point_X, geo_point_Y: bin.geo_point_Y })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const predicted = Math.round(data.predicted_fill_level || 0);
                        let colorClass = predicted > 75 ? 'var(--color-danger)' : predicted > 50 ? 'var(--color-warning)' : 'var(--color-success)';
                        resultsHtml += `
                        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                            <span style="font-weight: 600; min-width: 100px;">${bin.id}</span>
                            <div class="fill-bar" style="flex-grow:1; height:8px; background:var(--color-neutral-bg); border-radius:4px; overflow:hidden;">
                                <div class="fill-progress" style="width: ${predicted}%; background-color: ${colorClass}; height:100%;"></div>
                            </div>
                            <span style="min-width: 50px; font-weight: 600; color: ${colorClass};">${predicted}%</span>
                        </div>`;
                    }
                } catch (e) { }
            }
            modalBody.innerHTML = resultsHtml;
        });
    }

    if (closePredictionModal) {
        closePredictionModal.addEventListener('click', () => {
            predictionModal.classList.add('hidden');
        });
    }

    if (btnProfile) {
        btnProfile.addEventListener('click', () => {
            profileModal.classList.remove('hidden');
        });
    }

    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => {
            profileModal.classList.add('hidden');
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const newName = profileNameInput.value.trim();
            if (newName) {
                userNameDisplays.forEach(el => el.textContent = newName);
                showToast('Profile Updated', 'Your settings were saved successfully.', 'success');
                profileModal.classList.add('hidden');
            }
        });
    }

    if (btnNotifications) {
        btnNotifications.addEventListener('click', (e) => {
            if (e.target.closest('.notifications-dropdown') && e.target.id !== 'mark-all-read') return;
            notificationsDropdown.classList.toggle('hidden');
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifCount.textContent = '0';
            notifCount.style.display = 'none';
            notificationsList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:14px;">No new alerts</div>';
            notificationsDropdown.classList.add('hidden');
            currentData.forEach(d => { if (d.status === 'Missed') d.status = 'Pending'; });
            renderTable(currentData);
            if (typeof renderBinsList === 'function') renderBinsList(currentData);

            showToast('All Read', 'Notifications cleared and rescheduled.', 'success');
        });
    }

    if (roleSwitcher) {
        roleSwitcher.addEventListener('change', (e) => {
            const newRole = e.target.value;
            currentRoleDisplay.textContent = newRole;

            const topbarRoleLabel = document.querySelector('.user-role-label');
            if (topbarRoleLabel) topbarRoleLabel.textContent = newRole;

            const isResident = newRole.toLowerCase() === 'resident';
            document.querySelectorAll('.nav-item').forEach(li => {
                const text = li.textContent.trim().toLowerCase();
                if (isResident && ['dashboard', 'bins', 'schedule', 'reports', 'settings'].includes(text)) {
                    li.style.display = 'none';
                } else {
                    li.style.display = '';
                }
            });

            const widgetsGroup = document.querySelector('.dashboard-widgets');
            if (widgetsGroup) {
                widgetsGroup.style.display = isResident ? 'none' : 'grid';
            }

            const btnNotifications = document.getElementById('btn-notifications');
            if (btnNotifications) {
                btnNotifications.style.display = isResident ? 'none' : '';
            }

            if (isResident) {
                const complaintsTab = Array.from(document.querySelectorAll('.nav-item')).find(li => li.textContent.trim().toLowerCase() === 'complaints');
                if (complaintsTab) complaintsTab.click();
            } else {
                const dashboardTab = Array.from(document.querySelectorAll('.nav-item')).find(li => li.textContent.trim().toLowerCase() === 'dashboard');
                if (dashboardTab) dashboardTab.click();
            }

            showToast('Role Changed', `You are now viewing the dashboard as a(n) ${newRole}.`, 'primary', 'fa-user-shield');
        });
    }

    [profileThemeSelect, settingsTheme].forEach(select => {
        if (select) {
            select.addEventListener('change', (e) => {
                applyTheme(e.target.value);
                saveDashboardState();
            });
        }
    });

    [saveAllSettingsBtn, saveProfileBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const newName = settingsName?.value || profileNameInput?.value || 'Admin';
                const newEmail = settingsEmail?.value || profileEmailInput?.value || 'admin@ecocity.gov';
                const newTheme = settingsTheme?.value || profileThemeSelect?.value || 'Light Mode';

                updateUserProfile(newName, currentRoleDisplay?.textContent || 'Admin', newEmail);
                applyTheme(newTheme);
                saveDashboardState();

                showToast('Settings Saved', 'Your profile and system preferences have been updated.', 'success');
                if (profileModal) profileModal.classList.add('hidden');
            });
        }
    });
}

function saveDashboardState() {
    showDashboard(true);
}

function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableObj.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }

    tableObj.style.display = 'table';
    emptyState.classList.add('hidden');

    data.forEach(item => {
        const tr = document.createElement('tr');

        let typeIcon, typeClass;
        switch (item.type) {
            case 'Solid': typeIcon = 'fa-trash-can'; typeClass = 'solid'; break;
            case 'Recycle': typeIcon = 'fa-recycle'; typeClass = 'recycle'; break;
            case 'Yard Waste': typeIcon = 'fa-leaf'; typeClass = 'yard'; break;
        }

        let statusClass;
        switch (item.status) {
            case 'Completed': statusClass = 'completed'; break;
            case 'Pending': statusClass = 'pending'; break;
            case 'Missed': statusClass = 'missed'; break;
            case 'In Route': statusClass = 'en-route'; break;
        }

        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <strong style="color:var(--text-color); font-size:15px; font-weight:600;">${item.id}</strong>
                    <span class="text-muted" style="font-size:12px;"><i class="fa-solid fa-location-dot"></i> ${item.city || 'Colombo'}</span>
                </div>
            </td>
            <td>
                <span class="waste-type ${typeClass}">
                    <i class="fa-solid ${typeIcon}"></i> ${item.type}
                </span>
            </td>
            <td><strong>${item.day}</strong> <br><span style="font-size:0.75rem;color:var(--text-muted)">${item.time}</span></td>
            <td>${item.cycle}</td>
            <td>
                <div class="fill-level-container" title="${Math.round(item.fillLevel)}%">
                    <div class="fill-bar">
                        <div class="fill-progress" style="width: ${item.fillLevel}%; background-color: ${item.fillLevel > 75 ? 'var(--color-danger)' : item.fillLevel > 50 ? 'var(--color-warning)' : 'var(--color-success)'}"></div>
                    </div>
                    <span>${Math.round(item.fillLevel)}%</span>
                </div>
            </td>
            <td>
                <span class="status-indicator">
                    <span class="status-dot ${statusClass}"></span>
                    ${item.status}
                </span>
            </td>
            <td>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-outline btn-sm action-btn" data-id="${item.id}" title="View Details">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    ${(item.status !== 'Completed' && item.fillLevel >= 90) ? `
                        <button class="collect-btn" data-id="${item.id}">
                            <i class="fa-solid fa-truck"></i> Collect
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function applyFilters() {
    const dayFilterVal = filterDay.value;
    const typeFilterVal = filterType.value;
    const fillFilterVal = filterFill.value;

    let filtered = RAW_DATA.filter(item => {
        const matchDay = dayFilterVal === 'All' || item.day === dayFilterVal;
        const matchType = typeFilterVal === 'All' || item.type === typeFilterVal;

        let matchFill = true;
        if (fillFilterVal === 'High') matchFill = item.fillLevel > 75;
        else if (fillFilterVal === 'Medium') matchFill = item.fillLevel > 50 && item.fillLevel <= 75;
        else if (fillFilterVal === 'Low') matchFill = item.fillLevel <= 50;

        return matchDay && matchType && matchFill;
    });

    currentData = filtered;
    renderTable(currentData);
    if (typeof renderBinsList === 'function') renderBinsList(currentData);
}