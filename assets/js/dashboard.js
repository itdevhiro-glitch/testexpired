// Extracted from dashboard.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { 
            getDatabase, 
            ref, 
            onValue, 
            set, 
            push,
            get 
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

        const firebaseConfig = {
            apiKey: "AIzaSyA9wgSalrlTcveIZi2i-WND86z1i9JYHKw",
            authDomain: "it-support-53eeb.firebaseapp.com",
            databaseURL: "https://it-support-53eeb-default-rtdb.firebaseio.com",
            projectId: "it-support-53eeb",
            storageBucket: "it-support-53eeb.firebasestorage.app",
            messagingSenderId: "573924501146",
            appId: "1:573924501146:web:12f34306ed675472322123",
            measurementId: "G-33K6DDE1VR"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app); 

        const mainContent = document.getElementById('main-content');
        const loadingScreen = document.getElementById('loading-screen');
        const userGreeting = document.getElementById('user-greeting');
        const logoutBtn = document.getElementById('logout-btn');
        const manageCard = document.getElementById('manage-content-card');
        const hrQuickLink = document.getElementById('hr-quick-link');
        const mobileHrLink = document.getElementById('mobile-hr-link');
        
        const itCard = document.getElementById('it-ticket-card');

        const marketingCard = document.getElementById('marketing-card');
        const navMarketingLink = document.getElementById('nav-marketing-link');
        const mobileMarketingLink = document.getElementById('mobile-marketing-link');

        // FINANCE ELEMENTS
        const financeCard = document.getElementById('finance-card');
        const pettyCashCard = document.getElementById('petty-cash-card'); // New element
        
        const menuToggleBtn = document.getElementById('menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');

        function toggleMenu() {
            const isActive = mobileMenu.classList.contains('active');
            if (isActive) {
                mobileMenu.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
            } else {
                mobileMenu.classList.add('active');
                mobileMenuOverlay.classList.add('active');
            }
        }

        menuToggleBtn.addEventListener('click', toggleMenu);
        closeMenuBtn.addEventListener('click', toggleMenu);
        mobileMenuOverlay.addEventListener('click', toggleMenu);

        const handleLogout = () => {
             signOut(auth).then(() => {
                window.location.href = '../index.html'; 
            }).catch((error) => {
                showToast("Gagal logout, silakan coba lagi."); 
            });
        };
        
        logoutBtn.addEventListener('click', handleLogout);
        logoutBtnMobile.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        
        let nationalHolidays = {};
        let calendarNotes = {};
        let currentSelectedDate = null;
        let loggedInUserName = "Tamu";

        function showToast(message) {
            const toast = document.getElementById('toast-notification');
            if (toast) {
                toast.querySelector('p').textContent = message;
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            }
        }

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, function(match) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[match];
            });
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                const userRef = ref(db, 'users/' + user.uid);
                
                get(userRef).then((snapshot) => {
                    
                    let isHRD = false; 
                    let isIT = false;
                    let isMarketing = false;
                    let isFinance = false;

                    if (user.email === 'root@zeppelin.center') {
                        userGreeting.innerHTML = `Halo, <span>ADMIN</span>`;
                        loggedInUserName = "Admin"; 
                        isHRD = true; 
                        isIT = true;
                        isMarketing = true;
                        isFinance = true;

                    } else if (snapshot.exists()) {
                        const userData = snapshot.val();
                        
                        if (userData.status === 'approved') {
                            const nama = userData.nama || user.email;
                            userGreeting.innerHTML = `Halo, <span>${nama}</span>`;
                            loggedInUserName = nama; 
                            
                            if (userData.departemen === 'HRD' || userData.departemen === 'Human Resources') {
                                isHRD = true;
                            }

                            if (userData.departemen === 'IT' || userData.departemen === 'Information Technology' || userData.departemen === 'Teknologi Informasi') {
                                isIT = true;
                            }

                            if (userData.departemen === 'Marketing' || userData.departemen === 'Pemasaran') {
                                isMarketing = true;
                            }

                            if (userData.departemen === 'Finance' || userData.departemen === 'Accounting' || userData.departemen === 'Keuangan') {
                                isFinance = true;
                            }
                            
                        } else if (userData.status === 'pending') {
                            signOut(auth).then(() => {
                            window.location.href = '../index.html?reason=pending'; 
                        });
                        return;
                        
                        } else if (userData.status === 'rejected') { 
                            signOut(auth).then(() => {
                                window.location.href = '../index.html?reason=rejected';
                            });
                            return;
                        
                        } else { 
                            signOut(auth).then(() => {
                                window.location.href = '../index.html?reason=invalid';
                            });
                            return;
                        }
                        
                    } else {
                        signOut(auth).then(() => {
                            window.location.href = '../index.html?reason=no_data';
                        });
                        return;
                    }

                    if (!isHRD) {
                        const accessDeniedHandler = (e) => {
                            e.preventDefault(); 
                            if(mobileMenu.classList.contains('active')) toggleMenu();
                            showToast("Akses Ditolak. Khusus HRD.");
                        };
                        if (manageCard) {
                            manageCard.classList.add('hidden-non-hrd');
                            manageCard.addEventListener('click', accessDeniedHandler);
                        }
                        if (hrQuickLink) {
                            hrQuickLink.classList.add('hidden-non-hrd');
                            hrQuickLink.addEventListener('click', accessDeniedHandler);
                        }
                        if (mobileHrLink) {
                            mobileHrLink.classList.add('hidden-non-hrd');
                            mobileHrLink.addEventListener('click', accessDeniedHandler);
                        }
                    } else {
                        if (manageCard) manageCard.href = "content-management.html";
                        if (hrQuickLink) hrQuickLink.href = "content-management.html";
                        if (mobileHrLink) mobileHrLink.href = "content-management.html";
                    }

                    if (isIT) {
                        if (itCard) itCard.classList.remove('hidden-non-it');
                    } else {
                        if (itCard) {
                            itCard.classList.add('hidden-non-it');
                            itCard.addEventListener('click', (e) => {
                                e.preventDefault();
                                showToast("Akses Ditolak. Khusus IT.");
                            });
                        }
                    }

                    const marketingElements = [marketingCard, navMarketingLink, mobileMarketingLink];
                    if (isMarketing) {
                        marketingElements.forEach(el => {
                            if (el) el.classList.remove('hidden-non-marketing');
                        });
                    } else {
                        marketingElements.forEach(el => {
                            if (el) {
                                el.classList.add('hidden-non-marketing');
                                el.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    showToast("Akses Ditolak. Khusus Marketing.");
                                });
                            }
                        });
                    }

                    // FINANCE & PETTY CASH LOGIC
                    const financeElements = [financeCard, pettyCashCard];
                    if (isFinance) {
                        financeElements.forEach(el => {
                            if (el) el.classList.remove('hidden-non-finance');
                        });
                    } else {
                        financeElements.forEach(el => {
                            if (el) {
                                el.classList.add('hidden-non-finance');
                                el.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    showToast("Akses Ditolak. Khusus Finance.");
                                });
                            }
                        });
                    }
                    
                    mainContent.style.display = 'block';
                    
                    requestAnimationFrame(() => {
                        loadingScreen.classList.add('fade-out');
                        
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                        }, 500);
                    });

                    runClock();
                    initCalendar(); 
                    initTodoWidget(); 
                    initAnnouncementWidget();
                    
                    fetchHolidays();
                    fetchCalendarNotes();
                    initIntersectionObserver();

                }).catch((error) => {
                    signOut(auth).then(() => {
                        window.location.href = '../index.html?reason=db_error';
                    });
                });

            } else {
                window.location.href = '../index.html';
            }
        });
        
        function runClock() {
            const clockEl = document.querySelector('.digital-clock');
            const dateEl = document.querySelector('.digital-date');
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

            function updateTime() {
                const now = new Date();
                const timeString = now.toLocaleTimeString('id-ID', { hour12: false });
                const dateString = now.toLocaleDateString('id-ID', options);
                
                clockEl.textContent = timeString;
                dateEl.textContent = dateString;
            }
            updateTime();
            setInterval(updateTime, 1000);
        }

        function initAnnouncementWidget() {
            const listEl = document.getElementById('announcement-list');
            const announcementsRef = ref(db, 'announcements');

            onValue(announcementsRef, (snapshot) => {
                listEl.innerHTML = ''; 
                
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                let postsArray = [];
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    for (let key in data) {
                        const post = data[key];
                        
                        if (post.expiresAt && post.expiresAt < todayStr) {
                            continue; 
                        }
                        
                        postsArray.push({ key, ...post });
                    }
                } 
                
                if (postsArray.length > 0) {
                    postsArray.sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return b.timestamp - a.timestamp;
                    });

                    const limitedPosts = postsArray.slice(0, 5);

                    limitedPosts.forEach(post => {
                        const li = document.createElement('li');
                        li.className = 'announcement-item';
                        
                        const date = new Date(post.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        
                        let tagsHtml = '';
                        if (post.isPinned) {
                            tagsHtml += `<span class="tag tag-pin"><i class="fa-solid fa-thumbtack"></i> Pin</span>`;
                        }
                        const categoryClass = `tag-cat-${post.category?.toLowerCase() || 'umum'}`;
                        tagsHtml += `<span class="tag tag-cat ${categoryClass}">${escapeHTML(post.category || 'Umum')}</span>`;
                        
                        if (post.expiresAt) {
                            tagsHtml += `<span class="tag tag-expiry">Exp: ${post.expiresAt}</span>`;
                        }
                        
                        li.innerHTML = `
                            <div class="announcement-header">
                                <div class="ann-item-main">
                                    <h3 class="ann-item-title">${escapeHTML(post.title)}</h3>
                                    <div class="ann-item-meta">
                                        <i class="fa-solid fa-calendar-day"></i> ${date}
                                        ${post.author ? `| <i class="fa-solid fa-user"></i> ${escapeHTML(post.author)}` : ''}
                                    </div>
                                    <div class="ann-item-tags">
                                        ${tagsHtml}
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-down expand-icon"></i>
                            </div>
                            <div class="announcement-content">
                                ${post.content || '<em>Tidak ada isi.</em>'}
                            </div>
                        `;
                        listEl.appendChild(li);
                    });
                } else {
                    listEl.innerHTML = '<li class="announcement-empty">Tidak ada pengumuman.</li>';
                }
            }, (error) => {
                listEl.innerHTML = '<li class="announcement-empty">Gagal memuat data.</li>';
            });

            listEl.addEventListener('click', (e) => {
                const header = e.target.closest('.announcement-header');
                if (header) {
                    const content = header.nextElementSibling; 
                    const icon = header.querySelector('.expand-icon');
                    
                    if (content) {
                        const isVisible = content.style.display === 'block';
                        content.style.display = isVisible ? 'none' : 'block';
                        icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                }
            });
        }

        function initTodoWidget() {
            const inputEl = document.getElementById('todo-input');
            const addBtn = document.getElementById('add-todo-btn');
            const listEl = document.getElementById('todo-list');
            let todos = JSON.parse(localStorage.getItem('zeppelinTodos') || '[]');
            function saveTodos() {
                localStorage.setItem('zeppelinTodos', JSON.stringify(todos));
            }
            function renderTodos() {
                listEl.innerHTML = '';
                if (todos.length === 0) {
                    listEl.innerHTML = '<li class="todo-empty">Tidak ada tugas.</li>';
                    return;
                }
                todos.forEach((todo, index) => {
                    const li = document.createElement('li');
                    li.className = todo.completed ? 'completed' : '';
                    li.innerHTML = `
                        <input type="checkbox" data-index="${index}" ${todo.completed ? 'checked' : ''}>
                        <span>${escapeHTML(todo.text)}</span> <button class="delete-todo" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
                    `;
                    listEl.appendChild(li);
                });
            }
            addBtn.addEventListener('click', () => {
                const text = inputEl.value.trim();
                if (text) {
                    todos.push({ text: text, completed: false });
                    inputEl.value = '';
                    saveTodos();
                    renderTodos();
                }
            });
            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addBtn.click();
                }
            });
            listEl.addEventListener('click', (e) => {
                const target = e.target;
                if (target.type === 'checkbox') {
                    const index = target.dataset.index;
                    todos[index].completed = target.checked;
                    saveTodos();
                    renderTodos();
                }
                if (target.closest('.delete-todo')) {
                    const index = target.closest('.delete-todo').dataset.index;
                    todos.splice(index, 1);
                    saveTodos();
                    renderTodos();
                }
            });
            renderTodos();
        }

        async function fetchHolidays() {
            const year = new Date().getFullYear();
            try {
                const response = await fetch(`https://api-harilibur.vercel.app/api?year=${year}`);
                const data = await response.json();
                data.forEach(holiday => {
                    if(holiday.is_national_holiday) {
                        const dateStr = holiday.holiday_date.split('T')[0];
                        nationalHolidays[dateStr] = holiday.holiday_name;
                    }
                });
                renderCalendar(); 
            } catch (error) {
                console.error("Gagal mengambil data hari libur");
            }
        }
        function fetchCalendarNotes() {
            const notesRef = ref(db, 'calendar_notes');
            onValue(notesRef, (snapshot) => {
                calendarNotes = snapshot.val() || {};
                renderCalendar();
            });
        }

        let currentDate = new Date();
        function initCalendar() {
            const daysEl = document.getElementById('calendar-days');
            const prevBtn = document.getElementById('prev-month');
            const nextBtn = document.getElementById('next-month');
            prevBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
            nextBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
            daysEl.addEventListener('click', (e) => {
                const dayCell = e.target.closest('.day-cell');
                if (dayCell && !dayCell.classList.contains('empty')) {
                    const dateStr = dayCell.dataset.date;
                    openCalendarModal(dateStr);
                }
            });
            initCalendarModal();
            renderCalendar();
        }
        function renderCalendar() {
            const monthYearEl = document.getElementById('month-year');
            const daysEl = document.getElementById('calendar-days');
            const today = new Date();
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();
            monthYearEl.textContent = new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            daysEl.innerHTML = ''; 
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            dayNames.forEach(day => {
                daysEl.innerHTML += `<div class="day-name">${day}</div>`;
            });
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 0; i < firstDay; i++) {
                daysEl.innerHTML += `<div class="day-cell empty"></div>`;
            }
            for (let i = 1; i <= daysInMonth; i++) {
                let cellClass = "day-cell";
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cellClass += " today";
                }
                if (nationalHolidays[dateStr]) {
                    cellClass += " is-holiday";
                }
                if (calendarNotes[dateStr]) {
                    cellClass += " has-note";
                }
                daysEl.innerHTML += `<div class="${cellClass}" data-date="${dateStr}">${i}</div>`;
            }
        }

        function initCalendarModal() {
            const backdrop = document.getElementById('calendar-modal-backdrop');
            const content = document.getElementById('calendar-modal-content');
            const closeBtn = document.getElementById('modal-close-btn');
            const saveBtn = document.getElementById('save-note-btn');
            function closeModal() {
                backdrop.classList.remove('visible');
                content.classList.remove('visible');
            }
            closeBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
            saveBtn.addEventListener('click', () => {
                const noteText = document.getElementById('note-textarea').value.trim();
                if (noteText && currentSelectedDate) {
                    saveNoteToFirebase(currentSelectedDate, noteText);
                }
            });
        }
        function openCalendarModal(dateStr) {
            currentSelectedDate = dateStr;
            const backdrop = document.getElementById('calendar-modal-backdrop');
            const content = document.getElementById('calendar-modal-content');
            const titleEl = document.getElementById('modal-date-title');
            const holidayEl = document.getElementById('modal-holiday-info');
            const holidayNameEl = document.getElementById('modal-holiday-name');
            const notesListEl = document.getElementById('modal-notes-list');
            const noteTextarea = document.getElementById('note-textarea');
            const dateObj = new Date(dateStr + 'T00:00:00');
            titleEl.textContent = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            noteTextarea.value = '';
            if (nationalHolidays[dateStr]) {
                holidayNameEl.textContent = nationalHolidays[dateStr];
                holidayEl.style.display = 'block';
            } else {
                holidayEl.style.display = 'none';
            }
            notesListEl.innerHTML = '';
            const notes = calendarNotes[dateStr];
            if (notes) {
                Object.values(notes).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(note => {
                    const noteItem = document.createElement('div');
                    noteItem.className = 'note-item';
                    const time = new Date(note.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
                    noteItem.innerHTML = `
                        <p>${escapeHTML(note.note).replace(/\n/g, '<br>')}</p> <div class="note-item-meta">
                            Oleh <span>${escapeHTML(note.user)}</span> pada ${time}
                        </div>
                    `;
                    notesListEl.appendChild(noteItem);
                });
            } else {
                notesListEl.innerHTML = '<div class="notes-empty">Tidak ada catatan.</div>';
            }
            backdrop.classList.add('visible');
            content.classList.add('visible');
        }
        function saveNoteToFirebase(dateStr, noteText) {
            const saveBtn = document.getElementById('save-note-btn');
            const noteTextarea = document.getElementById('note-textarea');
            saveBtn.disabled = true;
            saveBtn.textContent = "Menyimpan...";
            const note = {
                user: loggedInUserName,
                timestamp: new Date().toISOString(),
                note: noteText
            };
            const notesListRef = ref(db, 'calendar_notes/' + dateStr);
            const newNoteRef = push(notesListRef);
            set(newNoteRef, note)
                .then(() => {
                    noteTextarea.value = '';
                })
                .catch((error) => {
                    showToast("Gagal menyimpan.");
                })
                .finally(() => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Simpan";
                });
        }

        function initIntersectionObserver() {
            const animatedElements = document.querySelectorAll('.fade-in-up');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target); 
                    }
                });
            }, {
                threshold: 0.1 
            });
            animatedElements.forEach(el => {
                observer.observe(el);
            });
        }
