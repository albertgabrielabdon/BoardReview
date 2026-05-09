

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

const initStatsPlugin = () => {
    if (typeof UI !== 'undefined' && UI.handleAnswer) {
        console.log("Stats Plugin: UI detected, patching...");
        if (UI.handleAnswer.isPatched) return;

        const _origHandleAnswer = UI.handleAnswer.bind(UI);
        UI.handleAnswer = function(btn, selected, correct) {
            if (quizState.currentQuestions[quizState.currentIndex]) {
                quizState.currentQuestions[quizState.currentIndex].userSelectedAnswer = selected;
            }
            _origHandleAnswer(btn, selected, correct);
        };
        UI.handleAnswer.isPatched = true;
        console.log("Stats Plugin: UI.handleAnswer patched successfully.");
    } else {
        setTimeout(initStatsPlugin, 50);
    }
};

initStatsPlugin();
