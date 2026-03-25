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

//Muthumala Thashmika

function simulateRealTimeUpdate() {
    const pendingItems = RAW_DATA.filter(item => item.status === 'Pending' || item.status === 'In Route');
    if (pendingItems.length === 0) return;

    const idx = Math.floor(Math.random() * pendingItems.length);
    const targetId = pendingItems[idx].id;

    const originalItem = RAW_DATA.find(i => i.id === targetId);

    if (originalItem.status === 'Pending') {
        originalItem.status = 'In Route';
    } else if (originalItem.status === 'In Route') {
        triggerTruckAnimation(targetId);
    }

    if (originalItem.status !== 'Completed') {
        applyFilters();
    }
}

function triggerTruckAnimation(binId) {
    const rows = document.querySelectorAll(`button[data-id="${binId}"].collect-btn`);
    if (!rows.length) {
        const item = RAW_DATA.find(i => i.id === binId);
        if (item) {
            item.status = 'Completed';
            item.fillLevel = 0;
            applyFilters();
        }
        return;
    }

    rows.forEach(btn => {
        const row = btn.closest('tr');
        if (!row) return;

        row.classList.add('row-collecting', 'collecting-active');

        const truck = document.createElement('div');
        truck.className = 'truck-anim-container truck-anim-active';
        truck.innerHTML = '<i class="fa-solid fa-truck-moving"></i> <span>Collecting...</span>';
        const td = row.querySelector('td:nth-child(2)'); // Append to second td for reliable relative positioning
        if (td) {
            td.style.position = 'relative'; 
            td.style.overflow = 'hidden';
            td.appendChild(truck);
        }

        setTimeout(() => {
            row.classList.remove('row-collecting', 'collecting-active');
            if (td && td.contains(truck)) truck.remove();

            const item = RAW_DATA.find(i => i.id === binId);
            if (item && item.status !== 'Completed') {
                item.status = 'Completed';
                item.fillLevel = 0;
                applyFilters();
                showToast('Collection Successful', `Bin ${binId} has been emptied via truck.`, 'success', 'fa-truck-ramp-box');
            }
        }, 4000);
    });
}

document.addEventListener('click', e => {
    const btn = e.target.closest('.collect-btn');
    if (!btn) return;
    const binId = btn.dataset.id;
    
    // Add immediate feedback to the button itself
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Collecting...';
    btn.disabled = true;
    
    triggerTruckAnimation(binId);
    
    // Reset button after the animation completes
    setTimeout(() => {
        if (document.body.contains(btn)) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }, 4000);
});

document.addEventListener('click', e => {
    const actionBtn = e.target.closest('.action-btn');
    if (!actionBtn) return;
    const binId = actionBtn.dataset.id;
    if (typeof viewBinHistory === 'function') {
        viewBinHistory(binId);
    }
});

