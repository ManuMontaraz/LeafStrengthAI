// Gym Tracker Application
class GymTracker {
    constructor() {
        this.exercises = JSON.parse(localStorage.getItem('gym_exercises')) || [];
        this.mesocycles = JSON.parse(localStorage.getItem('gym_mesocycles')) || [];
        this.sessions = JSON.parse(localStorage.getItem('gym_sessions')) || [];
        this.currentSession = null;
        this.currentSetExercise = null;
        this.currentMesoDetail = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateDisplay();
        this.renderExercises();
        this.renderMesocycles();
        this.updateStats();
        this.updateMesocycleSelect();
        this.updateStatsExerciseSelect();
        this.renderPersonalRecords();
    }

    // ==================== UTILIDADES ====================
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToStorage() {
        localStorage.setItem('gym_exercises', JSON.stringify(this.exercises));
        localStorage.setItem('gym_mesocycles', JSON.stringify(this.mesocycles));
        localStorage.setItem('gym_sessions', JSON.stringify(this.sessions));
    }

    updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', options);
    }

    // ==================== EJERCICIOS ====================
    setupEventListeners() {
        // Navegación por tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabBtn = e.currentTarget;
                this.switchTab(tabBtn.dataset.tab);
            });
        });

        // Formulario de ejercicios
        document.getElementById('exercise-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExercise();
        });

        // Formulario de edición
        document.getElementById('edit-exercise-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateExercise();
        });

        // Búsqueda y filtros de ejercicios
        document.getElementById('exercise-search').addEventListener('input', () => this.renderExercises());
        document.getElementById('exercise-filter').addEventListener('change', () => this.renderExercises());

        // Formulario de mesociclos
        document.getElementById('mesocycle-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMesocycle();
        });

        // Búsqueda de ejercicios en mesociclo
        document.getElementById('meso-exercise-search').addEventListener('input', () => this.renderMesoExercisesList());

        // Select de estadísticas
        document.getElementById('stats-exercise-select').addEventListener('change', (e) => {
            this.renderExerciseChart(e.target.value);
        });

        // Cálculo de peso en modal de set
        document.getElementById('set-percentage').addEventListener('input', () => this.updateCalculatedWeight());

        // Cerrar modales al hacer click fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Prevent default en cualquier submit no manejado para evitar recargas
        document.addEventListener('submit', (e) => {
            const form = e.target;
            // Solo prevenir si el formulario no tiene handler específico
            if (!form.hasAttribute('data-has-handler')) {
                e.preventDefault();
                console.warn('Submit no manejado detectado y prevenido:', form);
            }
        }, true);
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Actualizar datos específicos del tab
        if (tabId === 'exercises') {
            this.renderExercises();
        } else if (tabId === 'mesocycles') {
            this.renderMesoExercisesList();
        } else if (tabId === 'session') {
            this.updateMesocycleSelect();
        } else if (tabId === 'stats') {
            this.updateStats();
            this.updateStatsExerciseSelect();
            this.renderPersonalRecords();
        } else if (tabId === 'backup') {
            this.updateBackupStats();
        }
    }

    addExercise() {
        const name = document.getElementById('exercise-name').value.trim();
        const category = document.getElementById('exercise-category').value;
        const rm = parseFloat(document.getElementById('exercise-rm').value);
        const favorite = document.getElementById('exercise-favorite').checked;

        const exercise = {
            id: this.generateId(),
            name,
            category,
            rm,
            favorite,
            createdAt: new Date().toISOString()
        };

        this.exercises.push(exercise);
        this.saveToStorage();
        
        document.getElementById('exercise-form').reset();
        this.renderExercises();
        this.renderMesoExercisesList();
        this.updateStats();
        this.updateStatsExerciseSelect();

        this.showNotification('Ejercicio guardado correctamente', 'success');
    }

    renderExercises() {
        const searchTerm = document.getElementById('exercise-search').value.toLowerCase();
        const filter = document.getElementById('exercise-filter').value;
        
        let filtered = this.exercises.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm);
            const matchesFilter = filter === 'all' || 
                                 (filter === 'favorites' && ex.favorite) ||
                                 ex.category === filter;
            return matchesSearch && matchesFilter;
        });

        const container = document.getElementById('exercises-list');
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron ejercicios</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(ex => `
            <div class="exercise-card ${ex.favorite ? 'favorite' : ''}">
                <button type="button" class="favorite-btn ${ex.favorite ? 'active' : ''}" onclick="gymTracker.toggleFavorite('${ex.id}')">
                    <i class="fas fa-star"></i>
                </button>
                <div class="exercise-header">
                    <h4>${ex.name}</h4>
                </div>
                <span class="category-badge">${this.getCategoryName(ex.category)}</span>
                <div class="rm-value">
                    ${ex.rm} <span>kg 1RM</span>
                </div>
                <div class="exercise-actions">
                    <button type="button" class="btn-icon" onclick="gymTracker.editExercise('${ex.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon" onclick="gymTracker.deleteExercise('${ex.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getCategoryName(category) {
        const categories = {
            pecho: 'Pecho',
            espalda: 'Espalda',
            hombros: 'Hombros',
            brazos: 'Brazos',
            piernas: 'Piernas',
            core: 'Core',
            otros: 'Otros'
        };
        return categories[category] || category;
    }

    toggleFavorite(id) {
        const exercise = this.exercises.find(e => e.id === id);
        if (exercise) {
            exercise.favorite = !exercise.favorite;
            this.saveToStorage();
            this.renderExercises();
        }
    }

    editExercise(id) {
        const exercise = this.exercises.find(e => e.id === id);
        if (!exercise) return;

        document.getElementById('edit-exercise-id').value = exercise.id;
        document.getElementById('edit-exercise-name').value = exercise.name;
        document.getElementById('edit-exercise-category').value = exercise.category;
        document.getElementById('edit-exercise-rm').value = exercise.rm;
        document.getElementById('edit-exercise-favorite').checked = exercise.favorite;

        document.getElementById('edit-modal').classList.add('active');
    }

    updateExercise() {
        const id = document.getElementById('edit-exercise-id').value;
        const exercise = this.exercises.find(e => e.id === id);
        
        if (exercise) {
            exercise.name = document.getElementById('edit-exercise-name').value.trim();
            exercise.category = document.getElementById('edit-exercise-category').value;
            exercise.rm = parseFloat(document.getElementById('edit-exercise-rm').value);
            exercise.favorite = document.getElementById('edit-exercise-favorite').checked;
            
            this.saveToStorage();
            this.renderExercises();
            this.renderMesoExercisesList();
            this.closeModal('edit-modal');
            this.showNotification('Ejercicio actualizado', 'success');
        }
    }

    deleteExercise(id) {
        if (confirm('¿Estás seguro de eliminar este ejercicio?')) {
            this.exercises = this.exercises.filter(e => e.id !== id);
            this.saveToStorage();
            this.renderExercises();
            this.renderMesoExercisesList();
            this.updateStats();
            this.updateStatsExerciseSelect();
            this.showNotification('Ejercicio eliminado', 'success');
        }
    }

    // ==================== CALCULADORA 1RM ====================
    calculateRM() {
        const weight = parseFloat(document.getElementById('calc-weight').value);
        const reps = parseInt(document.getElementById('calc-reps').value);

        if (!weight || !reps) {
            this.showNotification('Ingresa peso y repeticiones', 'warning');
            return;
        }

        // Fórmula de Brzycki
        const rm = Math.round(weight / (1.0278 - 0.0278 * reps));

        document.getElementById('rm-value').textContent = rm;
        document.getElementById('rm-95').textContent = Math.round(rm * 0.95);
        document.getElementById('rm-90').textContent = Math.round(rm * 0.90);
        document.getElementById('rm-85').textContent = Math.round(rm * 0.85);
        document.getElementById('rm-80').textContent = Math.round(rm * 0.80);
        document.getElementById('rm-75').textContent = Math.round(rm * 0.75);
        document.getElementById('rm-70').textContent = Math.round(rm * 0.70);

        document.getElementById('rm-result').classList.remove('hidden');
    }

    // ==================== MESOCICLOS ====================
    renderMesoExercisesList() {
        const searchTerm = document.getElementById('meso-exercise-search').value.toLowerCase();
        const container = document.getElementById('meso-exercises-list');
        
        let filtered = this.exercises.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 20px;">No hay ejercicios disponibles</p>';
            return;
        }

        container.innerHTML = filtered.map(ex => `
            <label class="checkbox-exercise-item">
                <input type="checkbox" value="${ex.id}" data-name="${ex.name}">
                <div class="exercise-info">
                    <div class="exercise-name">${ex.name}</div>
                    <div class="exercise-rm">1RM: ${ex.rm}kg - ${this.getCategoryName(ex.category)}</div>
                </div>
            </label>
        `).join('');
    }

    showFavoritesForMeso() {
        const favorites = this.exercises.filter(e => e.favorite);
        const checkboxes = document.querySelectorAll('#meso-exercises-list input[type="checkbox"]');
        
        // Mostrar solo favoritos en la lista
        const container = document.getElementById('meso-exercises-list');
        if (favorites.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 20px;">No tienes ejercicios favoritos</p>';
            return;
        }

        container.innerHTML = favorites.map(ex => `
            <label class="checkbox-exercise-item">
                <input type="checkbox" value="${ex.id}" data-name="${ex.name}" checked>
                <div class="exercise-info">
                    <div class="exercise-name">${ex.name}</div>
                    <div class="exercise-rm">1RM: ${ex.rm}kg - ${this.getCategoryName(ex.category)}</div>
                </div>
            </label>
        `).join('');
    }

    addMesocycle() {
        const name = document.getElementById('meso-name').value.trim();
        const duration = parseInt(document.getElementById('meso-duration').value);
        const description = document.getElementById('meso-description').value.trim();
        
        // Obtener ejercicios seleccionados
        const selectedExercises = [];
        document.querySelectorAll('#meso-exercises-list input[type="checkbox"]:checked').forEach(cb => {
            const exercise = this.exercises.find(e => e.id === cb.value);
            if (exercise) {
                selectedExercises.push({
                    exerciseId: exercise.id,
                    name: exercise.name,
                    rm: exercise.rm,
                    sets: []
                });
            }
        });

        if (selectedExercises.length === 0) {
            this.showNotification('Selecciona al menos un ejercicio', 'warning');
            return;
        }

        const mesocycle = {
            id: this.generateId(),
            name,
            duration,
            description,
            exercises: selectedExercises,
            createdAt: new Date().toISOString(),
            completedSessions: 0,
            objective: 'mixed' // Objetivo por defecto para mesociclos manuales
        };

        this.mesocycles.push(mesocycle);
        this.saveToStorage();
        
        document.getElementById('mesocycle-form').reset();
        this.renderMesoExercisesList();
        this.renderMesocycles();
        this.updateStats();
        this.updateMesocycleSelect();

        this.showNotification('Mesociclo creado correctamente', 'success');
    }

    renderMesocycles() {
        const container = document.getElementById('mesocycles-list');
        
        if (this.mesocycles.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <p>No tienes mesociclos creados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.mesocycles.map(meso => `
            <div class="mesocycle-card" onclick="gymTracker.showMesocycleDetail('${meso.id}')">
                <h4>${meso.name}</h4>
                <div class="meso-meta">
                    <span><i class="fas fa-calendar"></i> ${meso.duration} semanas</span>
                    <span><i class="fas fa-dumbbell"></i> ${meso.exercises.length} ejercicios</span>
                </div>
                <p class="meso-description">${meso.description || 'Sin descripción'}</p>
            </div>
        `).join('');
    }

    showMesocycleDetail(id) {
        const meso = this.mesocycles.find(m => m.id === id);
        if (!meso) return;

        this.currentMesoDetail = id;
        document.getElementById('meso-detail-title').textContent = meso.name;

        const content = document.getElementById('meso-detail-content');
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <strong>Duración:</strong> ${meso.duration} semanas<br>
                <strong>Ejercicios:</strong> ${meso.exercises.length}<br>
                <strong>Sesiones completadas:</strong> ${meso.completedSessions || 0}
            </div>
            <h4 style="margin-bottom: 15px; color: var(--primary-light);">Ejercicios incluidos:</h4>
            ${meso.exercises.map(ex => `
                <div class="meso-exercise-detail">
                    <h5>${ex.name} (1RM: ${ex.rm}kg)</h5>
                    ${ex.sets && ex.sets.length > 0 ? `
                        <div class="sets-preview">
                            ${ex.sets.map((set, i) => `
                                <span class="set-preview-item">Serie ${i+1}: ${set.percentage}% - ${set.reps} reps</span>
                            `).join('')}
                        </div>
                    ` : '<span style="color: var(--text-secondary); font-size: 0.9rem;">Sin series configuradas</span>'}
                </div>
            `).join('')}
        `;

        document.getElementById('meso-detail-modal').classList.add('active');
    }

    deleteCurrentMesocycle() {
        if (!this.currentMesoDetail) return;
        
        if (confirm('¿Estás seguro de eliminar este mesociclo? Se perderán todos los datos asociados.')) {
            this.mesocycles = this.mesocycles.filter(m => m.id !== this.currentMesoDetail);
            this.sessions = this.sessions.filter(s => s.mesocycleId !== this.currentMesoDetail);
            this.saveToStorage();
            this.renderMesocycles();
            this.updateStats();
            this.updateMesocycleSelect();
            this.closeModal('meso-detail-modal');
            this.showNotification('Mesociclo eliminado', 'success');
        }
    }

    // ==================== SESIONES ====================
    updateMesocycleSelect() {
        const select = document.getElementById('active-mesocycle');
        select.innerHTML = '<option value="">Seleccionar mesociclo activo...</option>' +
            this.mesocycles.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        
        // Restaurar sesión si hay una guardada
        const savedSession = localStorage.getItem('gym_current_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            select.value = session.mesocycleId;
        }
    }

    startNewSession() {
        const mesoId = document.getElementById('active-mesocycle').value;
        if (!mesoId) {
            this.showNotification('Selecciona un mesociclo primero', 'warning');
            return;
        }

        const meso = this.mesocycles.find(m => m.id === mesoId);
        if (!meso) return;

        // Calcular número de sesión dentro del mesociclo (1-based)
        const sessionsInMesocycle = this.sessions.filter(s => s.mesocycleId === mesoId && s.completed).length;
        const sessionNumber = sessionsInMesocycle + 1;

        this.currentSession = {
            id: this.generateId(),
            mesocycleId: mesoId,
            mesocycleName: meso.name,
            sessionNumber: sessionNumber,
            date: new Date().toISOString(),
            exercises: meso.exercises.map(ex => ({
                exerciseId: ex.exerciseId,
                name: ex.name,
                rm: ex.rm,
                sets: []
            })),
            completed: false
        };

        localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        this.renderSession();
    }

    loadPreviousSession() {
        const savedSession = localStorage.getItem('gym_current_session');
        if (savedSession) {
            this.currentSession = JSON.parse(savedSession);
            document.getElementById('active-mesocycle').value = this.currentSession.mesocycleId;
            this.renderSession();
        } else {
            this.showNotification('No hay sesión anterior guardada', 'warning');
        }
    }

    renderSession() {
        const container = document.getElementById('session-content');
        
        if (!this.currentSession) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>Selecciona un mesociclo para comenzar tu sesión de entrenamiento</p>
                </div>
            `;
            return;
        }

        const sessionNumber = this.currentSession.sessionNumber || 1;
        const weekType = sessionNumber === 1 ? 'Acumulación' :
                        sessionNumber === 2 ? 'Intensificación' :
                        sessionNumber === 3 ? 'Realización' :
                        sessionNumber === 4 ? 'Descarga' : `Semana ${sessionNumber}`;

        container.innerHTML = `
            <div class="session-info-banner" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="font-size: 1.1rem;">📅 Sesión ${sessionNumber}</strong>
                    <span style="opacity: 0.9; margin-left: 10px;">${weekType}</span>
                </div>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    Porcentajes: ${this.getProgressivePercentage(sessionNumber, 0)}% → ${this.getProgressivePercentage(sessionNumber, 3)}%
                </div>
            </div>
            <div class="session-exercises">
                ${this.currentSession.exercises.map((ex, exIndex) => `
                    <div class="session-exercise">
                        <div class="session-exercise-header">
                            <div class="session-exercise-info">
                                <h4>${ex.name}</h4>
                                <div class="exercise-rm">1RM: ${ex.rm}kg</div>
                            </div>
                            <div class="session-exercise-actions">
                                <button type="button" class="btn btn-secondary btn-small" onclick="gymTracker.openSetModal('${ex.exerciseId}', ${exIndex})">
                                    <i class="fas fa-plus"></i> Añadir serie
                                </button>
                            </div>
                        </div>
                        <div class="sets-container">
                            ${ex.sets.length > 0 ? ex.sets.map((set, setIndex) => `
                                <div class="set-row">
                                    <div class="set-number">${setIndex + 1}</div>
                                    <div class="set-field">
                                        <label>Peso (kg)</label>
                                        <input type="number" value="${set.weight || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'weight', this.value)"
                                               placeholder="${set.suggestedWeight || ''}">
                                    </div>
                                    <div class="set-field">
                                        <label>% 1RM</label>
                                        <input type="number" value="${set.percentage || ''}" 
                                               onchange="gymTracker.updateSetPercentage('${ex.exerciseId}', ${setIndex}, this.value)"
                                               placeholder="%" style="background: var(--card-bg-hover); color: var(--text-secondary);">
                                    </div>
                                    <div class="set-field">
                                        <label>Reps objetivo</label>
                                        <input type="number" value="${set.targetReps || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'targetReps', this.value)"
                                               readonly style="background: var(--card-bg-hover); color: var(--text-secondary);">
                                    </div>
                                    <div class="set-field">
                                        <label>Reps hechas</label>
                                        <input type="number" value="${set.actualReps || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'actualReps', this.value)"
                                               placeholder="0">
                                    </div>
                                    <div class="set-field">
                                        <label>RPE (1-10)</label>
                                        <input type="number" min="1" max="10" value="${set.rpe || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'rpe', this.value)"
                                               placeholder="RPE">
                                    </div>
                                    <div class="set-completed">
                                        <input type="checkbox" ${set.completed ? 'checked' : ''} 
                                               onchange="gymTracker.toggleSetComplete('${ex.exerciseId}', ${setIndex})"
                                               title="Marcar como completada">
                                    </div>
                                    <button type="button" class="set-remove-btn" onclick="gymTracker.removeSet('${ex.exerciseId}', ${setIndex})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aún no hay series. Añade una serie para comenzar.</p>'}
                            
                            <button type="button" class="add-set-btn" onclick="gymTracker.openSetModal('${ex.exerciseId}', ${exIndex})">
                                <i class="fas fa-plus"></i> Añadir serie
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <button type="button" class="btn btn-success" style="width: 100%;" onclick="gymTracker.finishSession()">
                    <i class="fas fa-check-circle"></i> Finalizar Sesión
                </button>
            </div>
        `;
    }

    getProgressivePercentage(sessionNumber, setIndex, mesocycleDuration = 4) {
        // Factores de progresión según la semana del mesociclo
        // Sesión 1: 0.95 (volumen alto, intensidad moderada)
        // Sesión 2: 1.00 (volumen moderado, intensidad alta)
        // Sesión 3: 1.05 (intensidad máxima)
        // Sesión 4: 0.90 (descarga/deload)
        const sessionMultipliers = {
            1: 0.95,  // Semana 1: Acumulación
            2: 1.00,  // Semana 2: Intensificación
            3: 1.05,  // Semana 3: Realización/Intensidad máxima
            4: 0.90   // Semana 4: Descarga
        };
        
        // Para mesociclos más largos, extender el patrón
        let sessionMultiplier = sessionMultipliers[sessionNumber] || 1.00;
        if (sessionNumber > 4) {
            // Ciclo de 3 semanas: Acumulación -> Intensificación -> Realización
            const cyclePosition = ((sessionNumber - 1) % 3) + 1;
            const cycleMultipliers = { 1: 0.95, 2: 1.00, 3: 1.05 };
            sessionMultiplier = cycleMultipliers[cyclePosition];
        }
        
        // Escalera ascendente dentro de la sesión
        // Serie 1: 70%, Serie 2: 75%, Serie 3: 80%, Serie 4: 85%
        const setPercentages = [70, 75, 80, 85, 85, 85, 85, 85];
        const basePercentage = setPercentages[Math.min(setIndex, setPercentages.length - 1)];
        
        // Aplicar multiplicador de sesión
        const adjustedPercentage = Math.round(basePercentage * sessionMultiplier);
        
        // Limitar entre 50% y 95%
        return Math.max(50, Math.min(95, adjustedPercentage));
    }

    openSetModal(exerciseId, exerciseIndex) {
        this.currentSetExercise = { exerciseId, exerciseIndex };
        
        const exercise = this.currentSession.exercises[exerciseIndex];
        const currentSetsCount = exercise.sets.length;
        const sessionNumber = this.currentSession.sessionNumber || 1;
        
        // Obtener porcentaje progresivo basado en sesión y serie
        const defaultPercentage = this.getProgressivePercentage(sessionNumber, currentSetsCount);
        
        // Sugerir reps basadas en el porcentaje
        const suggestedReps = defaultPercentage >= 85 ? 5 : (defaultPercentage >= 80 ? 8 : 10);
        
        document.getElementById('set-percentage').value = defaultPercentage;
        document.getElementById('set-reps').value = suggestedReps;
        
        // Actualizar el título del modal para mostrar qué serie es
        const modalTitle = document.querySelector('#set-modal .modal-header h3');
        modalTitle.textContent = `Configurar Serie ${currentSetsCount + 1}`;
        
        // Actualizar información del esquema
        const schemeInfo = document.getElementById('set-scheme-info');
        const weekType = sessionNumber === 1 ? 'Acumulación' : 
                        sessionNumber === 2 ? 'Intensificación' : 
                        sessionNumber === 3 ? 'Realización' : 
                        sessionNumber === 4 ? 'Descarga' : `Semana ${sessionNumber}`;
        
        schemeInfo.innerHTML = `💡 <strong>${weekType}</strong> - Sesión ${sessionNumber} del mesociclo. `;
        schemeInfo.innerHTML += `Esta serie al ${defaultPercentage}% del 1RM.`;
        
        this.updateCalculatedWeight();
        document.getElementById('set-modal').classList.add('active');
    }

    updateCalculatedWeight() {
        if (!this.currentSetExercise) return;
        
        const percentage = parseFloat(document.getElementById('set-percentage').value);
        const exercise = this.currentSession.exercises[this.currentSetExercise.exerciseIndex];
        const weight = Math.round(exercise.rm * (percentage / 100));
        
        document.getElementById('calculated-weight').textContent = weight + ' kg';
    }

    saveSetConfig() {
        if (!this.currentSetExercise) return;

        const percentage = parseFloat(document.getElementById('set-percentage').value);
        const reps = parseInt(document.getElementById('set-reps').value);
        
        const exercise = this.currentSession.exercises[this.currentSetExercise.exerciseIndex];
        const suggestedWeight = Math.round(exercise.rm * (percentage / 100));

        const newSet = {
            targetReps: reps,
            suggestedWeight: suggestedWeight,
            percentage: percentage,
            weight: suggestedWeight,
            actualReps: '',
            rpe: '',
            completed: false
        };

        exercise.sets.push(newSet);
        
        localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        this.closeModal('set-modal');
        this.renderSession();
    }

    updateSet(exerciseId, setIndex, field, value) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            exercise.sets[setIndex][field] = value === '' ? '' : parseFloat(value);
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        }
    }

    updateSetPercentage(exerciseId, setIndex, percentage) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            const newPercentage = percentage === '' ? '' : parseFloat(percentage);
            exercise.sets[setIndex].percentage = newPercentage;
            
            // Recalcular peso sugerido basado en el nuevo porcentaje
            if (newPercentage && !isNaN(newPercentage)) {
                exercise.sets[setIndex].suggestedWeight = Math.round(exercise.rm * (newPercentage / 100));
            }
            
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
            this.renderSession();
        }
    }

    toggleSetComplete(exerciseId, setIndex) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            exercise.sets[setIndex].completed = !exercise.sets[setIndex].completed;
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        }
    }

    removeSet(exerciseId, setIndex) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise) {
            exercise.sets.splice(setIndex, 1);
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
            this.renderSession();
        }
    }

    finishSession() {
        if (!this.currentSession) return;

        // Verificar que haya al menos una serie
        const totalSets = this.currentSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        if (totalSets === 0) {
            this.showNotification('Añade al menos una serie antes de finalizar', 'warning');
            return;
        }

        this.currentSession.completed = true;
        this.currentSession.endDate = new Date().toISOString();
        
        // Guardar sesión
        this.sessions.push(this.currentSession);
        
        // Actualizar contador de sesiones completadas del mesociclo
        const meso = this.mesocycles.find(m => m.id === this.currentSession.mesocycleId);
        if (meso) {
            meso.completedSessions = (meso.completedSessions || 0) + 1;
        }
        
        this.saveToStorage();
        
        // Limpiar sesión actual
        localStorage.removeItem('gym_current_session');
        this.currentSession = null;
        
        this.renderSession();
        this.updateStats();
        this.showNotification('¡Sesión finalizada correctamente!', 'success');
    }

    // ==================== ESTADÍSTICAS ====================
    updateStats() {
        document.getElementById('stat-total-exercises').textContent = this.exercises.length;
        document.getElementById('stat-total-sessions').textContent = this.sessions.length;
        document.getElementById('stat-total-mesocycles').textContent = this.mesocycles.length;
        
        const totalSets = this.sessions.reduce((sum, session) => {
            return sum + session.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0);
        }, 0);
        document.getElementById('stat-total-sets').textContent = totalSets;
    }

    updateStatsExerciseSelect() {
        const select = document.getElementById('stats-exercise-select');
        select.innerHTML = '<option value="">Selecciona un ejercicio...</option>' +
            this.exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    }

    renderExerciseChart(exerciseId) {
        const container = document.getElementById('exercise-chart');
        const detailContainer = document.getElementById('exercise-stats-detail');
        
        if (!exerciseId) {
            container.innerHTML = '';
            detailContainer.classList.add('hidden');
            return;
        }

        const exercise = this.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        // Obtener datos de todas las sesiones para este ejercicio
        const exerciseData = [];
        this.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.exerciseId === exerciseId) {
                    ex.sets.forEach(set => {
                        if (set.completed && set.weight && set.actualReps) {
                            exerciseData.push({
                                date: new Date(session.date).toLocaleDateString('es-ES'),
                                weight: set.weight,
                                reps: set.actualReps,
                                volume: set.weight * set.actualReps
                            });
                        }
                    });
                }
            });
        });

        if (exerciseData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay datos disponibles para este ejercicio</p>';
            detailContainer.classList.add('hidden');
            return;
        }

        // Crear gráfico
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: exerciseData.map((d, i) => `Entreno ${i + 1}`),
                datasets: [{
                    label: 'Peso (kg)',
                    data: exerciseData.map(d => d.weight),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Volumen (kg x reps)',
                    data: exerciseData.map(d => d.volume),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#10b981'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });

        // Mostrar detalles
        const maxWeight = Math.max(...exerciseData.map(d => d.weight));
        const maxVolume = Math.max(...exerciseData.map(d => d.volume));
        const avgWeight = (exerciseData.reduce((sum, d) => sum + d.weight, 0) / exerciseData.length).toFixed(1);
        
        detailContainer.innerHTML = `
            <div class="stats-detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Peso máximo</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-light);">${maxWeight} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Peso promedio</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--secondary-color);">${avgWeight} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Volumen máximo</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning-color);">${maxVolume} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Total entrenos</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${exerciseData.length}</div>
                </div>
            </div>
        `;
        detailContainer.classList.remove('hidden');
    }

    renderPersonalRecords() {
        const container = document.getElementById('personal-records');
        const records = [];

        this.exercises.forEach(exercise => {
            let maxWeight = 0;
            let maxDate = null;

            this.sessions.forEach(session => {
                session.exercises.forEach(ex => {
                    if (ex.exerciseId === exercise.id) {
                        ex.sets.forEach(set => {
                            if (set.completed && set.weight > maxWeight) {
                                maxWeight = set.weight;
                                maxDate = session.date;
                            }
                        });
                    }
                });
            });

            if (maxWeight > 0) {
                records.push({
                    exercise: exercise.name,
                    weight: maxWeight,
                    date: maxDate
                });
            }
        });

        // Ordenar por peso descendente
        records.sort((a, b) => b.weight - a.weight);

        if (records.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aún no tienes records personales. ¡Completa algunas sesiones!</p>';
            return;
        }

        container.innerHTML = records.slice(0, 6).map(record => `
            <div class="record-item">
                <div class="record-info">
                    <h4>${record.exercise}</h4>
                    <div class="record-date">${new Date(record.date).toLocaleDateString('es-ES')}</div>
                </div>
                <div class="record-value">${record.weight} kg</div>
            </div>
        `).join('');
    }

    // ==================== UTILIDADES UI ====================
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#6366f1'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==================== IMPORT/EXPORT ====================
    updateBackupStats() {
        document.getElementById('export-exercise-count').textContent = this.exercises.length;
        document.getElementById('export-mesocycle-count').textContent = this.mesocycles.length;
        document.getElementById('export-session-count').textContent = this.sessions.length;
        document.getElementById('export-date').textContent = new Date().toLocaleString('es-ES');
    }

    exportData() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            exercises: this.exercises,
            mesocycles: this.mesocycles,
            sessions: this.sessions
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `gym-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Backup descargado correctamente', 'success');
    }
}

