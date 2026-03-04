// ==================== Firebase 라이브러리 불러오기 ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth, signInWithCredential, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

// ==================== Firebase 설정 ====================
// 프로젝트 이전 시 이 객체 내부의 값들을 새로운 Firebase 프로젝트 설정으로 교체하세요. // goat
const firebaseConfig = {
    apiKey: "AIzaSyA-yu5wsMADDuyO_EMCDP6MiO6n7RtOdKg",
    authDomain: "webtest-d4e68.firebaseapp.com",
    databaseURL: "https://webtest-d4e68-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "webtest-d4e68",
    storageBucket: "webtest-d4e68.firebasestorage.app",
    messagingSenderId: "430889156958",
    appId: "1:430889156958:web:41214004b9cfa1edee0fcf",
    measurementId: "G-FNM644Y3X0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app); 

// [보안 수정완료] 완벽한 HTML 이스케이프 함수
function escapeHTML(str) {
    if (typeof str !== 'string' || !str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML; 
}

// [추가된 코드] 안전한 D-Day 계산 함수 (타임존 오류 방지)
function calculateDDay(deadlineStr) {
    if (!deadlineStr) return null;
    const parts = deadlineStr.split('-');
    if (parts.length !== 3) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const deadlineDate = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    const diff = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

document.addEventListener('DOMContentLoaded', async () => {
    // [관리자 권한 설정] 이 리스트에 포함된 이메일 계정으로 로그인 시 관리자 메뉴가 활성화됩니다. // goat
    const ADMIN_EMAILS = ["geonho0827@pess.cnehs.kr"]; 
    
    // [초기 데이터 세팅] 데이터베이스가 완전히 비어있을 때 사용되는 샘플 데이터입니다. // goat
    const defaultClubs = [
        { id: "c1", name: "픽셀 마스터", intro: "게임 개발부터 그래픽 디자인까지 디지털 아트를 창조합니다.", clubType: "진로 동아리", category: ["프로그래밍"], department: "소프트웨어학과", career: "게임 개발자" },
        { id: "c2", name: "앙상블", intro: "다양한 악기로 아름다운 하모니를 만드는 기악 합주 동아리입니다.", clubType: "자율 동아리", category: ["문화"], activity: "정기 연주회 및 버스킹" },
        { id: "c3", name: "온정", intro: "지역 사회에 따뜻한 도움의 손길을 전하는 봉사 동아리입니다.", clubType: "자율 동아리", category: ["사회봉사"], activity: "주말 복지관 봉사활동" },
        { id: "c4", name: "아르키메데스", intro: "수학적 원리를 탐구하고 실생활의 문제를 논리적으로 해결합니다.", clubType: "진로 동아리", category: ["학술"], department: "수학과", career: "데이터 분석가" }
    ];
    
    // [기본 카테고리 목록] 사이트 리셋 시 생성될 기본 분류들입니다. // goat
    const defaultCategories = {
        career: ["공학", "로봇", "경제", "역사", "환경", "프로그래밍"],
        auto: ["공학", "로봇", "경제", "역사", "환경", "프로그래밍"]
    };

    // [성향 분석 기본 질문] 테스트 질문이 없을 때 사용되는 샘플 질문입니다. // goat
    const defaultQuestions = [
        { id: "q1", text: "복잡한 문제를 논리적으로 해결하는 과정을 즐긴다.", category: ["프로그래밍"] },
        { id: "q2", text: "사람들을 돕고 지역사회에 기여하는 것에 보람을 느낀다.", category: ["사회봉사"] },
        { id: "q4", text: "음악, 미술 등 예술적인 활동으로 나를 표현하는 것을 좋아한다.", category: ["문화"] },
        { id: "q5", text: "새로운 아이디어를 기획하고 무언가를 만들어내는 것을 좋아한다.", category: ["창업", "발명"] },
        { id: "q11", text: "자연 환경 보호와 생태계 보전에 관심이 많다.", category: ["환경"] }
    ];

    // 데이터 저장용 변수들
    let clubsData = [];
    let noticesData = [];
    let categoriesData = { career: [], auto: [] };
    let questionsData = [];
    let currentQuizQuestions = [];
    
    let isLoggedIn = false;
    let favoriteClubs = JSON.parse(localStorage.getItem('favClubs')) || [];
    
    let editingClubId = null;
    let editingQuestionId = null; 
    let selectedClubType = "진로 동아리"; 
    let selectedCategoriesForClub = []; 
    let selectedCategoriesForQuestion = []; 

    // DOM 요소 참조 (화면 및 메뉴)
    const views = {
        home: document.getElementById('home-view'),
        search: document.getElementById('search-view'),
        notice: document.getElementById('notice-view'),
        admin: document.getElementById('admin-view'),
        aiAdmin: document.getElementById('aiAdmin-view')
    };

    const menus = {
        home: document.getElementById('menu-home'),
        search: document.getElementById('menu-search'),
        notice: document.getElementById('menu-notice'),
        admin: document.getElementById('menu-admin'),
        aiAdmin: document.getElementById('menu-aiAdmin')
    };

    const modals = {
        login: document.getElementById('login-modal'),
        club: document.getElementById('club-modal'),
        notice: document.getElementById('notice-add-modal'),
        detail: document.getElementById('detail-modal'),
        recommend: document.getElementById('recommend-modal'),
        question: document.getElementById('question-modal') 
    };

    const clubResults = document.getElementById('club-results');
    const noticeList = document.getElementById('notice-list');

    // [데이터 저장 함수들] Firebase 실시간 데이터베이스와 로컬스토리지에 동시 저장
    function saveClubs() {
        localStorage.setItem('clubsData', JSON.stringify(clubsData));
        set(ref(db, 'clubs'), clubsData).catch(e => console.error(e));
    }
    function saveNotices() {
        localStorage.setItem('noticesData', JSON.stringify(noticesData));
        set(ref(db, 'notices'), noticesData).catch(e => console.error(e));
    }
    function saveCategories() {
        localStorage.setItem('catDataObj', JSON.stringify(categoriesData));
        set(ref(db, 'categories_v2'), categoriesData).catch(e => console.error(e));
    }
    function saveQuestions() { 
        localStorage.setItem('questionsData', JSON.stringify(questionsData));
        set(ref(db, 'questions'), questionsData).catch(e => console.error(e));
    }

    // [데이터 불러오기] 페이지 로드 시 실행됨
    async function fetchInitialData() {
        try {
            // 1. 동아리 데이터 로드
            const clubsSnap = await get(ref(db, 'clubs'));
            if (clubsSnap.exists()) {
                const rawData = clubsSnap.val();
                clubsData = Array.isArray(rawData) ? rawData.filter(c => c !== null) : Object.values(rawData).filter(c => c !== null);
            } else {
                clubsData = JSON.parse(localStorage.getItem('clubsData')) || [...defaultClubs];
            }

            // 2. 공지사항 데이터 로드
            const noticesSnap = await get(ref(db, 'notices'));
            if (noticesSnap.exists()) {
                const rawData = noticesSnap.val();
                noticesData = Array.isArray(rawData) ? rawData.filter(n => n !== null) : Object.values(rawData).filter(n => n !== null);
            } else {
                noticesData = JSON.parse(localStorage.getItem('noticesData')) || [];
            }

            // 3. 카테고리 데이터 로드
            const catSnap = await get(ref(db, 'categories_v2'));
            if (catSnap.exists()) {
                const rawCat = catSnap.val();
                categoriesData = {
                    career: Array.isArray(rawCat.career) ? (rawCat.career || []).filter(c => c !== null) : Object.values(rawCat.career || {}).filter(c => c !== null),
                    auto: Array.isArray(rawCat.auto) ? (rawCat.auto || []).filter(c => c !== null) : Object.values(rawCat.auto || {}).filter(c => c !== null)
                };
            } else {
                categoriesData = JSON.parse(localStorage.getItem('catDataObj')) || JSON.parse(JSON.stringify(defaultCategories));
            }

            // 4. 질문 데이터 로드
            const qSnap = await get(ref(db, 'questions'));
            if (qSnap.exists()) {
                const rawData = qSnap.val();
                questionsData = Array.isArray(rawData) ? rawData.filter(q => q !== null) : Object.values(rawData).filter(q => q !== null);
            } else {
                questionsData = JSON.parse(localStorage.getItem('questionsData')) || [...defaultQuestions];
            }
        } catch (error) {
            console.error("데이터 로드 에러:", error);
            clubsData = JSON.parse(localStorage.getItem('clubsData')) || [...defaultClubs];
            noticesData = JSON.parse(localStorage.getItem('noticesData')) || [];
            categoriesData = JSON.parse(localStorage.getItem('catDataObj')) || JSON.parse(JSON.stringify(defaultCategories));
            questionsData = JSON.parse(localStorage.getItem('questionsData')) || [...defaultQuestions];
        }

        // 구 버전 데이터 호환용 변환
        clubsData.forEach(c => { if(typeof c.category === 'string') c.category = [c.category]; });
        questionsData.forEach(q => { if(typeof q.category === 'string') q.category = [q.category]; });

        renderDynamicUI();
        renderClubs();
        renderNotices();
        updateAdminDashboard();
    }

    // [필터 UI 렌더링] 검색 화면 상단의 동적 카테고리 버튼 생성
    function renderDynamicUI() {
        const searchFilterGroup = document.getElementById('search-filter-group');
        if (searchFilterGroup) {
            let html = `
                <div style="margin-bottom: 25px; display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px dashed var(--border); padding-bottom: 15px;">
                    <span class="filter-tag type-btn" data-val="" style="cursor:pointer; background: var(--border); color: var(--text);">전체보기</span>
                    <span class="filter-tag type-btn" data-val="진로 동아리" style="cursor:pointer; background: #2563eb; color: white;">진로 동아리</span>
                    <span class="filter-tag type-btn" data-val="자율 동아리" style="cursor:pointer; background: #16a34a; color: white;">자율 동아리</span>
                </div>
                
                <div style="margin-bottom: 8px; font-size: 13px; font-weight: 800; color: #2563eb;">🎓 진로 분야</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
                    ${(categoriesData.career || []).map(cat => `<span class="filter-tag cat-btn" data-val="${escapeHTML(cat)}">${escapeHTML(cat)}</span>`).join('')}
                </div>

                <div style="margin-bottom: 8px; font-size: 13px; font-weight: 800; color: #16a34a;">🌱 자율 분야</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${(categoriesData.auto || []).map(cat => `<span class="filter-tag cat-btn" data-val="${escapeHTML(cat)}">${escapeHTML(cat)}</span>`).join('')}
                </div>
            `;
            searchFilterGroup.innerHTML = html;
            
            // 필터 태그 클릭 이벤트 연결
            document.querySelectorAll('#search-filter-group .filter-tag').forEach(tag => {
                tag.onclick = () => {
                    const val = tag.getAttribute('data-val');
                    if(document.getElementById('main-search-input')) document.getElementById('main-search-input').value = val;
                    renderClubs(val);
                };
            });
        }
        renderAdminLists();
    }

    // [관리자 전용 UI] 질문 리스트 및 카테고리 삭제 관리
    function renderAdminLists() {
        const careerList = document.getElementById('admin-cat-career-list');
        if (careerList) {
            careerList.innerHTML = (categoriesData.career || []).map((cat, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-light); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border);">
                    <span style="font-weight: 600; font-size: 14px;">${escapeHTML(cat)}</span>
                    <i class="fa-solid fa-trash-can del-cat-career" data-idx="${idx}" style="cursor:pointer; color:#ef4444;"></i>
                </div>
            `).join('');

            document.querySelectorAll('.del-cat-career').forEach(btn => btn.onclick = (e) => {
                if(confirm("삭제하시겠습니까?")) {
                    categoriesData.career.splice(e.target.dataset.idx, 1); saveCategories(); renderDynamicUI();
                }
            });
        }

        const autoList = document.getElementById('admin-cat-auto-list');
        if (autoList) {
            autoList.innerHTML = (categoriesData.auto || []).map((cat, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-light); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border);">
                    <span style="font-weight: 600; font-size: 14px;">${escapeHTML(cat)}</span>
                    <i class="fa-solid fa-trash-can del-cat-auto" data-idx="${idx}" style="cursor:pointer; color:#ef4444;"></i>
                </div>
            `).join('');

            document.querySelectorAll('.del-cat-auto').forEach(btn => btn.onclick = (e) => {
                if(confirm("삭제하시겠습니까?")) {
                    categoriesData.auto.splice(e.target.dataset.idx, 1); saveCategories(); renderDynamicUI();
                }
            });
        }

        const adminQList = document.getElementById('admin-question-list');
        if (adminQList) {
            adminQList.innerHTML = questionsData.map((q, idx) => {
                const catStr = Array.isArray(q.category) ? q.category.join(', ') : q.category;
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-light); padding: 12px 18px; border-radius: 10px; border: 1px solid var(--border);">
                    <div style="flex: 1; padding-right: 15px;">
                        <span style="font-size: 11px; background: var(--border); padding: 3px 8px; border-radius: 10px; color: var(--text); font-weight: 800; margin-right: 8px;">${escapeHTML(catStr)}</span>
                        <span style="font-size: 14px;">${escapeHTML(q.text)}</span>
                    </div>
                    <div style="display:flex; gap:15px;">
                        <i class="fa-solid fa-pen-to-square edit-q" data-id="${q.id}" style="cursor:pointer; color:#2563eb; font-size:16px;"></i>
                        <i class="fa-solid fa-trash-can delete-q" data-idx="${idx}" style="cursor:pointer; color:#ef4444; font-size:16px;"></i>
                    </div>
                </div>
                `;
            }).join('');

            document.querySelectorAll('.delete-q').forEach(btn => btn.onclick = (e) => {
                if (confirm("이 성향 질문을 삭제할까요?")) {
                    questionsData.splice(e.target.closest('.delete-q').dataset.idx, 1); 
                    saveQuestions(); renderAdminLists();
                }
            });
            document.querySelectorAll('.edit-q').forEach(btn => btn.onclick = (e) => {
                openQuestionModal(e.target.closest('.edit-q').dataset.id);
            });
        }
    }

    // 카테고리 추가 이벤트
    if (document.getElementById('add-cat-career-btn')) {
        document.getElementById('add-cat-career-btn').onclick = () => {
            const val = document.getElementById('new-cat-career').value.trim();
            if(val) { categoriesData.career.push(val); document.getElementById('new-cat-career').value=''; saveCategories(); renderDynamicUI(); }
        };
    }
    if (document.getElementById('add-cat-auto-btn')) {
        document.getElementById('add-cat-auto-btn').onclick = () => {
            const val = document.getElementById('new-cat-auto').value.trim();
            if(val) { categoriesData.auto.push(val); document.getElementById('new-cat-auto').value=''; saveCategories(); renderDynamicUI(); }
        };
    }

    // [페이지 전환 함수]
    function showPage(pageId) {
        Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
        Object.values(menus).forEach(m => { if (m) m.classList.remove('active'); });

        const targetView = views[pageId];
        if (targetView) targetView.style.display = 'block';
        if (menus[pageId]) menus[pageId].classList.add('active');
        
        window.scrollTo(0, 0);

        // [수정완료] Optional Chaining으로 안전한 DOM 접근
        if (pageId === 'search') {
            renderClubs(document.getElementById('main-search-input')?.value || '');
        } else if (pageId === 'notice') {
            renderNotices(document.getElementById('notice-search-input')?.value || '');
        }
        else if (pageId === 'admin') updateAdminDashboard();
        else if (pageId === 'aiAdmin') renderAdminLists();
    }

    // [모달 제어 함수들]
    function renderClubTypeButtons(selected = "진로 동아리") {
        selectedClubType = selected || "진로 동아리";
        const container = document.getElementById('club-type-buttons');
        if (container) {
            container.innerHTML = ["진로 동아리", "자율 동아리"].map(type => `
                <button type="button" class="modal-type-btn" data-val="${escapeHTML(type)}" 
                    style="padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: ${type === selectedClubType ? '#2563eb' : 'var(--bg-light)'}; color: ${type === selectedClubType ? 'white' : 'var(--gray)'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                    ${escapeHTML(type)}
                </button>
            `).join('');

            container.querySelectorAll('.modal-type-btn').forEach(btn => {
                btn.onclick = () => renderClubTypeButtons(btn.getAttribute('data-val'));
            });
        }

        if (selectedClubType === "진로 동아리") {
            document.getElementById('career-fields').style.display = 'flex';
            document.getElementById('autonomous-fields').style.display = 'none';
        } else {
            document.getElementById('career-fields').style.display = 'none';
            document.getElementById('autonomous-fields').style.display = 'flex';
        }
        renderClubCategoryButtons(selectedCategoriesForClub);
    }

    function renderClubCategoryButtons(selectedArray = []) {
        selectedCategoriesForClub = Array.isArray(selectedArray) ? [...selectedArray] : [selectedArray].filter(Boolean);
        const container = document.getElementById('club-category-buttons');
        if (!container) return;
        
        const targetCats = selectedClubType === "진로 동아리" ? categoriesData.career : categoriesData.auto;
        
        container.innerHTML = (targetCats || []).map(cat => {
            const isSelected = selectedCategoriesForClub.includes(cat);
            return `
            <button type="button" class="modal-cat-btn" data-val="${escapeHTML(cat)}" 
                style="padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: ${isSelected ? '#10b981' : 'var(--bg-light)'}; color: ${isSelected ? 'white' : 'var(--gray)'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                ${escapeHTML(cat)}
            </button>
        `}).join('');

        container.querySelectorAll('.modal-cat-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-val');
                if (selectedCategoriesForClub.includes(val)) {
                    selectedCategoriesForClub = selectedCategoriesForClub.filter(c => c !== val);
                } else {
                    selectedCategoriesForClub.push(val);
                }
                renderClubCategoryButtons(selectedCategoriesForClub);
            };
        });
    }

    function renderQuestionCategoryButtons(selectedArray = []) {
        selectedCategoriesForQuestion = Array.isArray(selectedArray) ? [...selectedArray] : [selectedArray].filter(Boolean);
        const container = document.getElementById('question-category-buttons');
        if (!container) return;
        
        const allCats = [...(categoriesData.career || []), ...(categoriesData.auto || [])];
        
        container.innerHTML = allCats.map(cat => {
            const isSelected = selectedCategoriesForQuestion.includes(cat);
            return `
            <button type="button" class="modal-q-cat-btn" data-val="${escapeHTML(cat)}" 
                style="padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: ${isSelected ? '#10b981' : 'var(--bg-light)'}; color: ${isSelected ? 'white' : 'var(--gray)'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                ${escapeHTML(cat)}
            </button>
        `}).join('');

        container.querySelectorAll('.modal-q-cat-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-val');
                if (selectedCategoriesForQuestion.includes(val)) {
                    selectedCategoriesForQuestion = selectedCategoriesForQuestion.filter(c => c !== val);
                } else {
                    selectedCategoriesForQuestion.push(val);
                }
                renderQuestionCategoryButtons(selectedCategoriesForQuestion);
            };
        });
    }

    // 전역으로 상세 모달 함수 노출 (AI 추천 리스트에서 호출용)
    window.openClubDetailModal = (id) => openClubDetail(id);

    function openClubDetail(id) {
        const club = clubsData.find(c => String(c.id) === String(id));
        if(!club) return;
        
        const typeStr = club.clubType || "진로/자율"; 
        const catStr = Array.isArray(club.category) ? club.category.join(", ") : club.category;
        
        let extraInfoHtml = '';
        if (club.clubType === "진로 동아리") {
            const deptStr = club.department ? escapeHTML(club.department) : "미기재";
            const careerStr = club.career ? escapeHTML(club.career) : "미기재";
            extraInfoHtml = `
                <div style="background: var(--bg-light); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border);">
                    <div style="font-size: 14px; margin-bottom: 5px;"><strong style="color: var(--primary);">🎓 관련 학과:</strong> ${deptStr}</div>
                    <div style="font-size: 14px;"><strong style="color: var(--primary);">🚀 향후 진로:</strong> ${careerStr}</div>
                </div>`;
        } else {
            const actStr = club.activity ? escapeHTML(club.activity) : "미기재";
            extraInfoHtml = `
                <div style="background: var(--bg-light); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border);">
                    <div style="font-size: 14px;"><strong style="color: #22c23a;">🏃 주요 활동:</strong> ${actStr}</div>
                </div>`;
        }

        document.getElementById('detail-modal-content').innerHTML = `
            <div style="margin-bottom: 15px; display: flex; gap: 8px;">
                <span style="background: var(--bg-light); border: 1px solid var(--primary); color: var(--primary); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800;">${escapeHTML(typeStr)}</span>
                <span style="background: var(--bg-light); border: 1px solid var(--border); color: var(--gray); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${escapeHTML(catStr)}</span>
            </div>
            <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: var(--text);">${escapeHTML(club.name)}</h2>
            ${extraInfoHtml}
            <p style="font-size: 15px; line-height: 1.6; color: var(--text); white-space: pre-wrap; background: var(--bg-light); padding: 20px; border-radius: 12px;">${escapeHTML(club.intro)}</p>
        `;
        if(modals.detail) modals.detail.style.display = 'flex';
    }

    function openNoticeDetail(id) {
        const notice = noticesData.find(n => String(n.id) === String(id));
        if(!notice) return;
        
        let dDayText = "";
        let isExpired = false;
        if (notice.deadline) {
            const diffDays = calculateDDay(notice.deadline);
            
            if (diffDays > 0) dDayText = `D-${diffDays}`;
            else if (diffDays === 0) dDayText = `D-Day`;
            else { dDayText = `마감됨`; isExpired = true; }
        } else {
            dDayText = "상시모집";
        }

        document.getElementById('detail-modal-content').innerHTML = `
            <div style="margin-bottom: 15px; display:flex; gap:8px;">
                <span style="background:linear-gradient(135deg, rgba(37,99,235,0.1), rgba(29,78,216,0.1)); color:var(--primary); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800;">모집 공고</span>
                <span style="background: ${isExpired ? '#e2e8f0' : '#fee2e2'}; color: ${isExpired ? '#64748b' : '#ef4444'}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800;">마감: ${dDayText}</span>
            </div>
            <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 10px; color: var(--text);">${escapeHTML(notice.clubName)}</h2>
            <p style="color:#e11d48; font-size:14px; font-weight:700; margin-bottom:20px;"><i class="fa-solid fa-calendar"></i> 모집기간: ${escapeHTML(notice.period)}</p>
            <p style="font-size: 15px; line-height: 1.6; color: var(--text); margin-bottom: 30px; white-space: pre-wrap; background: var(--bg-light); padding: 20px; border-radius: 12px;">${escapeHTML(notice.description)}</p>
            
            ${notice.link ? `<button class="apply-notice-btn" data-link="${encodeURI(notice.link)}" style="display:block; width:100%; text-align:center; padding:15px; background: ${isExpired ? 'var(--border)' : 'var(--primary)'}; color: ${isExpired ? 'var(--gray)' : 'white'}; border: none; border-radius:12px; font-weight:700; cursor:pointer;">${isExpired ? '모집이 마감되었습니다' : '지원하기'}</button>` : ''}
        `;
        if(modals.detail) modals.detail.style.display = 'flex';

        document.querySelectorAll('.apply-notice-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (isExpired) return; 
                if (!isLoggedIn) {
                    alert("학교 공식 계정(@pess.cnehs.kr)으로 로그인해야 지원할 수 있습니다.");
                    if(modals.login) modals.login.style.display = 'flex';
                } else {
                    window.open(btn.dataset.link, '_blank');
                }
            };
        });
    }

    if (document.getElementById('close-detail-modal')) {
        document.getElementById('close-detail-modal').onclick = () => {
            if(modals.detail) modals.detail.style.display = 'none';
        };
    }

    // [동아리 리스트 렌더링] 검색 및 동아리 카드 생성 // goat
    function renderClubs(filter = '') {
        if (!clubResults) return;
        clubResults.innerHTML = '';
        const term = filter.toLowerCase().trim();
        
        // 검색 로직: 이름, 소개, 카테고리, 구분, 학과 등 모든 필드 검색 가능
        const filteredClubs = clubsData.filter(club => {
            const catArrStr = Array.isArray(club.category) ? club.category.join(" ") : club.category;
            const searchText = `${club.name} ${club.intro} ${catArrStr} ${club.clubType || ''} ${club.department || ''} ${club.career || ''} ${club.activity || ''}`.toLowerCase();
            
            const matchesCat = term === '' || 
                               (term === '진로 동아리' && club.clubType === '진로 동아리') || 
                               (term === '자율 동아리' && club.clubType === '자율 동아리') ||
                               searchText.includes(term);
            return matchesCat;
        });

        // 결과 없음 표시 제어
        if (filteredClubs.length === 0 && term) {
            document.getElementById('search-empty-state').style.display = 'block';
            if (document.getElementById('search-result-count')) document.getElementById('search-result-count').textContent = '검색 결과 없음';
        } else {
            document.getElementById('search-empty-state').style.display = 'none';
            if (document.getElementById('search-result-count')) {
                document.getElementById('search-result-count').textContent = `총 ${filteredClubs.length}개의 동아리`;
            }
        }

        // 각 동아리 카드 HTML 생성
        filteredClubs.forEach((club, index) => {
            const card = document.createElement('div');
            card.className = 'club-card';
            card.dataset.clubId = club.id;
            card.style.animationDelay = `${index * 0.05}s`;
            
            const typeStr = club.clubType || "진로/자율"; 
            const catArr = Array.isArray(club.category) ? club.category : [club.category];
            const tagsHtml = catArr.map(c => `<span class="small-tag filter-tag" style="font-size:11px; padding:4px 10px; margin-right:4px;">${escapeHTML(c)}</span>`).join('');

            const isFav = favoriteClubs.includes(String(club.id));
            const heartClass = isFav ? 'fa-solid active' : 'fa-regular';
            
            // 타입 구분에 따른 CSS 클래스 적용 (배너 색상 다르게 표시)
            const typeClass = (club.clubType === "진로 동아리") ? "type-career" : "type-auto";

            let briefHtml = "";
            if (club.clubType === "진로 동아리") {
                const deptText = club.department ? escapeHTML(club.department) : "미기재";
                const careerText = club.career ? escapeHTML(club.career) : "미기재";
                briefHtml = `
                    <div style="font-size: 12px; color: var(--gray); margin-bottom: 10px; background: var(--bg-light); padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; margin-bottom: 2px;"><strong>학과:</strong> ${deptText}</div>
                        <div style="display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;"><strong>진로:</strong> ${careerText}</div>
                    </div>`;
            } else {
                const actText = club.activity ? escapeHTML(club.activity) : "미기재";
                briefHtml = `
                    <div style="font-size: 12px; color: var(--gray); margin-bottom: 10px; background: var(--bg-light); padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;"><strong>활동:</strong> ${actText}</div>
                    </div>`;
            }

            card.innerHTML = `
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span class="club-title" style="font-weight:800; font-size:18px; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(club.name)}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <i class="${heartClass} fa-heart fav-btn" data-id="${club.id}"></i>
                        <i class="fa-solid fa-ellipsis-v delete-btn admin-only" style="cursor: pointer; color: #cbd5e1; padding: 5px; display: none;"></i>
                    </div>
                </div>
                <div class="club-type-tag ${typeClass}" style="display:inline-block; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; margin-bottom:8px;">${escapeHTML(typeStr)}</div>
                
                ${briefHtml}

                <p class="club-intro" style="font-size: 13px; color: var(--gray); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom:15px; flex: 1;">${escapeHTML(club.intro)}</p>
                
                <div class="club-tags">${tagsHtml}</div>
                <div class="club-actions" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border); gap: 10px;">
                    <button class="edit-club-btn" style="flex: 1; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;"><i class="fa-solid fa-pen-to-square"></i> 수정</button>
                    <button class="delete-club-btn" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;"><i class="fa-solid fa-trash-can"></i> 삭제</button>
                </div>
            `;
            clubResults.appendChild(card);

            // 관리자 버튼 노출 제어
            if (document.body.classList.contains('admin-active')) {
                card.querySelectorAll('.delete-btn').forEach(btn => btn.style.display = 'block');
            }

            card.onclick = () => openClubDetail(club.id);

            // 하트 버튼(찜) 클릭 시
            card.querySelector('.fav-btn').onclick = (e) => {
                e.stopPropagation();
                if (!isLoggedIn) {
                    alert("관심 동아리를 표시하려면 학교 계정으로 로그인해주세요.");
                    if(modals.login) modals.login.style.display = 'flex';
                    return;
                }
                const targetId = String(club.id);
                if (favoriteClubs.includes(targetId)) {
                    favoriteClubs = favoriteClubs.filter(id => id !== targetId);
                } else {
                    favoriteClubs.push(targetId);
                }
                localStorage.setItem('favClubs', JSON.stringify(favoriteClubs));
                renderClubs(document.getElementById('main-search-input') ? document.getElementById('main-search-input').value : ''); 
            };

            // 관리 메뉴 열기
            card.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                if (!document.body.classList.contains('admin-active')) return;
                const actionsDiv = card.querySelector('.club-actions');
                document.querySelectorAll('.club-actions').forEach(a => a.style.display = 'none');
                actionsDiv.style.display = 'flex';
            };
            card.querySelector('.edit-club-btn').onclick = (e) => {
                e.stopPropagation(); openEditModal(club.id);
            };
            card.querySelector('.delete-club-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm('이 동아리를 삭제할까요?')) {
                    clubsData = clubsData.filter(c => String(c.id) !== String(club.id));
                    saveClubs(); renderClubs(filter);
                }
            };
        });
    }

    // [공지사항 렌더링] 모집 공고 리스트 생성
    function renderNotices(filter = '') {
        if (!noticeList) return;
        noticeList.innerHTML = '';
        const term = filter.toLowerCase().trim();

        const filteredNotices = noticesData.filter(notice => {
            const searchText = `${notice.clubName} ${notice.description}`.toLowerCase();
            return term === '' || searchText.includes(term);
        });

        if (filteredNotices.length === 0) {
            document.getElementById('notice-empty-state').style.display = 'block'; return;
        }
        document.getElementById('notice-empty-state').style.display = 'none';

        filteredNotices.forEach((notice, index) => {
            const card = document.createElement('div');
            card.className = 'notice-card';
            card.dataset.noticeId = notice.id;
            card.style.animationDelay = `${index * 0.05}s`;
            
            let dDayText = "";
            let isExpired = false;
            if (notice.deadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const targetDate = new Date(notice.deadline);
                targetDate.setHours(0,0,0,0);
                const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) dDayText = `D-${diffDays}`;
                else if (diffDays === 0) dDayText = `D-Day`;
                else { dDayText = `마감됨`; isExpired = true; }
            } else {
                dDayText = "상시모집";
            }

            card.innerHTML = `
                <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
                    <i class="notice-delete-btn fa-solid fa-xmark" style="position:absolute; top:-4px; right:-4px; cursor: pointer; font-size: 16px; color: #cbd5e1; padding: 5px; display:none;"></i>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding-right: 20px;">
                        <span style="font-weight:800; font-size: 18px; color: var(--text); display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(notice.clubName)}</span>
                        <span style="background: ${isExpired ? '#e2e8f0' : '#fee2e2'}; color: ${isExpired ? '#64748b' : '#ef4444'}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; white-space: nowrap;">${dDayText}</span>
                    </div>
                    
                    <p style="color:#e11d48; font-size:12px; font-weight:700; margin-bottom:8px;"><i class="fa-solid fa-calendar"></i> ${escapeHTML(notice.period)}</p>
                    <p style="color:var(--gray); font-size:13px; line-height:1.4; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(notice.description)}</p>
                    
                    <button style="margin-top: auto; display:block; width: 100%; text-align:center; padding:10px; background: ${isExpired ? 'transparent' : 'var(--bg-light)'}; border: 1px solid var(--border); border-radius:8px; color: ${isExpired ? 'var(--gray)' : 'var(--text)'}; font-size: 13px; font-weight:700; pointer-events: none;">${isExpired ? '마감됨' : '상세 보기'}</button>
                </div>
            `;
            noticeList.appendChild(card);

            if (document.body.classList.contains('admin-active')) {
                card.querySelector('.notice-delete-btn').style.display = 'block';
            }

            card.onclick = () => openNoticeDetail(notice.id);

            card.querySelector('.notice-delete-btn').onclick = (e) => {
                e.stopPropagation();
                if (!document.body.classList.contains('admin-active')) return;
                if (confirm('이 공고를 삭제할까요?')) {
                    noticesData = noticesData.filter(n => String(n.id) !== String(notice.id));
                    saveNotices(); renderNotices(filter);
                }
            };
        });
    }

    // [데이터 편집 폼 제어] 등록 및 수정 모달 열기
    function openClubModal() {
        editingClubId = null;
        document.getElementById('club-modal-title').textContent = '새 동아리 등록';
        document.getElementById('club-name').value = '';
        document.getElementById('club-intro').value = '';
        document.getElementById('club-department').value = '';
        document.getElementById('club-career').value = '';
        document.getElementById('club-activity').value = '';
        renderClubTypeButtons("진로 동아리"); 
        selectedCategoriesForClub = [];
        renderClubCategoryButtons([]); 
        if(modals.club) modals.club.style.display = 'flex';
    }

    function openEditModal(clubId) {
        editingClubId = clubId;
        const club = clubsData.find(c => String(c.id) === String(clubId));
        if (club) {
            document.getElementById('club-modal-title').textContent = '동아리 수정';
            document.getElementById('club-name').value = club.name || '';
            document.getElementById('club-intro').value = club.intro || '';
            document.getElementById('club-department').value = club.department || '';
            document.getElementById('club-career').value = club.career || '';
            document.getElementById('club-activity').value = club.activity || '';
            renderClubTypeButtons(club.clubType || "진로 동아리"); 
            renderClubCategoryButtons(club.category || []); 
            if(modals.club) modals.club.style.display = 'flex';
        }
    }

    function openQuestionModal(qId = null) {
        editingQuestionId = qId;
        if (qId) {
            const q = questionsData.find(q => String(q.id) === String(qId));
            if(q) {
                document.getElementById('question-modal-title').textContent = '성향 질문 수정';
                document.getElementById('question-text').value = q.text;
                renderQuestionCategoryButtons(q.category || []);
            }
        } else {
            document.getElementById('question-modal-title').textContent = '새 성향 질문 등록';
            document.getElementById('question-text').value = '';
            renderQuestionCategoryButtons([]);
        }
        if(modals.question) modals.question.style.display = 'flex';
    }

    // [데이터 저장 실행 버튼들]
    if(document.getElementById('save-club-btn')) {
        document.getElementById('save-club-btn').onclick = () => {
            const name = document.getElementById('club-name').value.trim();
            const intro = document.getElementById('club-intro').value.trim();
            const clubType = selectedClubType;
            const category = [...selectedCategoriesForClub]; 
            
            let department = "";
            let career = "";
            let activity = "";

            if (clubType === "진로 동아리") {
                department = document.getElementById('club-department').value.trim();
                career = document.getElementById('club-career').value.trim();
            } else {
                activity = document.getElementById('club-activity').value.trim();
            }

            if (!name || !intro || !clubType || category.length === 0) {
                alert('이름, 소개, 동아리 구분, 그리고 하나 이상의 카테고리를 선택해주세요.'); return;
            }

            if (editingClubId) {
                const club = clubsData.find(c => String(c.id) === String(editingClubId));
                if (club) {
                    club.name = name; club.intro = intro; 
                    club.department = department; club.career = career; club.activity = activity;
                    club.clubType = clubType; club.category = category;
                }
            } else {
                clubsData.push({ id: generateUUID(), name, intro, department, career, activity, clubType, category });
            }

            saveClubs();
            renderClubs(document.getElementById('main-search-input') ? document.getElementById('main-search-input').value : '');
            if(modals.club) modals.club.style.display = 'none';
            editingClubId = null;
        };
    }

    if(document.getElementById('save-question-btn')) {
        document.getElementById('save-question-btn').onclick = () => {
            const text = document.getElementById('question-text').value.trim();
            const category = [...selectedCategoriesForQuestion];

            if (!text || category.length === 0) {
                alert('질문 내용을 입력하고, 하나 이상의 연결 카테고리를 선택해주세요.'); return;
            }

            if (editingQuestionId) {
                const q = questionsData.find(q => String(q.id) === String(editingQuestionId));
                if (q) {
                    q.text = text; q.category = category;
                }
            } else {
                questionsData.push({ id: generateUUID(), text, category });
            }

            saveQuestions();
            renderAdminLists();
            if(modals.question) modals.question.style.display = 'none';
            editingQuestionId = null;
        };
    }

    if(document.getElementById('save-notice-btn')) {
        document.getElementById('save-notice-btn').onclick = () => {
            const clubName = document.getElementById('notice-club-name').value.trim();
            const startDateInput = document.getElementById('notice-start-date').value; 
            const endDateInput = document.getElementById('notice-end-date').value; 
            const description = document.getElementById('notice-desc').value.trim();
            const link = document.getElementById('notice-link').value.trim();

            if (!clubName || !startDateInput || !endDateInput) { 
                alert('동아리 이름, 시작일, 마감일은 필수 입력 사항입니다.'); 
                return; 
            }

            if(new Date(startDateInput) > new Date(endDateInput)) {
                alert('마감일은 시작일보다 빠를 수 없습니다.');
                return;
            }

            const startObj = new Date(startDateInput);
            const endObj = new Date(endDateInput);
            const period = `${startObj.getMonth()+1}월 ${startObj.getDate()}일 ~ ${endObj.getMonth()+1}월 ${endObj.getDate()}일`;

            noticesData.push({ id: generateUUID(), clubName, deadline: endDateInput, period, description, link, createdAt: new Date().toISOString() });
            saveNotices(); 
            renderNotices(document.getElementById('notice-search-input') ? document.getElementById('notice-search-input').value : '');
            
            document.getElementById('notice-club-name').value = '';
            document.getElementById('notice-start-date').value = '';
            document.getElementById('notice-end-date').value = '';
            document.getElementById('notice-desc').value = '';
            document.getElementById('notice-link').value = '';
            
            if(modals.notice) modals.notice.style.display = 'none';
        };
    }

    // [구글 로그인 처리]
    function decodeJwtResponse(token) {
        try {
            let base64Url = token.split('.')[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    window.handleGoogleLogin = (response) => {
        const payload = decodeJwtResponse(response.credential);
        if(!payload) return alert("오류가 발생했습니다. 다시 로그인해주세요.");
        const email = payload.email;
        const userName = payload.name;
        
        // 학교 도메인 체크
        if (email.toLowerCase().endsWith("@pess.cnehs.kr")) {
            isLoggedIn = true;
            if(modals.login) modals.login.style.display = 'none';
            const userAvatarText = userName.charAt(0).toUpperCase();
            if(document.getElementById('user-profile')) document.getElementById('user-profile').style.display = 'flex';
            if(document.getElementById('open-login-btn')) document.getElementById('open-login-btn').style.display = 'none';
            if(document.getElementById('user-name')) document.getElementById('user-name').textContent = userName;
            if(document.getElementById('user-avatar-text')) document.getElementById('user-avatar-text').textContent = userAvatarText;
            
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userName', userName);

            // 관리자 여부 확인 후 메뉴 표시
            if (ADMIN_EMAILS.includes(email.toLowerCase())) {
                document.body.classList.add('admin-active');
                if(menus.admin) menus.admin.style.display = 'flex';
                if(menus.aiAdmin) menus.aiAdmin.style.display = 'flex';
                if(document.getElementById('dev-panel')) document.getElementById('dev-panel').style.display = 'block';
                if(document.getElementById('search-view-add-club-btn')) document.getElementById('search-view-add-club-btn').style.display = 'block';
                if(document.getElementById('notice-view-add-btn')) document.getElementById('notice-view-add-btn').style.display = 'block';
                renderClubs(document.getElementById('main-search-input') ? document.getElementById('main-search-input').value : '');
                renderNotices(document.getElementById('notice-search-input') ? document.getElementById('notice-search-input').value : '');
            }
        } else {
            isLoggedIn = false;
            alert("학교 공식 이메일 계정(@pess.cnehs.kr)으로만 로그인할 수 있습니다.\n(지원하기 및 AI 추천 기능이 제한됩니다.)");
        }
        
        // Firebase Auth 연동
        const credential = GoogleAuthProvider.credential(response.credential);
        signInWithCredential(auth, credential)
            .then((result) => {
                console.log("파이어베이스 데이터베이스 접근 권한 획득 성공!");
            })
            .catch((error) => {
                console.error("파이어베이스 권한 획득 실패:", error);
            });
    };

    // 로그아웃 처리
    if(document.getElementById('logout-btn')) {
        document.getElementById('logout-btn').onclick = () => {
            if (confirm('로그아웃하시겠습니까?')) {
                isLoggedIn = false;
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                if(document.getElementById('user-profile')) document.getElementById('user-profile').style.display = 'none';
                if(document.getElementById('open-login-btn')) document.getElementById('open-login-btn').style.display = 'block';
                document.body.classList.remove('admin-active');
                if(menus.admin) menus.admin.style.display = 'none';
                if(menus.aiAdmin) menus.aiAdmin.style.display = 'none';
                if(document.getElementById('dev-panel')) document.getElementById('dev-panel').style.display = 'none';
                if(document.getElementById('search-view-add-club-btn')) document.getElementById('search-view-add-club-btn').style.display = 'none';
                if(document.getElementById('notice-view-add-btn')) document.getElementById('notice-view-add-btn').style.display = 'none';
                showPage('home');
            }
        };
    }

    // 페이지 로드 시 자동 로그인 확인
    const savedEmail = localStorage.getItem('userEmail');
    const savedName = localStorage.getItem('userName');
    if (savedEmail && savedName && savedEmail.toLowerCase().endsWith("@pess.cnehs.kr")) {
        isLoggedIn = true;
        const userAvatarText = savedName.charAt(0).toUpperCase();
        if(document.getElementById('user-profile')) document.getElementById('user-profile').style.display = 'flex';
        if(document.getElementById('open-login-btn')) document.getElementById('open-login-btn').style.display = 'none';
        if(document.getElementById('user-name')) document.getElementById('user-name').textContent = savedName;
        if(document.getElementById('user-avatar-text')) document.getElementById('user-avatar-text').textContent = userAvatarText;

        if (ADMIN_EMAILS.includes(savedEmail.toLowerCase())) {
            document.body.classList.add('admin-active');
            if(menus.admin) menus.admin.style.display = 'flex';
            if(menus.aiAdmin) menus.aiAdmin.style.display = 'flex';
            if(document.getElementById('dev-panel')) document.getElementById('dev-panel').style.display = 'block';
            if(document.getElementById('search-view-add-club-btn')) document.getElementById('search-view-add-club-btn').style.display = 'block';
            if(document.getElementById('notice-view-add-btn')) document.getElementById('notice-view-add-btn').style.display = 'block';
        }
    }

    // Google Identity Services 초기화
    setTimeout(() => {
        if (window.google) {
            google.accounts.id.initialize({
                client_id: "430889156958-9r75u9g9r5ihi9jo6f0265djvb8kf84m.apps.googleusercontent.com",
                callback: window.handleGoogleLogin
            });
            if(document.getElementById("google-login-btn-container")) {
                google.accounts.id.renderButton(
                    document.getElementById("google-login-btn-container"),
                    { theme: "outline", size: "large", width: 280, text: "signin_with" }
                );
            }
        }
    }, 500);

    // [이벤트 바인딩 모음]
    const bindEvent = (id, action) => {
        const el = document.getElementById(id);
        if(el) el.onclick = action;
    };

    bindEvent('open-login-btn', () => { if(modals.login) modals.login.style.display = 'flex'; });
    bindEvent('close-modal', () => { if(modals.login) modals.login.style.display = 'none'; });
    
    bindEvent('notice-view-add-btn', () => { if(modals.notice) modals.notice.style.display = 'flex'; });
    bindEvent('close-notice-modal', () => { if(modals.notice) modals.notice.style.display = 'none'; });
    bindEvent('close-club-modal', () => { if(modals.club) modals.club.style.display = 'none'; });
    
    bindEvent('open-question-modal-btn', () => openQuestionModal(null));
    bindEvent('close-question-modal', () => { if(modals.question) modals.question.style.display = 'none'; });

    bindEvent('search-view-add-club-btn', () => openClubModal());
    bindEvent('quick-add-club', () => openClubModal());
    bindEvent('quick-add-notice', () => { if(modals.notice) modals.notice.style.display = 'flex'; });

    if(menus.home) menus.home.onclick = () => showPage('home');
    if(menus.search) menus.search.onclick = () => showPage('search');
    if(menus.notice) menus.notice.onclick = () => showPage('notice');
    if(menus.admin) menus.admin.onclick = () => showPage('admin');
    if(menus.aiAdmin) menus.aiAdmin.onclick = () => showPage('aiAdmin');
    
    // [AI 추천 기능 로직] // goat
    bindEvent('view-recommend-banner', () => {
        if (!isLoggedIn) {
            alert("나의 성향을 정확히 분석하기 위해 먼저 학교 공식 계정으로 로그인해주세요!");
            if(modals.login) modals.login.style.display = 'flex';
            return;
        }

        // 전체 질문 중 무작위 15개 선정
        const shuffled = [...questionsData].sort(() => 0.5 - Math.random());
        currentQuizQuestions = shuffled.slice(0, 15);
        
        if(currentQuizQuestions.length === 0) {
            alert("등록된 추천 질문이 없습니다. 관리자에게 문의하세요.");
            return;
        }

        const container = document.getElementById('quiz-container');
        if(container) {
            container.innerHTML = currentQuizQuestions.map((q, idx) => `
                <div class="quiz-item" style="margin-bottom: 25px; padding: 15px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg);">
                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 15px; color: var(--text);">Q${idx + 1}. ${escapeHTML(q.text)}</div>
                    <div class="quiz-scale">
                        <label><input type="radio" name="q_${q.id}" value="1"> <span>매우 아니다 (1)</span></label>
                        <label><input type="radio" name="q_${q.id}" value="2"> <span>(2)</span></label>
                        <label><input type="radio" name="q_${q.id}" value="3"> <span>보통 (3)</span></label>
                        <label><input type="radio" name="q_${q.id}" value="4"> <span>(4)</span></label>
                        <label><input type="radio" name="q_${q.id}" value="5"> <span>매우 그렇다 (5)</span></label>
                    </div>
                </div>
            `).join('');
        }
        
        if(document.getElementById('recommend-result')) document.getElementById('recommend-result').style.display = 'none';
        if(document.getElementById('quiz-container')) document.getElementById('quiz-container').style.display = 'block';
        if(document.getElementById('quiz-actions')) document.getElementById('quiz-actions').style.display = 'flex';
        
        if(modals.recommend) modals.recommend.style.display = 'flex';
    });

    // 추천 분석 알고리즘
    bindEvent('get-recommend-btn', () => {
        const scores = {}; 
        const counts = {}; 
        let isAllAnswered = true;

        currentQuizQuestions.forEach(q => {
            const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
            if (!selected) {
                isAllAnswered = false;
            } else {
                const val = parseInt(selected.value);
                const cats = Array.isArray(q.category) ? q.category : [q.category];
                cats.forEach(cat => {
                    scores[cat] = (scores[cat] || 0) + val;
                    counts[cat] = (counts[cat] || 0) + 1;
                });
            }
        });

        if (!isAllAnswered) {
            alert("정확한 분석을 위해 15개의 질문에 모두 답해주세요!");
            return;
        }

        // 평균 점수가 가장 높은 카테고리 선정
        let topCategory = "";
        let maxAvg = -1;
        
        for (let cat in scores) {
            let avg = scores[cat] / counts[cat];
            if (avg > maxAvg) {
                maxAvg = avg;
                topCategory = cat;
            }
        }

        // 기본값 처리
        if (maxAvg <= 3) {
            topCategory = "환경";
        }

        let recommendedClubs = clubsData.filter(c => {
            const cCats = Array.isArray(c.category) ? c.category : [c.category];
            return cCats.includes(topCategory);
        });
        
        if (recommendedClubs.length === 0 && topCategory !== "환경") {
            topCategory = "환경";
            recommendedClubs = clubsData.filter(c => {
                const cCats = Array.isArray(c.category) ? c.category : [c.category];
                return cCats.includes("환경");
            });
        }

        // 결과 화면 구성
        const resultDiv = document.getElementById('recommend-result');
        if(resultDiv) {
            resultDiv.innerHTML = `
                <h4 style="font-size: 20px; font-weight: 900; color: #2563eb; margin-bottom: 15px;">🎉 분석 완료!</h4>
                <p style="margin-bottom: 20px; line-height: 1.5;">당신의 성향을 분석한 결과, <strong style="color:var(--accent);">${escapeHTML(topCategory)}</strong> 분야가 가장 잘 맞습니다!<br>관련하여 아래 동아리들을 적극 추천해 드립니다.</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${recommendedClubs.length > 0 ? recommendedClubs.map(c => `
                        <div style="padding: 15px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; border-left: 4px solid #2563eb; cursor: pointer;" onclick="window.openClubDetailModal('${c.id}')">
                            <div style="font-weight: 800; font-size: 15px; margin-bottom: 5px;">${escapeHTML(c.name)}</div>
                            <div style="font-size: 13px; color: var(--gray); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(c.intro)}</div>
                        </div>
                    `).join('') : '<p style="color:var(--gray); font-size:14px;">해당 분야에 등록된 동아리가 아직 없습니다.</p>'}
                </div>
            `;
        }
        
        if(document.getElementById('quiz-container')) document.getElementById('quiz-container').style.display = 'none';
        if(document.getElementById('quiz-actions')) document.getElementById('quiz-actions').style.display = 'none';
        if(resultDiv) resultDiv.style.display = 'block';
    });

    const closeRecommendAction = () => { 
        if(confirm("진행을 취소하시겠습니까? (결과 및 선택한 내용은 저장되지 않습니다.)")) {
            if(modals.recommend) modals.recommend.style.display = 'none'; 
        }
    };
    bindEvent('close-recommend-modal', closeRecommendAction);
    bindEvent('close-recommend-modal-x', closeRecommendAction);

    // [테마 토글]
    bindEvent('theme-toggle', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');

    // [검색창 통합 핸들러]
    const handleSearch = (inputEl) => {
        if(!inputEl) return;
        const val = inputEl.value;
        const mainInput = document.getElementById('main-search-input');
        if(mainInput) mainInput.value = val;
        showPage('search');
        renderClubs(val);
    };

    bindEvent('home-search-btn', () => handleSearch(document.getElementById('home-search-input')));
    const homeInput = document.getElementById('home-search-input');
    if(homeInput) homeInput.onkeypress = (e) => { if(e.key === 'Enter') handleSearch(e.target); };
    
    const mainInput = document.getElementById('main-search-input');
    if(mainInput) mainInput.oninput = (e) => renderClubs(e.target.value);

    const noticeSearchInput = document.getElementById('notice-search-input');
    if(noticeSearchInput) {
        noticeSearchInput.oninput = (e) => renderNotices(e.target.value);
    }

    // [관리자 통계 업데이트]
    function updateAdminDashboard() {
        if(document.getElementById('total-clubs')) document.getElementById('total-clubs').textContent = clubsData.length;
        if(document.getElementById('total-notices')) document.getElementById('total-notices').textContent = noticesData.length;
        const savedName = localStorage.getItem('userName');
        if(document.getElementById('logged-in-user')) document.getElementById('logged-in-user').textContent = savedName || '-';
    }

    // [데이터 관리 도구]
    bindEvent('reset-data-btn', () => {
        if (confirm('모든 데이터를 초기화하시겠습니까? (Firebase 데이터도 덮어씁니다)')) {
            clubsData = [...defaultClubs]; noticesData = [];
            categoriesData = JSON.parse(JSON.stringify(defaultCategories)); 
            questionsData = [...defaultQuestions];
            saveClubs(); saveNotices(); saveCategories(); saveQuestions();
            renderDynamicUI(); updateAdminDashboard();
            alert('데이터가 초기화되었습니다.');
        }
    });

    bindEvent('export-data-btn', () => {
        const data = { clubs: clubsData, notices: noticesData, categories: categoriesData, questions: questionsData };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `clink-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url);
    });

    bindEvent('import-data-btn', () => {
        const fileInput = document.getElementById('import-file');
        if(fileInput) fileInput.click();
    });

    const fileInput = document.getElementById('import-file');
    if(fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    clubsData = data.clubs || clubsData; noticesData = data.notices || noticesData;
                    categoriesData = data.categories || categoriesData;
                    questionsData = data.questions || questionsData;
                    saveClubs(); saveNotices(); saveCategories(); saveQuestions();
                    alert('데이터를 성공적으로 가져왔습니다.'); location.reload();
                } catch (error) { alert('파일 읽기 오류'); }
            };
            reader.readAsText(file);
        };
    }

    // 초기 화면 실행
    showPage('home');
    await fetchInitialData();
});