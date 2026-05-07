
const Icons = {
    _svg: (path, opts = {}) => {
        const { size = 16, vb = '0 0 24 24', strokeWidth = 2, cls = '' } = opts;
        return `<svg width="${size}" height="${size}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${path}</svg>`;
    },
    check:      (o) => Icons._svg(`<polyline points="20 6 9 17 4 12"/>`, o),
    x:          (o) => Icons._svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`, o),
    checkCircle:(o) => Icons._svg(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`, o),
    xCircle:    (o) => Icons._svg(`<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`, o),
    pencil:     (o) => Icons._svg(`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`, o),
    trash:      (o) => Icons._svg(`<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>`, o),
    upload:     (o) => Icons._svg(`<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>`, o),
    book:       (o) => Icons._svg(`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`, o),
    quiz:       (o) => Icons._svg(`<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`, o),
    star:       (o) => Icons._svg(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`, o),
    arrowRight: (o) => Icons._svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, o),
    search:     (o) => Icons._svg(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`, o),
    info:       (o) => Icons._svg(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`, o),
};

window.StatsManager = {
    getHistory() {
        return JSON.parse(localStorage.getItem('pink_prep_history')) || [];
    },

    saveAttempt(questions, correctCount) {
        const history = this.getHistory();
        const attempt = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            total: questions.length,
            correct: correctCount,
            percent: Math.round((correctCount / questions.length) * 100),
            details: questions.map(q => ({
                question: q.question,
                correctAnswer: q.answer,
                userAnswer: q.userSelectedAnswer || 'No Answer',
                isCorrect: q.userSelectedAnswer === q.answer,
                explanation: q.fullExplanation,
                module: q.category
            }))
        };
        history.unshift(attempt);
        localStorage.setItem('pink_prep_history', JSON.stringify(history));
    },

    renderDashboard() {
        const history = this.getHistory();
        const container = document.getElementById('dynamic-content');

        const avgScore = history.length
            ? Math.round(history.reduce((s, h) => s + h.percent, 0) / history.length)
            : 0;

        const bestScore = history.length
            ? Math.max(...history.map(h => h.percent))
            : 0;

        const totalAttempts = history.length;
        const totalQ = history.reduce((s, h) => s + h.total, 0);

        container.style.animation = 'none';
        requestAnimationFrame(() => {
            container.innerHTML = `
                <div style="animation: pageIn var(--t-slow) var(--ease-out) both;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: var(--sp-6); flex-wrap:wrap; gap: var(--sp-4);">
                        <div>
                            <h1 class="page-title">Statistics</h1>
                            <p class="page-subtitle">${totalAttempts} quiz session${totalAttempts !== 1 ? 's' : ''} recorded</p>
                        </div>
                        ${totalAttempts > 0 ? `
                            <button class="btn btn-danger btn-sm" onclick="StatsManager.deleteAll()">Delete All</button>
                        ` : ''}
                    </div>

                    <div class="stats-overview">
                        <div class="stats-kpi">
                            <div class="stats-kpi-val">${avgScore}%</div>
                            <div class="stats-kpi-lbl">Avg Score</div>
                        </div>
                        <div class="stats-kpi">
                            <div class="stats-kpi-val">${bestScore}%</div>
                            <div class="stats-kpi-lbl">Best Score</div>
                        </div>
                        <div class="stats-kpi">
                            <div class="stats-kpi-val">${totalAttempts}</div>
                            <div class="stats-kpi-lbl">Sessions</div>
                        </div>
                        <div class="stats-kpi">
                            <div class="stats-kpi-val">${totalQ}</div>
                            <div class="stats-kpi-lbl">Questions Taken</div>
                        </div>
                    </div>

                    <div class="attempt-list">
                        ${history.length === 0
                            ? `<div class="empty-state">
                                <div class="empty-state-icon"></div>
                                <div class="empty-state-title">No attempts yet</div>
                                <div class="empty-state-sub">Complete a quiz to see your results here</div>
                               </div>`
                            : history.map(run => this._attemptCard(run)).join('')
                        }
                    </div>
                </div>
            `;
            container.style.animation = '';
        });
    },

    _attemptCard(run) {
        const circ = 2 * Math.PI * 22;
        const offset = circ - (run.percent / 100) * circ;
        const mistakes = run.details.filter(d => !d.isCorrect).length;
        const module = run.details[0]?.module || '—';

        return `
            <div class="attempt-card">
                <div class="attempt-score-ring">
                    <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="25" cy="25" r="22" fill="none" stroke="var(--rose-100)" stroke-width="4"/>
                        <circle cx="25" cy="25" r="22" fill="none"
                            stroke="var(--rose-500)" stroke-width="4"
                            stroke-linecap="round"
                            stroke-dasharray="${circ.toFixed(1)}"
                            stroke-dashoffset="${offset.toFixed(1)}"/>
                    </svg>
                    <div class="attempt-pct">${run.percent}%</div>
                </div>

                <div class="attempt-info">
                    <div class="attempt-date">${run.date}</div>
                    <div class="attempt-meta">${run.correct}/${run.total} correct · ${module}${mistakes > 0 ? ` · ${mistakes} mistake${mistakes !== 1 ? 's' : ''}` : ''}</div>
                </div>

                <div class="attempt-actions">
                    <button class="btn btn-secondary btn-sm" onclick="StatsManager.showDetails(${run.id})">Review</button>
                    <button class="btn-icon" onclick="StatsManager.deleteSingle(${run.id})" title="Delete">${Icons.trash({ size: 15 })}</button>
                </div>
            </div>
        `;
    },

    showDetails(id) {
        const run = this.getHistory().find(r => r.id === id);
        const mistakes = run.details.filter(d => !d.isCorrect);
        const container = document.getElementById('dynamic-content');

        container.innerHTML = `
            <div style="animation: pageIn var(--t-slow) var(--ease-out) both;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-6); flex-wrap:wrap; gap: var(--sp-3);">
                    <div>
                        <button class="btn btn-ghost btn-sm" onclick="StatsManager.renderDashboard()" style="margin-bottom: var(--sp-2);">← Back</button>
                        <h1 class="page-title" style="margin-bottom: var(--sp-1)">Session Review</h1>
                        <p class="page-subtitle" style="margin-bottom:0">${run.date} · ${run.percent}% · ${run.correct}/${run.total}</p>
                    </div>
                    ${mistakes.length > 0 ? `
                        <button class="btn btn-primary" onclick="StatsManager.quizFromMistakes(${id})">
                            Practice Mistakes (Feature Not Built Yet)(${mistakes.length})
                        </button>
                    ` : ''}
                </div>

                <div style="display:flex; flex-direction:column; gap: var(--sp-3);">
                    ${run.details.map(d => `
                        <div class="review-item ${d.isCorrect ? 'correct-item' : 'wrong-item'}">
                            <div class="review-status">${d.isCorrect ? Icons.checkCircle({ size: 22 }) : Icons.xCircle({ size: 22 })}</div>
                            <div class="review-q"><strong>Q:</strong> ${d.question}</div>
                            <div class="review-a">✓ ${d.correctAnswer}</div>
                            ${!d.isCorrect ? `<div class="review-yours">Your answer: ${d.userAnswer}</div>` : ''}
                            ${d.explanation ? `<div class="review-exp">${d.explanation}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    quizFromMistakes(attemptId) {
        const run = this.getHistory().find(r => r.id === attemptId);
        const mistakeTerms = run.details.filter(d => !d.isCorrect).map(m => m.correctAnswer);
        const filteredPool = DB.questions.filter(q => mistakeTerms.includes(q.answer));

        UI.setActiveNav('quiz');
        setTimeout(() => UI.prepareQuiz(999, filteredPool), 50);
    },

    deleteSingle(id) {
        if (!confirm('Delete this record?')) return;
        const history = this.getHistory().filter(r => r.id !== id);
        localStorage.setItem('pink_prep_history', JSON.stringify(history));
        this.renderDashboard();
    },

    deleteAll() {
        if (!confirm('Erase all quiz history? This cannot be undone.')) return;
        localStorage.removeItem('pink_prep_history');
        this.renderDashboard();
    }
};

const _origHandleAnswer = UI.handleAnswer.bind(UI);
UI.handleAnswer = function(btn, selected, correct) {
    if (quizState.currentQuestions[quizState.currentIndex]) {
        quizState.currentQuestions[quizState.currentIndex].userSelectedAnswer = selected;
    }
    _origHandleAnswer(btn, selected, correct);
};
