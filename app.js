
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

let DB = JSON.parse(localStorage.getItem('pink_prep_db')) || {
    modules: [],
    questions: [],
    stats: { xp: 0, correct: 0, wrong: 0 }
};

let quizState = {
    currentQuestions: [],
    currentIndex: 0,
    sessionCorrect: 0,
    sessionWrong: 0,
    isAnswered: false,
    isActive: false
};

const Utils = {
    debounce(fn, ms = 200) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    },

    saveDB() {
        localStorage.setItem('pink_prep_db', JSON.stringify(DB));
    },

    toast(msg, type = 'info', duration = 2800) {
        const tc = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        tc.appendChild(el);
        setTimeout(() => {
            el.style.animation = 'toastOut 250ms ease forwards';
            setTimeout(() => el.remove(), 250);
        }, duration);
    },

    confirm(msg) {
        return window.confirm(msg);
    },

    // Confetti for high scores
    confetti(count = 60) {
        const colors = ['#f43f7f', '#fb7185', '#fda4bc', '#fde68a', '#86efac', '#93c5fd'];
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'confetti-piece';
            el.style.cssText = `
                left: ${Math.random() * 100}vw;
                top: ${Math.random() * -20}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                animation-duration: ${1.5 + Math.random() * 2}s;
                animation-delay: ${Math.random() * 0.8}s;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3500);
        }
    }
};

const SemanticEngine = {
    archetypes: [
        {
            id: 'definition_inverse',
            generate: (c) => ({
                q: `Which concept is described by: "${c.definition}"?`,
                a: c.term,
                type: 'Easy'
            })
        },
        {
            id: 'cloze_deletion',
            generate: (c) => {
                const escaped = c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const cloze = c.definition.replace(new RegExp(escaped, 'gi'), '__________');
                return { q: `Fill in the blank: "${cloze}"`, a: c.term, type: 'Medium' };
            }
        },
        {
            id: 'scenario_base',
            generate: (c) => ({
                q: `In the context of ${c.category}, a phenomenon described as "${c.definition}" refers to which concept?`,
                a: c.term,
                type: 'Hard'
            })
        }
    ],

    buildGraph(pool) {
        return pool.map(item => {
            let def = item.explanation.replace(/^According to .*?, /i, '');
            if (def.includes('defined as:')) def = def.split('defined as:')[1];
            const escaped = item.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            def = def.replace(new RegExp(escaped, 'gi'), '__________');
            return {
                term: item.answer,
                definition: def.trim(),
                fullExplanation: item.explanation,
                category: item.module || 'General',
                source: item.sourceFile || 'Manual Entry'
            };
        });
    },

    getSemanticDistractors(correctAnswer, graph, count = 3) {
        const target = correctAnswer.toLowerCase();
        return graph
            .filter(c => c.term.toLowerCase() !== target)
            .map(c => {
                let score = 0;
                target.split(' ').forEach(w => {
                    if (w.length > 3 && c.term.toLowerCase().includes(w)) score += 20;
                });
                return { text: c.term, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .sort(() => 0.5 - Math.random())
            .slice(0, count)
            .map(i => i.text);
    }
};

const Extractor = {
    async handleFileUpload(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return this.parsePsycContent(result.value, file.name);
        } catch { return null; }
    },

    parsePsycContent(text, fileName) {
        const moduleTitle = fileName.replace('.docx', '');
        const questions = text
            .split('\n')
            .filter(l => l.trim().length > 0 && l.includes(':'))
            .map(line => {
                const parts = line.split(':');
                const term = parts[0].trim();
                const definition = parts.slice(1).join(':').trim();
                return (term.length > 1 && definition.length > 2)
                    ? { answer: term, explanation: definition, module: moduleTitle, sourceFile: fileName }
                    : null;
            })
            .filter(Boolean);
        return { title: moduleTitle, questions };
    }
};

const Render = {
    setContent(html) {
        const el = document.getElementById('dynamic-content');
        el.style.animation = 'none';
        requestAnimationFrame(() => {
            el.innerHTML = html;
            el.style.animation = 'pageIn var(--t-slow) var(--ease-out) both';
        });
    },

    pageHeader(title, subtitle = '') {
        return `
            <div style="margin-bottom: var(--sp-6)">
                <h1 class="page-title">${title}</h1>
                ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
            </div>
        `;
    }
};

window.UI = {
    searchScope: 'both',

    init() {
        this.bindNav();
        this.bindMobile();
        this.updateSidebarStats();
        this.route('home');
    },

    bindNav() {
        document.getElementById('nav-list').addEventListener('click', (e) => {
            const li = e.target.closest('.nav-item');
            if (!li) return;

            if (quizState.isActive) {
                if (!Utils.confirm('Quiz in progress! Leaving will end the session and mark remaining as wrong. Proceed?')) return;
                this.forceEndQuiz(false);
            }

            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            this.route(li.getAttribute('data-page'));

            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('open');
        });
    },

    bindMobile() {
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    },

    route(page) {
        const container = document.getElementById('dynamic-content');
        container.innerHTML = ""; 
        if (page === 'home') this.renderHome(); 
        if (page === 'quiz') this.renderQuizSetup();
        if (page === 'flashcards') this.renderLibraryEditor();
        if (page === 'stats' && window.StatsManager) window.StatsManager.renderDashboard();
    },

    setActiveNav(page) {
        document.querySelectorAll('.nav-item').forEach(li => {
            li.classList.toggle('active', li.getAttribute('data-page') === page);
        });
    },

    renderHome() {
       
        const moduleGroups = DB.questions.reduce((acc, q) => {
            acc[q.module] = (acc[q.module] || 0) + 1;
            return acc;
        }, {});
    
        const hasModules = DB.questions.length > 0;
        
        const avgScore = (() => {
            const hist = JSON.parse(localStorage.getItem('pink_prep_history')) || [];
            if (!hist.length) return '—';
            return Math.round(hist.reduce((s, h) => s + h.percent, 0) / hist.length) + '%';
        })();
    
        const container = document.getElementById('dynamic-content');
        container.innerHTML = `
            <div class="home-hero fade-in">
                <h1 class="home-hero-title">Welcome back,<br><em>Leanne</em></h1>
                <p class="home-hero-subtitle">Your road to top 1 and free Korea or Hong Kong trip! Library size: <b>${DB.questions.length}</b> concepts.</p>
    
                <div class="home-stats-row">
                    <div class="home-stat">
                        <div class="home-stat-val">${DB.questions.length}</div>
                        <div class="home-stat-lbl">Items</div>
                    </div>
                    <div class="home-stat">
                        <div class="home-stat-val">${Object.keys(moduleGroups).length}</div>
                        <div class="home-stat-lbl">Modules</div>
                    </div>
                    <div class="home-stat">
                        <div class="home-stat-val">${DB.stats.correct}</div>
                        <div class="home-stat-lbl">Total Correct</div>
                    </div>
                    <div class="home-stat">
                        <div class="home-stat-val">${avgScore}</div>
                        <div class="home-stat-lbl">Avg Score</div>
                    </div>
                </div>
    
                <div class="home-actions" style="display:flex; gap:12px; justify-content:center; margin-top:25px;">
                    <label class="btn btn-primary" style="cursor:pointer;">
                        ${Icons.upload({ size: 15 })} Upload Modules
                        <input type="file" id="file-input" hidden multiple accept=".docx">
                    </label>
                    ${hasModules ? `<button class="btn btn-secondary" onclick="UI.route('quiz')">${Icons.quiz({ size: 15 })} Practice Quiz</button>` : ''}
                    <button class="btn btn-ghost" onclick="UI.clearDatabase()" style="opacity:0.6; font-size:0.8rem;">Reset All</button>
                </div>
            </div>
    
            ${hasModules ? `
                <div style="margin-top: 40px;">
                    <div class="setup-section-title" style="margin-bottom:15px; font-weight:bold; color:var(--rose-600);">Active Modules</div>
                    <div class="modules-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:15px;">
                        ${Object.entries(moduleGroups).map(([mod, count]) => `
                            <div class="module-card" style="background:white; padding:15px; border-radius:12px; border:1px solid var(--border);">
                                <div class="module-card-title" style="font-weight:600; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${mod}">${mod}</div>
                                <div class="module-card-count" style="font-size:0.85rem; color:var(--text-muted)">${count} terms</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `
                <div class="upload-zone" id="drop-zone" style="margin-top:30px; border: 2px dashed var(--primary-pink); padding: 50px; border-radius: 20px; text-align:center;">
                    <div class="upload-icon-wrap" style="font-size:3rem; margin-bottom:15px;">${Icons.upload({ size: 40 })}</div>
                    <div class="upload-title" style="font-weight:bold; font-size:1.2rem;">Your library is empty</div>
                    <p class="upload-subtitle" style="color:var(--text-muted);">Upload your .docx modules to begin.</p>
                </div>
            `}
        `;
    
        this._bindUpload();
        this.updateSidebarStats(); 
    },

    _bindUpload() {
        const input = document.getElementById('file-input');
        if (!input) return;
    
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            
            Utils.toast(`Processing ${files.length} file(s)…`, 'info');
    
            let addedCount = 0;
            for (const file of files) {
                const data = await Extractor.handleFileUpload(file);
                if (data && data.questions.length > 0) {
                    if (!DB.modules.includes(data.title)) DB.modules.push(data.title);
                    DB.questions.push(...data.questions);
                    addedCount += data.questions.length;
                }
            }
    
            Utils.saveDB();
            this.updateSidebarStats();
            Utils.toast(`Added ${addedCount} items`, 'success');
            this.renderHome(); 
        };
    },

    _bindDropZone() {
        const zone = document.getElementById('drop-zone');
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.docx'));
            if (!files.length) return Utils.toast('Please drop .docx files only', 'error');
            document.getElementById('file-input').dispatchEvent(Object.assign(new Event('change'), { target: { files } }));
        });
    },

    renderLibraryEditor() {
        const countLabel = `${DB.questions.length} item${DB.questions.length !== 1 ? 's' : ''}`;
        Render.setContent(`
            <div class="library-header">
                <div>
                    <h1 class="page-title">Library</h1>
                    <p class="page-subtitle">${countLabel} in your study bank</p>
                    <div class="search-bar-wrap">
                        <span class="search-icon"></span>
                        <input type="text" id="lib-search" placeholder="Search terms...">
                    </div>
                </div>
                <div style="display:flex; gap: var(--sp-2); align-items:center; flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="UI.addNewTerm()">+ Add</button>
                </div>
            </div>

            <div class="filter-chips" id="filter-chips">
                <span class="filter-chip active" id="tag-both" onclick="UI.setSearchScope('both')">All</span>
                <span class="filter-chip" id="tag-term" onclick="UI.setSearchScope('term')">Term</span>
                <span class="filter-chip" id="tag-def" onclick="UI.setSearchScope('def')">Definition</span>
            </div>

            <div class="library-table-wrap">
                <table class="lib-table">
                    <thead>
                        <tr>
                            <th class="col-term">Term</th>
                            <th class="col-def">Definition</th>
                            <th class="col-mod">Module</th>
                            <th class="col-act"></th>
                        </tr>
                    </thead>
                    <tbody id="lib-body">${this.generateLibraryRows(DB.questions)}</tbody>
                </table>
            </div>
        `);

        const searchFn = Utils.debounce((v) => this.filterLibrary(v), 180);
        document.getElementById('lib-search').addEventListener('input', (e) => searchFn(e.target.value));
    },

    setSearchScope(scope) {
        this.searchScope = scope;
        document.querySelectorAll('.filter-chip').forEach(t => t.classList.remove('active'));
        document.getElementById(`tag-${scope}`).classList.add('active');
        this.filterLibrary(document.getElementById('lib-search')?.value || '');
    },

    filterLibrary(query) {
        const term = query.toLowerCase();
        const filtered = DB.questions.filter(q => {
            const mt = q.answer.toLowerCase().includes(term);
            const md = q.explanation.toLowerCase().includes(term);
            if (this.searchScope === 'term') return mt;
            if (this.searchScope === 'def') return md;
            return mt || md;
        });
        document.getElementById('lib-body').innerHTML = this.generateLibraryRows(filtered);
    },

    generateLibraryRows(questions) {
        if (!questions.length) return `
            <tr><td colspan="4">
                <div class="empty-state">
                    <div class="empty-state-icon" style="display:flex; justify-content:center; color:var(--text-muted);">${Icons.book({ size: 32 })}</div>
                    <div class="empty-state-title">No items found</div>
                    <div class="empty-state-sub">Try a different search or add new terms</div>
                </div>
            </td></tr>
        `;
        return questions.map(q => {
            const idx = DB.questions.indexOf(q);
            return `
                <tr id="row-${idx}">
                    <td class="col-term"><span class="term-text">${q.answer}</span></td>
                    <td class="col-def">${q.explanation}</td>
                    <td class="col-mod"><span class="module-badge" title="${q.module}">${q.module}</span></td>
                    <td class="col-act">
                        <div class="cell-actions">
                            <button class="btn-icon" title="Edit" onclick="UI.toggleEdit(${idx})">${Icons.pencil({ size: 15 })}</button>
                            <button class="btn-icon" title="Delete" onclick="UI.deleteTerm(${idx})">${Icons.trash({ size: 15 })}</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    toggleEdit(index) {
        const row = document.getElementById(`row-${index}`);
        if (!row) return;
        const q = DB.questions[index];
        const termCell = row.cells[0];
        const defCell  = row.cells[1];

        const isEditing = termCell.querySelector('[contenteditable]');
        if (isEditing) {

            const newTerm = termCell.querySelector('[contenteditable]').innerText.trim();
            const newDef  = defCell.querySelector('[contenteditable]').innerText.trim();
            if (newTerm && newDef) {
                DB.questions[index].answer = newTerm;
                DB.questions[index].explanation = newDef;
                Utils.saveDB();
                Utils.toast('Saved', 'success', 1800);
            }
            this.renderLibraryEditor();
        } else {

            termCell.innerHTML = `<span class="term-text editing-active" contenteditable="true">${q.answer}</span>`;
            defCell.innerHTML  = `<span class="editing-active" contenteditable="true" style="display:block; min-height:1.5em;">${q.explanation}</span>`;
            termCell.querySelector('[contenteditable]').focus();
        }
    },

    addNewTerm() {
        DB.questions.unshift({ answer: 'New Term', explanation: 'New Definition', module: 'Manual', sourceFile: 'User Added' });
        Utils.saveDB();
        this.renderLibraryEditor();
        setTimeout(() => this.toggleEdit(0), 50);
    },

    deleteTerm(index) {
        if (!Utils.confirm('Delete this concept?')) return;
        DB.questions.splice(index, 1);
        Utils.saveDB();
        this.updateSidebarStats();
        this.renderLibraryEditor();
    },

    renderQuizSetup() {
        if (DB.questions.length === 0) {
            return Utils.toast('Upload modules first!', 'error');
        }

        const mods = [...new Set(DB.questions.map(q => q.module))];
        Render.setContent(`
            ${Render.pageHeader('Practice Quiz', 'Choose your modules and question count to begin')}
            <div class="card card-raised" style="max-width: 600px;">
                <div class="quiz-setup-grid">
                    <div>
                        <div class="setup-section-title">Modules</div>
                        <div class="module-checkboxes">
                            ${mods.map(m => `
                                <label class="mod-label">
                                    <input type="checkbox" value="${m}" checked class="mod-check">
                                    <span>${m}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="setup-section-title">Question Count</div>
                        <div class="limit-grid">
                            <button class="limit-btn" onclick="UI.prepareQuiz(5)">5</button>
                            <button class="limit-btn" onclick="UI.prepareQuiz(10)">10</button>
                            <button class="limit-btn" onclick="UI.prepareQuiz(20)">20</button>
                            <button class="limit-btn" onclick="UI.prepareQuiz(50)">50</button>
                            <button class="limit-btn" onclick="UI.prepareQuiz(999)">All</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    },

    prepareQuiz(limit, overridePool = null) {
        const pool = overridePool || (() => {
            const selected = Array.from(document.querySelectorAll('.mod-check:checked')).map(c => c.value);
            return DB.questions.filter(q => selected.includes(q.module));
        })();

        if (pool.length < 1) return Utils.toast('Select at least one module!', 'error');

        quizState.isActive = true;
        const graph = SemanticEngine.buildGraph(pool);
        const shuffled = [...graph].sort(() => 0.5 - Math.random()).slice(0, parseInt(limit));

        quizState.currentQuestions = shuffled.map(concept => {
            const arch = SemanticEngine.archetypes[Math.floor(Math.random() * SemanticEngine.archetypes.length)];
            const gen = arch.generate(concept);
            return {
                question: gen.q,
                answer: gen.a,
                fullExplanation: concept.fullExplanation,
                category: concept.category,
                source: concept.source,
                difficulty: gen.type,
                choices: [gen.a, ...SemanticEngine.getSemanticDistractors(gen.a, graph)].sort(() => 0.5 - Math.random())
            };
        });

        quizState.currentIndex = 0;
        quizState.sessionCorrect = 0;
        quizState.sessionWrong = 0;
        this.renderActiveQuestion();
    },

    renderActiveQuestion() {
        const q = quizState.currentQuestions[quizState.currentIndex];
        quizState.isAnswered = false;
        const total = quizState.currentQuestions.length;
        const idx = quizState.currentIndex;
        const progress = ((idx / total) * 100).toFixed(1);
        const letters = ['A', 'B', 'C', 'D'];
        const diffClass = q.difficulty === 'Hard' ? 'hard' : q.difficulty === 'Medium' ? 'medium' : '';

        Render.setContent(`
            <div class="quiz-wrapper">
                <div class="quiz-topbar">
                    <button class="btn btn-ghost btn-sm" onclick="UI.forceEndQuiz(true)">End Quiz</button>
                    <span class="quiz-counter"><strong>${idx + 1}</strong> / ${total}</span>
                    <span class="difficulty-badge ${diffClass}">${q.difficulty}</span>
                </div>

                <div class="progress-track">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>

                <div class="question-card">
                    <p class="question-text">${q.question}</p>
                    <div class="choices-grid">
                        ${q.choices.map((c, i) => `
                            <button
                                class="choice-btn"
                                data-letter="${letters[i] || i+1}"
                                data-choice="${encodeURIComponent(c)}"
                                data-answer="${encodeURIComponent(q.answer)}"
                                onclick="UI._onChoiceClick(this)"
                            >${c}</button>
                        `).join('')}
                    </div>
                </div>

                <div id="feedback-box" class="hidden"></div>
            </div>
        `);

        // Keyboard shortcut: A B C D
        this._quizKeyHandler = (e) => {
            const map = { a: 0, b: 1, c: 2, d: 3 };
            if (e.key.toLowerCase() in map) {
                const btns = document.querySelectorAll('.choice-btn:not(:disabled)');
                if (btns[map[e.key.toLowerCase()]]) btns[map[e.key.toLowerCase()]].click();
            }
            if ((e.key === 'Enter' || e.key === 'ArrowRight') && quizState.isAnswered) {
                document.querySelector('.btn-next')?.click();
            }
        };
        document.addEventListener('keydown', this._quizKeyHandler);
    },

    _onChoiceClick(btn) {
        if (quizState.isAnswered) return;
        const selected = decodeURIComponent(btn.getAttribute('data-choice'));
        const correct  = decodeURIComponent(btn.getAttribute('data-answer'));
        this.handleAnswer(btn, selected, correct);
    },

    handleAnswer(btn, selected, correct) {
        if (quizState.isAnswered) return;
        quizState.isAnswered = true;
        quizState.currentQuestions[quizState.currentIndex].userSelectedAnswer = selected;
        const isCorrect = selected === correct;
    
        const correctPhrases = [
            "You're so smart, Leanne.",
            "Looks like you're going to Korea!",
            "Leanne is always right.",
            "Ring ring... Princeton is calling for you!",
            "Of course you're right. You carried your thesis after all (wink)!",
            "Ms. Hechenova or whatever her name is, go quake your boots. Leanne is taking your job."
        ];
        const wrongPhrases = [
            "Wrong, but it's ok Leanne.",
            "Wrong... but Leanne is never wrong (maybe it's the question's fault).",
            "That's not quite right, or maybe this quiz is wrong!",
            "This must be a universal anomaly.",
            "I personally disagree with what the quiz is saying.",
            "Every wrong Leanne makes, Albert will punish the website secretly."
        ];
    
        const chosenPhrase = isCorrect 
            ? correctPhrases[Math.floor(Math.random() * correctPhrases.length)]
            : wrongPhrases[Math.floor(Math.random() * wrongPhrases.length)];
    
        if (isCorrect) {
            quizState.sessionCorrect++;
            DB.stats.correct++;
        } else {
            quizState.sessionWrong++;
        }
    
        document.querySelectorAll('.choice-btn').forEach(b => {
            b.disabled = true;
            const val = decodeURIComponent(b.getAttribute('data-choice'));
            if (val === correct) b.classList.add('correct');
            else if (val === selected) b.classList.add('wrong');
        });
    
        const currentQ = quizState.currentQuestions[quizState.currentIndex];
        const isLast = quizState.currentIndex + 1 === quizState.currentQuestions.length;
    
        document.getElementById('feedback-box').innerHTML = `
            <div class="feedback-card">
                <div class="feedback-header ${isCorrect ? 'correct-header' : 'wrong-header'}">
                    <span class="feedback-status-icon" style="color: ${isCorrect ? 'var(--correct)' : 'var(--wrong)'}; display:flex; align-items:center;">
                        ${isCorrect ? Icons.checkCircle({ size: 22 }) : Icons.xCircle({ size: 22 })}
                    </span>
                    <div>
                        <div class="feedback-status-text" style="font-size: 1.1rem; line-height: 1.3;">${chosenPhrase}</div>
                        ${!isCorrect ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">You selected: ${selected}</div>` : ''}
                    </div>
                </div>
                <div class="feedback-body">
                    <div class="feedback-correct-label">Correct Answer</div>
                    <div class="feedback-correct-val" style="margin-bottom: var(--sp-4); font-weight: bold; color: var(--rose-600);">${correct}</div>
                    <div class="feedback-explanation">${currentQ.fullExplanation || ''}</div>
                    <div class="feedback-meta">
                        <span><strong>Source:</strong> ${currentQ.source || 'Unknown'}</span>
                        <span><strong>Module:</strong> ${currentQ.category || 'General'}</span>
                    </div>
                </div>
                <div class="feedback-footer">
                    <button class="btn btn-primary btn-next" style="width:100%;" onclick="UI.nextQuestion()">
                        ${isLast ? 'See Results →' : 'Next Question →'}
                    </button>
                </div>
            </div>
        `;
        document.getElementById('feedback-box').classList.remove('hidden');
    
        Utils.saveDB();
        this.updateSidebarStats();
    },

    forceEndQuiz(confirmFirst) {
        if (confirmFirst && !Utils.confirm('End quiz? Remaining questions will be marked as 0.')) return;
        document.removeEventListener('keydown', this._quizKeyHandler);
        const remaining = quizState.currentQuestions.length - (quizState.currentIndex + (quizState.isAnswered ? 1 : 0));
        quizState.sessionWrong += remaining;
        quizState.isActive = false;
        this.renderResults();
    },

    nextQuestion() {
        quizState.currentIndex++;
        if (quizState.currentIndex < quizState.currentQuestions.length) {
            this.renderActiveQuestion();
        } else {
            document.removeEventListener('keydown', this._quizKeyHandler);
            quizState.isActive = false;
            this.renderResults();
        }
    },

    renderResults() {
        quizState.isActive = false;
        const total = quizState.currentQuestions.length;
        const percent = Math.round((quizState.sessionCorrect / total) * 100);

        if (window.StatsManager) {
            window.StatsManager.saveAttempt(quizState.currentQuestions, quizState.sessionCorrect);
        }

        if (percent >= 80) setTimeout(() => Utils.confetti(), 200);

        const message = percent === 100 ? 'Perfect score! Absolutely brilliant.'
            : percent >= 80 ? 'Outstanding work — keep that momentum going.'
            : percent >= 60 ? 'Good effort. Review the missed items to strengthen retention.'
            : 'Keep practicing — consistency is everything.';

        const circ = 2 * Math.PI * 46;
        const offset = circ - (percent / 100) * circ;

        Render.setContent(`
            <div class="results-wrapper">
                ${Render.pageHeader('Quiz Complete')}
                <div class="results-score-ring">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="var(--rose-400)"/>
                                <stop offset="100%" stop-color="var(--rose-600)"/>
                            </linearGradient>
                        </defs>
                        <circle class="ring-bg" cx="50" cy="50" r="46"/>
                        <circle class="ring-fill" cx="50" cy="50" r="46"
                            stroke-dasharray="${circ}"
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <div>
                        <div class="results-percent">${percent}%</div>
                        <div class="results-label">Score</div>
                    </div>
                </div>

                <div class="results-stats-row">
                    <div class="results-stat">
                        <div class="results-stat-val" style="color: var(--correct)">${quizState.sessionCorrect}</div>
                        <div class="results-stat-lbl">Correct</div>
                    </div>
                    <div class="results-stat">
                        <div class="results-stat-val" style="color: var(--wrong)">${quizState.sessionWrong}</div>
                        <div class="results-stat-lbl">Wrong</div>
                    </div>
                    <div class="results-stat">
                        <div class="results-stat-val">${total}</div>
                        <div class="results-stat-lbl">Total</div>
                    </div>
                </div>

                <p class="results-message">${message}</p>

                <div class="results-actions">
                    <button class="btn btn-primary" onclick="UI.route('quiz')">New Quiz</button>
                    <button class="btn btn-secondary" onclick="UI.route('stats')">View History</button>
                </div>
            </div>
        `);
    },

    updateSidebarStats() {
        const cv = document.querySelector('#stat-correct .stat-chip-val');
        const iv = document.querySelector('#stat-items .stat-chip-val');
        if (cv) cv.textContent = DB.stats.correct;
        if (iv) iv.textContent = DB.questions.length;
    },

    clearDatabase() {
        if (!Utils.confirm('Clear your entire library? This cannot be undone.')) return;
        localStorage.removeItem('pink_prep_db');
        location.reload();
    }
};

UI.init();
