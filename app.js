document.addEventListener('DOMContentLoaded', async () => {
    const summaryEl = document.getElementById('summary-text');
    const updateDateEl = document.getElementById('update-date');
    const grid = document.getElementById('trends-grid');

    const sentimentMap = {
        hot:      { emoji: '🔥', label: '지금 난리남' },
        growing:  { emoji: '📈', label: '상승세' },
        new:      { emoji: '✨', label: '신상' },
        positive: { emoji: '👍', label: '호평' }
    };

    function buildCards(trends) {
        return trends.map((trend, index) => {
            const s = sentimentMap[trend.sentiment] || { emoji: '💡', label: trend.sentiment };
            const keywordsHTML = (trend.keywords || [])
                .map(kw => `<span class="keyword">#${kw}</span>`)
                .join('');

            let naverBadge = '';
            if (trend.naver_trend) {
                const arrow = trend.naver_trend.is_rising ? '▲ 네이버 검색 상승' : '▽ 네이버 검색 감소';
                const color = trend.naver_trend.is_rising ? '#B3E2A7' : '#FFD6D6';
                naverBadge = `<span class="sentiment" style="background:${color};">${arrow}</span>`;
            }

            const linkUrl = trend.source_link || trend.source_video || '#';
            const linkName = trend.source_name || '출처';

            return `
                <div class="trend-card card-${index + 1}">
                    <div class="trend-number">${index + 1}</div>
                    <div class="card-content">
                        <div class="trend-header">
                            <span class="sentiment ${trend.sentiment}">${s.emoji} ${s.label}</span>
                            ${naverBadge}
                        </div>
                        <h3 class="trend-title">${trend.title}</h3>
                        <p class="trend-desc">${trend.description}</p>
                        <div class="keywords">${keywordsHTML}</div>
                        <a href="${linkUrl}" class="source-btn" target="_blank">${linkName} 확인하기</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    try {
        const data = typeof trendData !== 'undefined' ? trendData : {};

        if (data.error) {
            if (summaryEl) summaryEl.textContent = `오류: ${data.error}`;
            return;
        }

        const weeks = data.weeks || [];
        if (weeks.length === 0) return;

        // 최신 주차 = 배열의 마지막
        const currentWeek = weeks[weeks.length - 1];
        const pastWeeks = weeks.slice(0, weeks.length - 1).reverse(); // 최신순 정렬

        // 금주 트렌드 렌더링
        if (updateDateEl) updateDateEl.textContent = currentWeek.week_label || currentWeek.updated_at;
        if (summaryEl) summaryEl.textContent = currentWeek.summary || '';
        if (grid) grid.innerHTML = buildCards(currentWeek.trends);

        // 지난 주차 아코디언 렌더링
        const archiveSection = document.getElementById('archive-section');
        const archiveContainer = document.getElementById('archive-container');

        if (pastWeeks.length === 0) {
            if (archiveSection) archiveSection.style.display = 'none';
        } else {
            if (archiveSection) archiveSection.style.display = 'block';
            if (archiveContainer) {
                archiveContainer.innerHTML = pastWeeks.map((week) => `
                    <div class="accordion-item">
                        <button class="accordion-btn" aria-expanded="false" onclick="toggleAccordion(this)">
                            <span class="accordion-label">📅 ${week.week_label}</span>
                            <span class="accordion-summary">${week.summary.slice(0, 40)}…</span>
                            <span class="accordion-arrow">▼</span>
                        </button>
                        <div class="accordion-content" hidden>
                            <p class="archive-summary-text">${week.summary}</p>
                            <div class="archive-grid">${buildCards(week.trends)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (error) {
        console.error('Error loading trend data:', error);
        if (summaryEl) summaryEl.textContent = '트렌드 데이터를 불러오는 데 실패했습니다.';
    }

    // 🔥 불꽃 파티클 버튼 + Firebase 누적 카운트
    const fireBtn = document.getElementById('fire-btn');
    if (!fireBtn) return;

    let localCount = 0;
    fireBtn.textContent = `도움되었다면 🔥를 눌러주세요 (...)`;

    const triggerParticle = (button) => {
        const container = button.parentElement;
        const particleCount = Math.floor(Math.random() * 5) + 8;
        const emojis = ['🔥', '🔥', '🔥', '✨', '💥', '🧡'];

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            particle.style.cssText = 'animation:none;position:absolute;left:calc(50% - 15px);top:10px;pointer-events:none;z-index:5;font-size:1.8rem;';
            container.appendChild(particle);

            const tx = (Math.random() - 0.5) * 300;
            const ty = (Math.random() * -140) - 80;
            const rot = (Math.random() - 0.5) * 180;
            const endScale = Math.random() * 1.4 + 0.8;
            const duration = Math.random() * 600 + 600;

            particle.animate([
                { transform: 'translate(0, 0) scale(0.5) rotate(0deg)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(${endScale}) rotate(${rot}deg)`, opacity: 0 }
            ], { duration, easing: 'cubic-bezier(0, 0.9, 0.5, 1)', fill: 'forwards' });

            setTimeout(() => particle.remove(), duration);
        }
    };

    let updateDbCount = null;

    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const { getFirestore, doc, onSnapshot, setDoc, updateDoc, increment, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyBOpIpRMPEj27XieFl2bzzLRtdlPlRLNZU",
            authDomain: "fnb-trend-db.firebaseapp.com",
            projectId: "fnb-trend-db",
            storageBucket: "fnb-trend-db.firebasestorage.app",
            messagingSenderId: "1092465751942",
            appId: "1:1092465751942:web:28836a7613f6ffb9a85e07",
            measurementId: "G-HK9022ZPN8"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const dbRef = doc(db, 'reactions', 'fire');

        const docSnap = await getDoc(dbRef);
        if (!docSnap.exists()) await setDoc(dbRef, { count: 0 });

        onSnapshot(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                localCount = snapshot.data().count || 0;
                fireBtn.textContent = `도움되었다면 🔥를 눌러주세요 (${localCount})`;
            }
        }, (error) => console.error("Firestore 감지 에러:", error));

        updateDbCount = async () => {
            await updateDoc(dbRef, { count: increment(1) });
        };
    } catch (e) {
        console.error("데이터베이스 초기화 에러:", e);
        fireBtn.textContent = `도움되었다면 🔥를 눌러주세요 (0)`;
    }

    fireBtn.addEventListener('click', function() {
        triggerParticle(this);
        localCount++;
        this.textContent = `도움되었다면 🔥를 눌러주세요 (${localCount})`;
        if (updateDbCount) updateDbCount().catch(err => console.error("카운트 업데이트 실패:", err));
    });
});

function toggleAccordion(btn) {
    const content = btn.nextElementSibling;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isOpen);
    btn.classList.toggle('open', !isOpen);
    content.hidden = isOpen;
}