// Variable global para almacenar datos de importación temporal
let pendingImportData = null;

// Funciones globales para onclick
function calculateRM() {
    gymTracker.calculateRM();
}

function showFavoritesForMeso() {
    gymTracker.showFavoritesForMeso();
}

function closeModal(modalId) {
    gymTracker.closeModal(modalId);
}

function saveSetConfig() {
    gymTracker.saveSetConfig();
}

function startNewSession() {
    gymTracker.startNewSession();
}

function loadPreviousSession() {
    gymTracker.loadPreviousSession();
}

function deleteCurrentMesocycle() {
    gymTracker.deleteCurrentMesocycle();
}

function exportData() {
    gymTracker.exportData();
}

function previewImportFile() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar estructura
            if (!data.version || !data.exercises || !data.mesocycles || !data.sessions) {
                showImportError('El archivo no tiene el formato correcto');
                return;
            }
            
            pendingImportData = data;
            
            // Mostrar vista previa
            document.getElementById('preview-exercises').textContent = data.exercises.length;
            document.getElementById('preview-mesocycles').textContent = data.mesocycles.length;
            document.getElementById('preview-sessions').textContent = data.sessions.length;
            document.getElementById('preview-date').textContent = new Date(data.exportDate).toLocaleString('es-ES');
            
            document.getElementById('import-preview').classList.remove('hidden');
            document.getElementById('import-error').classList.add('hidden');
            
        } catch (error) {
            showImportError('Error al leer el archivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function showImportError(message) {
    document.getElementById('import-error-message').textContent = message;
    document.getElementById('import-error').classList.remove('hidden');
    document.getElementById('import-preview').classList.add('hidden');
    pendingImportData = null;
}

function importData() {
    if (!pendingImportData) return;
    
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    
    // Actualizar modal de confirmación
    document.getElementById('confirm-import-mode').textContent = mode === 'merge' ? 'fusionar' : 'reemplazar';
    document.getElementById('confirm-exercises').textContent = pendingImportData.exercises.length;
    document.getElementById('confirm-mesocycles').textContent = pendingImportData.mesocycles.length;
    document.getElementById('confirm-sessions').textContent = pendingImportData.sessions.length;
    
    if (mode === 'replace') {
        document.getElementById('import-replace-warning').classList.remove('hidden');
    } else {
        document.getElementById('import-replace-warning').classList.add('hidden');
    }
    
    document.getElementById('import-confirm-modal').classList.add('active');
}

function confirmImport() {
    if (!pendingImportData) return;
    
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    
    if (mode === 'replace') {
        // Reemplazar todo
        gymTracker.exercises = pendingImportData.exercises;
        gymTracker.mesocycles = pendingImportData.mesocycles;
        gymTracker.sessions = pendingImportData.sessions;
    } else {
        // Fusionar - evitar duplicados por ID
        const existingExerciseIds = new Set(gymTracker.exercises.map(e => e.id));
        const existingMesoIds = new Set(gymTracker.mesocycles.map(m => m.id));
        const existingSessionIds = new Set(gymTracker.sessions.map(s => s.id));
        
        pendingImportData.exercises.forEach(ex => {
            if (!existingExerciseIds.has(ex.id)) {
                gymTracker.exercises.push(ex);
            }
        });
        
        pendingImportData.mesocycles.forEach(meso => {
            if (!existingMesoIds.has(meso.id)) {
                gymTracker.mesocycles.push(meso);
            }
        });
        
        pendingImportData.sessions.forEach(session => {
            if (!existingSessionIds.has(session.id)) {
                gymTracker.sessions.push(session);
            }
        });
    }
    
    gymTracker.saveToStorage();
    gymTracker.init();
    
    // Limpiar
    pendingImportData = null;
    document.getElementById('import-file').value = '';
    document.getElementById('import-preview').classList.add('hidden');
    closeModal('import-confirm-modal');
    
    gymTracker.showNotification(`Datos importados correctamente (${mode === 'merge' ? 'fusionados' : 'reemplazados'})`, 'success');
}

function clearAllData() {
    if (confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.\n\nRecomendación: Exporta un backup primero.')) {
        if (confirm('Última advertencia: ¿Realmente quieres eliminar todos tus ejercicios, mesociclos y sesiones?')) {
            gymTracker.exercises = [];
            gymTracker.mesocycles = [];
            gymTracker.sessions = [];
            gymTracker.currentSession = null;
            localStorage.removeItem('gym_current_session');
            gymTracker.saveToStorage();
            gymTracker.init();
            gymTracker.showNotification('Todos los datos han sido eliminados', 'success');
        }
    }
}

function clearSessionsOnly() {
    if (confirm('¿Estás seguro de que quieres borrar solo las sesiones completadas? Los ejercicios y mesociclos se mantendrán.')) {
        gymTracker.sessions = [];
        gymTracker.mesocycles.forEach(m => m.completedSessions = 0);
        gymTracker.saveToStorage();
        gymTracker.updateStats();
        gymTracker.renderPersonalRecords();
        gymTracker.showNotification('Sesiones eliminadas correctamente', 'success');
    }
}

// ==================== AUTOMATRÓN ====================

// Configuraciones de objetivos de entrenamiento
const autoConfigs = {
    strength: {
        name: 'Fuerza Máxima',
        setsRange: [3, 5],
        repsRange: [1, 5],
        percentageRange: [85, 95],
        restTime: '3-5 min',
        progression: 'Lineal (aumento de peso semanal)',
        periodization: [
            { week: 1, percentage: 85, sets: 5, reps: 5 },
            { week: 2, percentage: 87.5, sets: 5, reps: 3 },
            { week: 3, percentage: 90, sets: 3, reps: 3 },
            { week: 4, percentage: 92.5, sets: 2, reps: 2 }
        ]
    },
    hypertrophy: {
        name: 'Hipertrofia',
        setsRange: [3, 4],
        repsRange: [8, 12],
        percentageRange: [65, 80],
        restTime: '60-90 seg',
        progression: 'Doble progresión (reps → peso)',
        periodization: [
            { week: 1, percentage: 70, sets: 4, reps: 12 },
            { week: 2, percentage: 72.5, sets: 4, reps: 10 },
            { week: 3, percentage: 75, sets: 3, reps: 8 },
            { week: 4, percentage: 77.5, sets: 3, reps: 8 }
        ]
    },
    endurance: {
        name: 'Resistencia Muscular',
        setsRange: [2, 3],
        repsRange: [15, 20],
        percentageRange: [50, 65],
        restTime: '30-60 seg',
        progression: 'Aumento de volumen',
        periodization: [
            { week: 1, percentage: 55, sets: 3, reps: 20 },
            { week: 2, percentage: 57.5, sets: 3, reps: 18 },
            { week: 3, percentage: 60, sets: 3, reps: 15 },
            { week: 4, percentage: 62.5, sets: 2, reps: 15 }
        ]
    },
    power: {
        name: 'Potencia',
        setsRange: [3, 5],
        repsRange: [3, 5],
        percentageRange: [60, 75],
        restTime: '2-3 min',
        progression: 'Movimientos explosivos',
        periodization: [
            { week: 1, percentage: 60, sets: 5, reps: 5 },
            { week: 2, percentage: 65, sets: 5, reps: 4 },
            { week: 3, percentage: 70, sets: 4, reps: 3 },
            { week: 4, percentage: 75, sets: 3, reps: 3 }
        ]
    },
    mixed: {
        name: 'Mixto',
        setsRange: [3, 4],
        repsRange: [6, 10],
        percentageRange: [70, 85],
        restTime: '90 seg - 2 min',
        progression: 'Periodización undulante',
        periodization: [
            { week: 1, percentage: 70, sets: 4, reps: 10 },
            { week: 2, percentage: 77.5, sets: 4, reps: 6 },
            { week: 3, percentage: 82.5, sets: 3, reps: 5 },
            { week: 4, percentage: 85, sets: 3, reps: 4 }
        ]
    }
};

// La aplicación se inicializa en el HTML cuando el DOM está listo

// ==================== GENERADOR AUTOMÁTICO DE SERIES ====================

function openAutoSetsModal() {
    if (!gymTracker.currentSession) {
        document.getElementById('auto-sets-no-session').classList.remove('hidden');
        document.getElementById('auto-sets-content').classList.add('hidden');
    } else {
        document.getElementById('auto-sets-no-session').classList.add('hidden');
        document.getElementById('auto-sets-content').classList.remove('hidden');
        renderAutoSetsPreview();
    }
    document.getElementById('auto-sets-modal').classList.add('active');
}

function renderAutoSetsPreview() {
    if (!gymTracker.currentSession) return;
    
    const container = document.getElementById('auto-sets-exercises-list');
    const exercises = gymTracker.currentSession.exercises;
    
    if (exercises.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay ejercicios en la sesión actual</p>';
        return;
    }
    
    container.innerHTML = exercises.map((ex, index) => `
        <div style="padding: 15px; margin-bottom: 10px; background: var(--card-bg); border-radius: 8px; border-left: 3px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: var(--text-primary);">${ex.name}</strong>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">1RM: ${ex.rm}kg</span>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="auto-preview-${index}">
                <span style="color: var(--text-secondary); font-size: 0.85rem;">
                    <i class="fas fa-info-circle"></i> Se generarán series inteligentes basadas en tu historial
                </span>
            </div>
        </div>
    `).join('');
}

function generateAutoSets() {
    if (!gymTracker.currentSession) {
        gymTracker.showNotification('No hay una sesión activa', 'warning');
        return;
    }

    const objective = document.getElementById('auto-sets-objective').value;
    const intensity = document.getElementById('auto-sets-intensity').value;
    const numSets = parseInt(document.getElementById('auto-sets-count').value);
    const sessionNumber = gymTracker.currentSession.sessionNumber || 1;

    // Detectar objetivo del mesociclo si está en modo automático
    let targetObjective = objective;
    if (objective === 'auto' && gymTracker.currentSession.mesocycleId) {
        const meso = gymTracker.mesocycles.find(m => m.id === gymTracker.currentSession.mesocycleId);
        if (meso && meso.objective) {
            targetObjective = meso.objective;
        } else {
            targetObjective = 'mixed';
        }
    } else if (objective === 'auto') {
        targetObjective = 'mixed';
    }

    // Configuraciones base por objetivo (solo reps y RPE objetivo)
    const baseConfigs = {
        strength: { reps: 5, rpeTarget: 8 },
        hypertrophy: { reps: 10, rpeTarget: 8 },
        endurance: { reps: 15, rpeTarget: 9 },
        power: { reps: 3, rpeTarget: 7 },
        deload: { reps: 10, rpeTarget: 5 },
        mixed: { reps: 8, rpeTarget: 8 }
    };

    const config = baseConfigs[targetObjective];

    // Ajustar por intensidad seleccionada
    const intensityMultipliers = {
        conservative: { percentage: 0.95, reps: 1.2 },
        moderate: { percentage: 1.0, reps: 1.0 },
        aggressive: { percentage: 1.05, reps: 0.9 }
    };

    const mult = intensityMultipliers[intensity];

    gymTracker.currentSession.exercises.forEach((ex, exIndex) => {
        // Analizar historial del ejercicio
        const exerciseHistory = gymTracker.sessions.flatMap(s =>
            s.exercises.filter(e => e.exerciseId === ex.exerciseId)
                .flatMap(e => e.sets.filter(set => set.completed && set.weight > 0)
                    .map(set => ({ weight: set.weight, reps: set.actualReps || set.targetReps })))
        );

        let baseReps = Math.round(config.reps * mult.reps);

        // Calcular peso base de referencia (última serie/working set) sin ajuste de progresión de sesión
        let referenceWeight = Math.round(ex.rm * (85 / 100) * mult.percentage);

        // Si hay historial, ajustar basado en el último rendimiento
        if (exerciseHistory.length > 0) {
            const recentPerformances = exerciseHistory.slice(-3);
            const avgWeight = recentPerformances.reduce((sum, p) => sum + p.weight, 0) / recentPerformances.length;

            // Aplicar progresión gradual
            if (intensity === 'aggressive') {
                referenceWeight = Math.round(avgWeight * 1.025); // +2.5%
            } else if (intensity === 'moderate') {
                referenceWeight = Math.round(avgWeight * 1.01); // +1%
            } else {
                referenceWeight = Math.round(avgWeight * 0.98); // -2% (conservador)
            }
        }

        // Generar series usando porcentajes progresivos
        ex.sets = [];
        for (let i = 0; i < numSets; i++) {
            // Usar la función getProgressivePercentage que considera la sesión del mesociclo
            let setPercentage = gymTracker.getProgressivePercentage(sessionNumber, i);
            let setReps = baseReps;

            // Aplicar ajuste de intensidad al porcentaje
            setPercentage = Math.round(setPercentage * mult.percentage);
            setPercentage = Math.max(50, Math.min(95, setPercentage));

            // Calcular peso
            let setWeight = Math.round(ex.rm * (setPercentage / 100));

            // Ajustar según el objetivo
            if (targetObjective === 'strength' || targetObjective === 'power') {
                // Para fuerza/potencia: menos reps en series más pesadas
                if (setPercentage >= 85) {
                    setReps = Math.max(1, baseReps - 2);
                } else if (setPercentage >= 80) {
                    setReps = Math.max(3, baseReps - 1);
                }
            } else if (targetObjective === 'hypertrophy') {
                // Para hipertrofia: más reps en series más ligeras
                if (setPercentage <= 75) {
                    setReps = baseReps + 2;
                }
            } else if (targetObjective === 'endurance') {
                // Para resistencia: más reps en series ligeras
                if (setPercentage <= 75) {
                    setReps = baseReps + 5;
                }
            } else if (targetObjective === 'deload') {
                // Para descarga: porcentajes más bajos
                setPercentage = Math.max(50, setPercentage - 20);
            }
            
            // Ajustar para que la última serie coincida con el peso de trabajo calculado
            if (i === numSets - 1) {
                setWeight = referenceWeight;
            }
            
            ex.sets.push({
                targetReps: setReps,
                suggestedWeight: setWeight,
                percentage: setPercentage,
                weight: setWeight,
                actualReps: '',
                rpe: '',
                completed: false
            });
        }
    });
    
    // Guardar y actualizar
    localStorage.setItem('gym_current_session', JSON.stringify(gymTracker.currentSession));
    gymTracker.renderSession();
    closeModal('auto-sets-modal');
    
    const objectiveNames = {
        strength: 'Fuerza',
        hypertrophy: 'Hipertrofia',
        endurance: 'Resistencia',
        power: 'Potencia',
        deload: 'Descarga',
        mixed: 'Mixto'
    };

    const weekType = sessionNumber === 1 ? 'Acumulación' :
                    sessionNumber === 2 ? 'Intensificación' :
                    sessionNumber === 3 ? 'Realización' :
                    sessionNumber === 4 ? 'Descarga' : `Semana ${sessionNumber}`;

    gymTracker.showNotification(`Series generadas: ${objectiveNames[targetObjective]} - ${weekType}`, 'success');
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Auto-guardar sesión cada 30 segundos
setInterval(() => {
    if (gymTracker.currentSession) {
        localStorage.setItem('gym_current_session', JSON.stringify(gymTracker.currentSession));
    }
}, 30000);