function showToast(title, message, type = 'success', iconName = 'fa-check-circle') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <i class="fa-solid ${iconName} toast-icon"></i>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function renderBinsList(data) {
    const listBody = document.getElementById('bins-list-tbody');
    if (!listBody) return;

    listBody.innerHTML = '';

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
            <td><strong>${item.id}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Route: ${item.cycle}</span></td>
            <td>
                <span class="waste-type ${typeClass}">
                    <i class="fa-solid ${typeIcon}"></i> ${item.type}
                </span>
            </td>
            <td>
                <div class="fill-level-container" style="min-width: 80px;" title="${item.fillLevel}%">
                    <div class="fill-bar">
                        <div class="fill-progress" style="width: ${item.fillLevel}%; background-color: ${item.fillLevel > 75 ? 'var(--color-danger)' : item.fillLevel > 50 ? 'var(--color-warning)' : 'var(--color-success)'}"></div>
                    </div>
                    <span style="font-size: 0.75rem;">${item.fillLevel}%</span>
                </div>
            </td>
            <td>
                <span class="status-indicator">
                    <span class="status-dot ${statusClass}"></span>
                    ${item.status}
                </span>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

function renderSchedule(filterDay = 'All') {
    const grid = document.getElementById('schedule-grid');
    if (!grid || !RAW_DATA.length) return;

    const days = filterDay === 'All'
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        : [filterDay];

    const dayIcons = {
        Monday: 'fa-1', Tuesday: 'fa-2', Wednesday: 'fa-3',
        Thursday: 'fa-4', Friday: 'fa-5'
    };

    grid.innerHTML = '';

    days.forEach(day => {
        const dayBins = RAW_DATA.filter(b => b.day === day);
        if (!dayBins.length) return;

        const card = document.createElement('div');
        card.className = 'widget-card';
        card.style.cssText = 'flex-direction:column; align-items:flex-start; padding:20px; gap:0;';

        const completedCount = dayBins.filter(b => b.status === 'Completed').length;
        const pendingCount = dayBins.filter(b => b.status === 'Pending').length;
        const missedCount = dayBins.filter(b => b.status === 'Missed').length;
        const avgFill = Math.round(dayBins.reduce((s, b) => s + b.fillLevel, 0) / dayBins.length);

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:14px;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;">${day}</h3>
                <span style="font-size:0.75rem;background:var(--color-primary-light);color:var(--color-primary);
                    padding:3px 10px;border-radius:20px;font-weight:600;">${dayBins.length} bins</span>
            </div>
            <div style="display:flex;gap:10px;width:100%;margin-bottom:14px;flex-wrap:wrap;">
                <span style="font-size:0.75rem;color:var(--color-success);font-weight:600;">
                    <i class="fa-solid fa-check"></i> ${completedCount} done
                </span>
                <span style="font-size:0.75rem;color:var(--color-warning);font-weight:600;">
                    <i class="fa-solid fa-clock"></i> ${pendingCount} pending
                </span>
                ${missedCount > 0 ? `<span style="font-size:0.75rem;color:var(--color-danger);font-weight:600;">
                    <i class="fa-solid fa-triangle-exclamation"></i> ${missedCount} missed
                </span>` : ''}
            </div>
            <div style="width:100%;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:4px;">
                    <span style="color:var(--text-muted);">Avg Fill Level</span>
                    <strong>${avgFill}%</strong>
                </div>
                <div class="fill-bar" style="height:8px;">
                    <div class="fill-progress" style="width:${avgFill}%;background:${avgFill > 75 ? 'var(--color-danger)' : avgFill > 50 ? 'var(--color-warning)' : 'var(--color-success)'};"></div>
                </div>
            </div>
            <div style="width:100%;">
                ${dayBins.slice(0, 4).map(b => `
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;
                        padding:6px 0;border-bottom:1px solid var(--border-color);">
                        <span style="font-weight:600;">${b.id}</span>
                        <span style="color:var(--text-muted);">${b.time}</span>
                        <span class="status-indicator">
                            <span class="status-dot ${b.status.toLowerCase().replace(' ', '-')}"></span>
                            ${b.status}
                        </span>
                    </div>`).join('')}
                ${dayBins.length > 4 ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;text-align:center;">
                    +${dayBins.length - 4} more bins this day</div>` : ''}
            </div>`;

        grid.appendChild(card);
    });
}

document.addEventListener('click', e => {
    const tab = e.target.closest('.schedule-day-tab');
    if (!tab) return;
    document.querySelectorAll('.schedule-day-tab').forEach(t => {
        t.className = 'btn btn-outline btn-sm schedule-day-tab';
    });
    tab.className = 'btn btn-primary btn-sm schedule-day-tab';
    renderSchedule(tab.dataset.day);
});

document.addEventListener('click', e => {
    if (e.target.closest('#print-schedule-btn')) window.print();
});

function renderReports() {
    if (!RAW_DATA.length) return;

    const statsEl = document.getElementById('reports-stats');
    if (statsEl) {
        const total = RAW_DATA.length;
        const completed = RAW_DATA.filter(b => b.status === 'Completed').length;
        const missed = RAW_DATA.filter(b => b.status === 'Missed').length;
        const avgFill = Math.round(RAW_DATA.reduce((s, b) => s + b.fillLevel, 0) / total);
        const highFill = RAW_DATA.filter(b => b.fillLevel > 75).length;

        statsEl.innerHTML = `
            <div class="widget-card">
                <div class="widget-icon success"><i class="fa-solid fa-check-double"></i></div>
                <div class="widget-info"><h3>${completed}</h3><p>Completed Pickups</p></div>
            </div>
            <div class="widget-card">
                <div class="widget-icon danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="widget-info"><h3>${missed}</h3><p>Missed Pickups</p></div>
            </div>
            <div class="widget-card">
                <div class="widget-icon warning"><i class="fa-solid fa-fill-drip"></i></div>
                <div class="widget-info"><h3>${avgFill}%</h3><p>Average Fill Level</p></div>
            </div>
            <div class="widget-card">
                <div class="widget-icon primary"><i class="fa-solid fa-trash-can"></i></div>
                <div class="widget-info"><h3>${highFill}</h3><p>Critical Bins (&gt;75%)</p></div>
            </div>`;
    }

    const tbody = document.getElementById('reports-tbody');
    if (tbody) {
        const types = ['Solid', 'Recycle', 'Yard Waste'];
        tbody.innerHTML = types.map(type => {
            const bins = RAW_DATA.filter(b => b.type === type);
            if (!bins.length) return '';
            const avg = Math.round(bins.reduce((s, b) => s + b.fillLevel, 0) / bins.length);
            const count = s => bins.filter(b => b.status === s).length;
            const typeClass = type === 'Solid' ? 'solid' : type === 'Recycle' ? 'recycle' : 'yard';
            const typeIcon = type === 'Solid' ? 'fa-trash-can' : type === 'Recycle' ? 'fa-recycle' : 'fa-leaf';
            return `<tr>
                <td><span class="waste-type ${typeClass}"><i class="fa-solid ${typeIcon}"></i> ${type}</span></td>
                <td><strong>${bins.length}</strong></td>
                <td style="color:var(--color-success);font-weight:600;">${count('Completed')}</td>
                <td style="color:var(--color-warning);font-weight:600;">${count('Pending')}</td>
                <td style="color:var(--color-primary);font-weight:600;">${count('In Route')}</td>
                <td style="color:var(--color-danger);font-weight:600;">${count('Missed')}</td>
                <td>
                    <div class="fill-level-container">
                        <div class="fill-bar"><div class="fill-progress" style="width:${avg}%;
                            background:${avg > 75 ? 'var(--color-danger)' : avg > 50 ? 'var(--color-warning)' : 'var(--color-success)'}"></div></div>
                        <span style="font-size:0.75rem;">${avg}%</span>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    const distEl = document.getElementById('fill-distribution');
    if (distEl) {
        const low = RAW_DATA.filter(b => b.fillLevel <= 33).length;
        const medium = RAW_DATA.filter(b => b.fillLevel > 33 && b.fillLevel <= 66).length;
        const high = RAW_DATA.filter(b => b.fillLevel > 66).length;
        const total = RAW_DATA.length;
        const band = (label, count, color, icon) => `
            <div style="flex:1;min-width:140px;background:var(--bg-body);border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:1.5rem;color:${color};margin-bottom:6px;"><i class="fa-solid ${icon}"></i></div>
                <div style="font-size:1.75rem;font-weight:700;color:${color};">${count}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${label}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${Math.round(count / total * 100)}% of fleet</div>
            </div>`;
        distEl.innerHTML =
            band('Low (0–33%)', low, 'var(--color-success)', 'fa-battery-quarter') +
            band('Medium (34–66%)', medium, 'var(--color-warning)', 'fa-battery-half') +
            band('High (67–100%)', high, 'var(--color-danger)', 'fa-battery-full');
    }
}

document.addEventListener('click', e => {
    if (!e.target.closest('#export-csv-btn')) return;
    const headers = ['ID', 'Type', 'Day', 'Cycle', 'Status', 'Fill Level (%)', 'Time'];
    const rows = RAW_DATA.map(b =>
        [b.id, b.type, b.day, b.cycle, b.status, b.fillLevel, b.time].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'waste_routes_report.csv';
    a.click();
    showToast('Export Complete', 'CSV file has been downloaded.', 'success', 'fa-file-csv');
});

document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item')) return;
    const tabName = e.target.closest('.nav-item').textContent.trim().toLowerCase();
    if (tabName !== 'settings') return;

    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role-label');
    const nameInput = document.getElementById('settings-name');
    const roleSelect = document.getElementById('settings-role');
    if (nameInput && nameEl) nameInput.value = nameEl.textContent;
    if (roleSelect && roleEl) {
        const role = roleEl.textContent.replace(' (Offline)', '');
        const opt = [...roleSelect.options].find(o => o.value === role);
        if (opt) roleSelect.value = opt.value;
    }
});

document.addEventListener('click', e => {
    if (!e.target.closest('#save-all-settings-btn')) return;
    const name = document.getElementById('settings-name')?.value?.trim();
    const role = document.getElementById('settings-role')?.value;

    if (name) updateUserProfile(name, role || 'Admin');

    const prefs = {
        theme: document.getElementById('settings-theme')?.value,
        landing: document.getElementById('settings-landing')?.value,
        refresh: document.getElementById('settings-refresh')?.value,
        compact: document.getElementById('settings-compact')?.checked,
        notifMissed: document.getElementById('notif-missed')?.checked,
        notifFill: document.getElementById('notif-fill')?.checked,
        notifToasts: document.getElementById('notif-toasts')?.checked,
        notifEmail: document.getElementById('notif-email')?.checked,
    };
    localStorage.setItem('ecocity_settings', JSON.stringify(prefs));

    document.querySelector('.data-table')?.classList.toggle('compact', prefs.compact);

    showToast('Settings Saved', 'Your preferences have been saved.', 'success', 'fa-floppy-disk');
});

function loadSavedSettings() {
    try {
        const prefs = JSON.parse(localStorage.getItem('ecocity_settings') || '{}');
        if (prefs.theme) { const s = document.getElementById('settings-theme'); if (s) s.value = prefs.theme; }
        if (prefs.landing) { const s = document.getElementById('settings-landing'); if (s) s.value = prefs.landing; }
        if (prefs.refresh) { const s = document.getElementById('settings-refresh'); if (s) s.value = prefs.refresh; }
        if (prefs.compact != null) {
            const s = document.getElementById('settings-compact');
            if (s) s.checked = prefs.compact;
            document.querySelector('.data-table')?.classList.toggle('compact', prefs.compact);
        }
        if (prefs.notifMissed != null) { const s = document.getElementById('notif-missed'); if (s) s.checked = prefs.notifMissed; }
        if (prefs.notifFill != null) { const s = document.getElementById('notif-fill'); if (s) s.checked = prefs.notifFill; }
        if (prefs.notifToasts != null) { const s = document.getElementById('notif-toasts'); if (s) s.checked = prefs.notifToasts; }
        if (prefs.notifEmail != null) { const s = document.getElementById('notif-email'); if (s) s.checked = prefs.notifEmail; }
    } catch (e) { }
}

[document.getElementById('logout-settings-btn'), document.getElementById('sidebar-logout')].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('ecocity_session');
        dashboardView.style.display = 'none';
        authView.style.display = 'flex';
        showToast('Signed Out', 'You have been signed out.', 'success', 'fa-right-from-bracket');
    });
});

document.addEventListener('click', e => {
    if (!e.target.closest('#clear-data-btn')) return;
    const filterDay = document.getElementById('filter-day');
    const filterType = document.getElementById('filter-type');
    const filterFill = document.getElementById('filter-fill');
    if (filterDay) filterDay.value = '';
    if (filterType) filterType.value = '';
    if (filterFill) filterFill.value = '';
    currentData = [...RAW_DATA];
    renderTable(currentData);
    showToast('Filters Cleared', 'All table filters have been reset.', 'success', 'fa-rotate-left');
});

document.addEventListener('click', async e => {
    if (!e.target.closest('#clear-users-btn')) return;
    try {
        const res = await fetch('http://127.0.0.1:5000/api/clear-users', { method: 'POST' });
        if (res.ok) {
            showToast('Users Cleared', 'All registered users have been removed.', 'warning', 'fa-trash');
        } else {
            showToast('Error', 'Could not clear users.', 'danger');
        }
    } catch {
        showToast('Offline', 'Backend not reachable. Cannot clear users.', 'danger');
    }
});

const historyModal = document.getElementById('bin-history-modal');
const historyBinId = document.getElementById('history-bin-id');
const closeHistoryModal = document.getElementById('close-history-modal');

window.viewBinHistory = function (id) {
    if (historyBinId) historyBinId.textContent = `Bin ID: ${id}`;
    if (historyModal) historyModal.classList.remove('hidden');
};

if (closeHistoryModal) {
    closeHistoryModal.addEventListener('click', () => historyModal.classList.add('hidden'));
}

function simulateNearbyAlert() {
    const role = document.querySelector('.user-role-label')?.textContent || '';
    if (role.toLowerCase().includes('resident')) {
        const nearbyBin = currentData[Math.floor(Math.random() * currentData.length)];
        if (nearbyBin && nearbyBin.fillLevel > 70) {
            showToast('Nearby Alert', `Bin ${nearbyBin.id} near your location is almost full.`, 'warning', 'fa-location-dot');
        }
    }
}
setInterval(simulateNearbyAlert, 45000);

const addBinModal = document.getElementById('add-bin-modal');
const closeAddBinModal = document.getElementById('close-add-bin-modal');
const saveNewBinBtn = document.getElementById('save-new-bin-btn');
const addBinBtn = document.getElementById('add-bin-btn');

function getStatusColor(status) {
    switch (status) {
        case 'Completed': return 'var(--color-success)';
        case 'Pending': return 'var(--color-warning)';
        case 'Missed': return 'var(--color-danger)';
        case 'In Route': return 'var(--color-primary)';
        default: return 'var(--color-neutral)';
    }
}

function renderBinsList(data) {
    const binsListTbody = document.getElementById('bins-list-tbody');
    if (!binsListTbody) return;

    binsListTbody.innerHTML = '';

    data.forEach(bin => {
        const tr = document.createElement('tr');

        let statusColor = 'var(--color-success)';
        if (bin.fillLevel >= 85) statusColor = 'var(--color-danger)';
        else if (bin.fillLevel >= 50) statusColor = 'var(--color-warning)';

        const daysToFull = Math.max(0, (100 - bin.fillLevel) / 20);
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysToFull);
        const predictionText = daysToFull < 0.5 ? 'Today' : predictedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        tr.innerHTML = `
            <td><strong>${bin.id}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)"><i class="fa-solid fa-location-dot"></i> ${bin.city || 'Colombo'}</span></td>
            <td>${bin.type}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="fill-bar" style="flex:1; height:8px;"><div class="fill-progress" style="width:${bin.fillLevel}%; background-color:${statusColor};"></div></div>
                    <span style="font-size:12px; min-width:30px;">${Math.round(bin.fillLevel)}%</span>
                </div>
            </td>
            <td><span class="badge ${bin.fillLevel >= 85 ? 'badge-danger' : 'badge-neutral'}">${predictionText}</span></td>
            <td><span class="status-dot" style="background-color:${getStatusColor(bin.status)};"></span> ${bin.status}</td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-icon btn-sm" onclick="editBin('${bin.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-icon btn-sm text-danger" onclick="deleteBin('${bin.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        binsListTbody.appendChild(tr);
    });
}

window.editBin = function (id) {
    const bin = currentData.find(b => b.id === id);
    if (!bin) return;
    const newStatus = prompt(`Update status for ${id}? (Pending, In Route, Completed, Missed)`, bin.status);
    if (newStatus && ['Pending', 'In Route', 'Completed', 'Missed'].includes(newStatus)) {
        bin.status = newStatus;
        if (newStatus === 'Completed') bin.fillLevel = 0;
        renderTable(currentData);
        renderBinsList(currentData);
        showToast('Updated', `Bin ${id} status set to ${newStatus}`, 'success');
    }
};

window.deleteBin = function (id) {
    if (confirm(`Are you sure you want to remove bin ${id}?`)) {
        currentData = currentData.filter(b => b.id !== id);
        renderTable(currentData);
        renderBinsList(currentData);
        showToast('Bin Removed', `${id} deleted from system.`, 'warning');
    }
};

if (addBinBtn) {
    addBinBtn.addEventListener('click', () => addBinModal.classList.remove('hidden'));
}

if (closeAddBinModal) {
    closeAddBinModal.addEventListener('click', () => addBinModal.classList.add('hidden'));
}

if (saveNewBinBtn) {
    saveNewBinBtn.addEventListener('click', () => {
        const id = document.getElementById('new-bin-id').value;
        const type = document.getElementById('new-bin-type').value;
        const day = document.getElementById('new-bin-day').value;

        if (!id) return alert('Please enter a Bin ID');

        const newBin = {
            id: id,
            type: type,
            day: day,
            cycle: 'Weekly',
            fillLevel: 0,
            status: 'Pending',
            lat: 39.2904,
            lng: -76.6122,
            time: '08:00 AM'
        };

        currentData.unshift(newBin);
        renderTable(currentData);
        renderBinsList(currentData);
        addBinModal.classList.add('hidden');
        showToast('Bin Added', `New ${type} bin ${id} created successfully.`, 'success');
    });
}
document.addEventListener('DOMContentLoaded', () => {
    initApp().catch(err => console.error('App Init Failed', err));
});

function renderComplaints() {
    const tbody = document.getElementById('complaints-tbody');
    if (!tbody) return;

    const total = MOCK_COMPLAINTS.length;
    const resolved = MOCK_COMPLAINTS.filter(c => c.status === 'Resolved').length;
    const open = total - resolved;

    const elTotal = document.getElementById('stat-total-complaints');
    const elOpen = document.getElementById('stat-open-complaints');
    const elResolved = document.getElementById('stat-resolved-complaints');
    if (elTotal) elTotal.textContent = total;
    if (elOpen) elOpen.textContent = open;
    if (elResolved) elResolved.textContent = resolved;

    const emptyState = document.getElementById('complaints-empty-state');
    const table = tbody.closest('table');
    
    if (open === 0 && total === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (table) table.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    if (table) table.style.display = 'table';

    tbody.innerHTML = MOCK_COMPLAINTS.map(c => `
        <tr>
            <td><strong>${c.id}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${c.date}</span></td>
            <td>${c.binId}</td>
            <td>${c.type}</td>
            <td>${c.reporter}</td>
            <td>
                <span class="status-indicator">
                    <span class="status-dot" style="background-color:${c.status === 'Resolved' ? 'var(--color-success)' : 'var(--color-warning)'}"></span>
                    ${c.status}
                </span>
            </td>
            <td>
                ${c.status === 'Pending' ? `<button class="btn btn-outline btn-sm" onclick="resolveComplaint('${c.id}')"><i class="fa-solid fa-check"></i> Resolve</button>` : '<span style="color:var(--text-muted);font-size:0.875rem;">Done</span>'}
            </td>
        </tr>
    `).join('');
}

window.resolveComplaint = function(id) {
    const c = MOCK_COMPLAINTS.find(x => x.id === id);
    if (c) {
        c.status = 'Resolved';
        renderComplaints();
        showToast('Complaint Resolved', `Ticket ${id} marked as resolved.`, 'success');
    }
};

const addComplaintModal = document.getElementById('add-complaint-modal');
const closeComplaintModal = document.getElementById('close-complaint-modal');
const saveNewComplaintBtn = document.getElementById('save-new-complaint-btn');
const addComplaintBtn = document.getElementById('add-complaint-btn');

if (addComplaintBtn) addComplaintBtn.addEventListener('click', () => addComplaintModal.classList.remove('hidden'));
if (closeComplaintModal) closeComplaintModal.addEventListener('click', () => addComplaintModal.classList.add('hidden'));

if (saveNewComplaintBtn) {
    saveNewComplaintBtn.addEventListener('click', () => {
        const binId = document.getElementById('new-complaint-bin').value || 'Unspecified';
        const type = document.getElementById('new-complaint-type').value;
        const desc = document.getElementById('new-complaint-desc').value;
        if (!desc) return alert('Please provide some details for the complaint.');

        const reporterNode = document.querySelector('.user-name');
        const reporterName = reporterNode ? reporterNode.textContent : 'Resident';

        const newId = 'CMP-' + Math.floor(8000 + Math.random() * 1000);
        MOCK_COMPLAINTS.unshift({
            id: newId, binId, type, reporter: reporterName, status: 'Pending', date: 'Just now', desc
        });

        document.getElementById('new-complaint-bin').value = '';
        document.getElementById('new-complaint-desc').value = '';
        
        renderComplaints();
        addComplaintModal.classList.add('hidden');
        showToast('Complaint Logged', 'Your issue has been submitted successfully.', 'success', 'fa-bullhorn');
    });
}
