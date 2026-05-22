// Extracted from chat.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import { getDatabase, ref, onValue, push, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

        // State Management
        let currentUser = null;
        let userData = null;
        let activeChatId = null;
        let activeChatType = null;
        let messageListener = null;
        let allUsers = {};
        
        const ADMIN_UID = 'Ogy9lUbGHbSu8wYIYx2gQsTtFDF2';

        // DOM Elements
        const chatSidebar = document.getElementById('chat-sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const welcomeScreen = document.getElementById('welcome-screen');
        const activeChatInterface = document.getElementById('active-chat-interface');
        const messagesContainer = document.getElementById('messages-container');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const mobileMenuTrigger = document.getElementById('mobile-menu-trigger');

        // --- HELPER FUNCTIONS ---

        function showToast(msg) {
            const t = document.getElementById('toast');
            document.getElementById('toast-msg').textContent = msg;
            t.style.opacity = '1';
            setTimeout(() => t.style.opacity = '0', 3000);
        }

        window.autoExpand = function(field) {
            field.style.height = 'inherit';
            const height = field.scrollHeight;
            field.style.height = Math.min(height, 120) + 'px';
            sendBtn.disabled = field.value.trim().length === 0;
        };

        function getInitials(name) {
            if(!name) return '??';
            return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        }

        // --- CORE LOGIC ---

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                loadUserProfile(user.uid);
            } else {
                window.location.href = 'login.html';
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            signOut(auth).then(() => window.location.href = 'login.html');
        });

        function loadUserProfile(uid) {
            if (uid === ADMIN_UID) {
                userData = { uid: uid, nama: "Admin Root", departemen: "IT", status: "approved" };
                initApp();
                return;
            }
            const userRef = ref(db, 'users/' + uid);
            get(userRef).then((snapshot) => {
                if (snapshot.exists() && snapshot.val().status === 'approved') {
                    userData = snapshot.val();
                    userData.uid = uid;
                    initApp();
                } else {
                    signOut(auth);
                    window.location.href = 'login.html?error=unauthorized';
                }
            });
        }

        function initApp() {
            document.getElementById('user-greeting').innerHTML = `Halo, <span>${userData.nama || currentUser.email}</span>`;
            loadUsersAndLists();
            
            // Logic Mobile Menu
            if (window.innerWidth <= 900) {
                mobileMenuTrigger.style.display = 'inline-flex';
                mobileMenuTrigger.addEventListener('click', openSidebar);
                document.getElementById('back-to-list').addEventListener('click', closeSidebar);
                sidebarOverlay.addEventListener('click', closeSidebar);
            }
        }

        // Sidebar Controls
        function openSidebar() {
            chatSidebar.classList.add('open');
            sidebarOverlay.classList.add('show');
        }
        function closeSidebar() {
            chatSidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        }

        function loadUsersAndLists() {
            onValue(ref(db, 'users'), (snapshot) => {
                allUsers = {};
                const usersList = [];
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const u = child.val();
                        u.uid = child.key;
                        if (u.status === 'approved' && u.uid !== currentUser.uid) {
                            allUsers[u.uid] = u;
                            usersList.push(u);
                        }
                    });
                }
                if (currentUser.uid !== ADMIN_UID) {
                    allUsers[ADMIN_UID] = { uid: ADMIN_UID, nama: "Admin IT (Root)", departemen: "Support" };
                }
                renderLists(usersList);
                document.getElementById('loading-skeleton').style.display = 'none';
                document.getElementById('chat-list-content').style.display = 'block';
            });
        }

        function renderLists(users) {
            const groupEl = document.getElementById('list-group');
            const adminEl = document.getElementById('list-admin');
            const privateEl = document.getElementById('list-private');

            groupEl.innerHTML = ''; adminEl.innerHTML = ''; privateEl.innerHTML = '';

            // Group Items
            if (userData.departemen) {
                const deptId = userData.departemen.toLowerCase().replace(/[^a-z0-9]/g, '');
                groupEl.innerHTML += createItem('group', deptId, `Divisi ${userData.departemen}`, 'Ruang Diskusi', 'fa-users', 'group');
            }
            groupEl.innerHTML += createItem('group', 'all_employees', 'Semua Karyawan', 'Pengumuman Umum', 'fa-globe', 'group');

            // Admin Item
            if (currentUser.uid !== ADMIN_UID) {
                adminEl.innerHTML += createItem('admin', ADMIN_UID, 'Admin IT (Root)', 'Support', 'fa-headset', 'admin');
            } else {
                document.getElementById('section-admin').style.display = 'none';
            }

            // Private Items
            users.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
            users.forEach(u => {
                const initials = getInitials(u.nama || u.email);
                privateEl.innerHTML += createItem('private', u.uid, u.nama || u.email, u.departemen || 'Staff', initials, '');
            });

            attachClickEvents();
        }

        function createItem(type, id, name, desc, iconOrInit, styleClass) {
            let avatarContent = (styleClass === 'group' || styleClass === 'admin') ? `<i class="fa-solid ${iconOrInit}"></i>` : iconOrInit;
            return `
                <div class="contact-item" data-id="${id}" data-type="${type}" data-name="${name}">
                    <div class="avatar ${styleClass}">${avatarContent}</div>
                    <div class="contact-info"><div class="contact-name">${name}</div><div class="contact-desc">${desc}</div></div>
                </div>
            `;
        }

        function attachClickEvents() {
            document.querySelectorAll('.contact-item').forEach(item => {
                item.addEventListener('click', function() {
                    document.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
                    this.classList.add('active');

                    const id = this.getAttribute('data-id');
                    const type = this.getAttribute('data-type');
                    const name = this.getAttribute('data-name');
                    const avatarNode = this.querySelector('.avatar').cloneNode(true);
                    
                    openChat(id, type, name, avatarNode);
                });
            });
        }

        function openChat(id, type, name, avatarNode) {
            if (activeChatId === id) return;
            if (messageListener) messageListener(); 

            activeChatId = id;
            activeChatType = type;

            welcomeScreen.style.display = 'none';
            activeChatInterface.style.display = 'flex';
            
            document.getElementById('header-name').textContent = name;
            document.getElementById('header-status').textContent = type === 'group' ? 'Grup' : 'Personal';
            
            const hAvatar = document.getElementById('header-avatar');
            hAvatar.className = avatarNode.className;
            hAvatar.innerHTML = avatarNode.innerHTML;

            // Mobile: Tutup sidebar setelah pilih kontak
            if (window.innerWidth <= 900) {
                closeSidebar();
            }

            loadMessages(id, type);
        }

        // --- MESSAGE FORMATTING & SENDING ---

        // Fungsi baru: Auto Link & Preview
        function formatMessageContent(text) {
            let formatted = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // URL to Link
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            formatted = formatted.replace(urlRegex, (url) => `<a href="${url}" target="_blank">${url}</a>`);

            formatted = formatted.replace(/\n/g, '<br>');

            // Preview
            let previewHtml = '';
            const imgMatch = text.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i);
            if (imgMatch) {
                previewHtml = `<div class="msg-preview"><img src="${imgMatch[0]}" loading="lazy"></div>`;
            } else {
                const ytMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
                if (ytMatch) {
                    previewHtml = `<div class="msg-preview"><iframe width="100%" height="200" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
                }
            }

            return formatted + previewHtml;
        }

        function loadMessages(id, type) {
            messagesContainer.innerHTML = '';
            messageInput.value = '';
            messageInput.style.height = 'inherit';
            sendBtn.disabled = true;

            let path = type === 'group' ? `chats/group_chats/${id}` : `chats/private_chats/${[currentUser.uid, id].sort().join('_')}`;
            const q = query(ref(db, path), orderByChild('timestamp'), limitToLast(100));

            messageListener = onValue(q, (snapshot) => {
                messagesContainer.innerHTML = '';
                if (!snapshot.exists()) {
                    messagesContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#d1d5db;">Belum ada pesan.</div>';
                    return;
                }
                snapshot.forEach(child => {
                    renderSingleMessage(child.val(), type);
                });
                setTimeout(() => messagesContainer.scrollTop = messagesContainer.scrollHeight, 100);
            });
        }

        function renderSingleMessage(msg, type) {
            const isMe = msg.senderId === currentUser.uid;
            const row = document.createElement('div');
            row.className = `message-row ${isMe ? 'sent' : 'received'}`;
            
            let senderHtml = '';
            if (!isMe && type === 'group') {
                const senderName = msg.senderName || (allUsers[msg.senderId] ? allUsers[msg.senderId].nama : 'Unknown');
                senderHtml = `<span class="msg-sender-name">${senderName}</span>`;
            }

            const contentHtml = formatMessageContent(msg.text);

            row.innerHTML = `
                <div class="message-bubble">
                    ${senderHtml}
                    <div>${contentHtml}</div>
                    <span class="msg-meta">${new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            `;
            messagesContainer.appendChild(row);
        }

        // Logic Kirim Pesan
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || !activeChatId) return;

            const path = activeChatType === 'group' ? `chats/group_chats/${activeChatId}` : `chats/private_chats/${[currentUser.uid, activeChatId].sort().join('_')}`;

            messageInput.value = '';
            messageInput.style.height = 'inherit';
            sendBtn.disabled = true;

            push(ref(db, path), {
                senderId: currentUser.uid,
                senderName: userData.nama || currentUser.email,
                text: text,
                timestamp: Date.now()
            });
        }

        sendBtn.addEventListener('click', sendMessage);

        // Event Listener: ENTER untuk kirim
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendMessage();
            }
        });

        // Search Filter
        document.getElementById('search-contact').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.contact-item').forEach(item => {
                const match = item.getAttribute('data-name').toLowerCase().includes(term);
                item.style.display = match ? 'flex' : 'none';
            });
        });
