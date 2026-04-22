document.addEventListener('DOMContentLoaded', () => {
    const summaryEl = document.getElementById('summary-text');
    const updateDateEl = document.getElementById('update-date');
    const grid = document.getElementById('trends-grid');
    const archiveSection = document.getElementById('archive-section');

    const sentimentMap = {
        hot:      { emoji: '🔥', label: '지금 난리남' },
        growing:  { emoji: '📈', label: '상승세' },
        new:      { emoji: '✨', label: '신상' },
        positive: { emoji: '👍', label: '호평' }
    };

    function buildCards(trends) {
        return trends.map((trend, index) => {
            const s = sentimentMap[trend.sentiment] || { emoji: '🍽️', label: trend.sentiment };
            const keywordsHTML = (trend.keywords || [])
                .map(kw => `<span class="keyword">#${kw}</span>`)
                .join('');

            let naverBadge = '';
            if (trend.naver_trend) {
                const arrow = trend.naver_trend.is_rising ? '▲ 네이버 검색 상승 중' : '▽ 네이버 검색 감소세';
                const color = trend.naver_trend.is_rising ? '#B3E2A7' : '#FFD6D6';
                naverBadge = `<span class="sentiment" style="background:${color}; margin-left:8px;">${arrow}</span>`;
            }

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
                        <a href="${trend.source_video}" target="_blank" class="source-btn">
                            ▶ 유튜브에서 확인하기
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    try {
        const data = trendData;

        if (data.error) {
            summaryEl.textContent = `오류: ${data.error}`;
            return;
        }

        // weeks 배열 기준으로 렌더링
        const weeks = data.weeks || [];
        if (weeks.length === 0) return;

        // 최신 주차 = 배열의 마지막 항목
        const currentWeek = weeks[weeks.length - 1];
        const pastWeeks = weeks.slice(0, weeks.length - 1).reverse(); // 최신순

        // 금주 트렌드 렌더링
        if (updateDateEl) updateDateEl.textContent = currentWeek.week_label || currentWeek.updated_at;
        if (summaryEl) summaryEl.textContent = currentWeek.summary || '';
        grid.innerHTML = buildCards(currentWeek.trends);

        // 지난 주차 아코디언 렌더링
        if (pastWeeks.length === 0) {
            archiveSection.style.display = 'none';
            return;
        }

        archiveSection.style.display = 'block';
        const archiveContainer = document.getElementById('archive-container');
        archiveContainer.innerHTML = pastWeeks.map((week, i) => `
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

    } catch (error) {
        console.error('Error loading trend data:', error);
        if (summaryEl) summaryEl.textContent = '트렌드 데이터를 불러오는 데 실패했습니다.';
    }
});

function toggleAccordion(btn) {
    const content = btn.nextElementSibling;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    btn.setAttribute('aria-expanded', !isOpen);
    btn.classList.toggle('open', !isOpen);
    if (isOpen) {
        content.hidden = true;
    } else {
        content.hidden = false;
    }
}
