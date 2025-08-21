
import firebase from './firebase.js';

let currentUser = null;
let currentLanguage = null;
let currentLesson = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let selectedAnswer = null;
let quizScore = 0;
let correctAnswers = 0;
let userProgress = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeLearning();
    setupEventListeners();
});

function initializeLearning() {
    firebase.onAuthStateChange(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProgress();
            updateUserProgressDisplay();
        } else {
            window.location.href = 'gallery.html';
        }
    });
}

function setupEventListeners() {
    // Language selection
    document.querySelectorAll('.language-card').forEach(card => {
        card.addEventListener('click', () => {
            const language = card.dataset.language;
            selectLanguage(language);
        });
    });

    // Navigation buttons
    document.getElementById('back-to-languages')?.addEventListener('click', () => {
        showLanguageSelection();
    });

    document.getElementById('back-to-lessons')?.addEventListener('click', () => {
        showLessons(currentLanguage);
    });

    // Quiz buttons
    document.getElementById('submit-answer')?.addEventListener('click', submitAnswer);
    document.getElementById('try-again')?.addEventListener('click', restartQuiz);
    document.getElementById('next-lesson')?.addEventListener('click', nextLesson);
}

async function loadUserProgress() {
    try {
        const progressRef = firebase.doc(firebase.db, 'userProgress', currentUser.uid);
        const progressSnap = await firebase.getDoc(progressRef);
        
        if (progressSnap.exists()) {
            userProgress = progressSnap.data();
        } else {
            // Initialize user progress
            userProgress = {
                totalXP: 0,
                level: 1,
                languageProgress: {},
                completedLessons: [],
                achievements: []
            };
            await firebase.setDoc(progressRef, userProgress);
        }
        
        updateLanguageProgressDisplay();
        
    } catch (error) {
        console.error('Error loading user progress:', error);
    }
}

function updateUserProgressDisplay() {
    const progressSection = document.getElementById('user-progress');
    
    if (currentUser) {
        progressSection.classList.remove('hidden');
        
        const avatar = document.getElementById('progress-avatar');
        const username = document.getElementById('progress-username');
        const level = document.getElementById('user-level');
        const totalXP = document.getElementById('total-xp');
        const completedLessons = document.getElementById('completed-lessons');
        const currentXP = document.getElementById('current-xp');
        const nextLevelXP = document.getElementById('next-level-xp');
        const xpProgress = document.getElementById('xp-progress');
        const userTotalXP = document.getElementById('user-total-xp');
        
        if (avatar) {
            if (currentUser.photoURL) {
                avatar.src = currentUser.photoURL;
                avatar.style.display = 'block';
                avatar.onerror = () => {
                    avatar.style.display = 'none';
                };
            } else {
                avatar.style.display = 'none';
            }
        }
        
        if (username) {
            username.textContent = currentUser.displayName || 'Usuária';
        }
        
        const currentLevel = calculateLevel(userProgress.totalXP);
        const xpForCurrentLevel = getXPForLevel(currentLevel);
        const xpForNextLevel = getXPForLevel(currentLevel + 1);
        const currentLevelXP = userProgress.totalXP - xpForCurrentLevel;
        const progressPercent = (currentLevelXP / (xpForNextLevel - xpForCurrentLevel)) * 100;
        
        if (level) level.textContent = currentLevel;
        if (totalXP) totalXP.textContent = userProgress.totalXP;
        if (completedLessons) completedLessons.textContent = userProgress.completedLessons.length;
        if (currentXP) currentXP.textContent = currentLevelXP;
        if (nextLevelXP) nextLevelXP.textContent = xpForNextLevel - xpForCurrentLevel;
        if (xpProgress) xpProgress.style.width = `${Math.min(progressPercent, 100)}%`;
        if (userTotalXP) userTotalXP.textContent = `${userProgress.totalXP} XP`;
    }
}

function updateLanguageProgressDisplay() {
    document.querySelectorAll('.language-card').forEach(card => {
        const language = card.dataset.language;
        const progressData = userProgress.languageProgress[language] || { completedLessons: 0, totalLessons: 10 };
        const progressPercent = (progressData.completedLessons / progressData.totalLessons) * 100;
        
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
            progressFill.dataset.progress = progressPercent;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progressPercent)}% concluído`;
        }
    });
}

function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

function getXPForLevel(level) {
    return (level - 1) * 100;
}

async function selectLanguage(language) {
    currentLanguage = language;
    await loadLessons(language);
    showLessons(language);
}

async function loadLessons(language) {
    try {
        NetworkApp.showLoading();
        
        // Get lessons from Firebase
        const lessonsRef = firebase.collection(firebase.db, 'lessons');
        const lessonsQuery = firebase.query(
            lessonsRef,
            firebase.where('language', '==', language),
            firebase.orderBy('order', 'asc')
        );
        const lessonsSnap = await firebase.getDocs(lessonsQuery);
        
        let lessons = lessonsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // If no lessons exist, create default ones
        if (lessons.length === 0) {
            lessons = await createDefaultLessons(language);
        }
        
        displayLessons(lessons);
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        NetworkApp.showNotification('Erro ao carregar lições.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

async function createDefaultLessons(language) {
    const defaultLessons = getDefaultLessons(language);
    const createdLessons = [];
    
    for (const lesson of defaultLessons) {
        const lessonsRef = firebase.collection(firebase.db, 'lessons');
        const docRef = await firebase.addDoc(lessonsRef, lesson);
        createdLessons.push({
            id: docRef.id,
            ...lesson
        });
    }
    
    return createdLessons;
}

function getDefaultLessons(language) {
    const lessonTemplates = {
        javascript: [
            {
                title: 'Introdução ao JavaScript',
                description: 'Aprenda os conceitos básicos da linguagem JavaScript',
                language: 'javascript',
                order: 1,
                xpReward: 50,
                questions: [
                    {
                        question: 'O que é JavaScript?',
                        options: [
                            'Uma linguagem de programação para web',
                            'Um framework CSS',
                            'Um banco de dados',
                            'Um editor de texto'
                        ],
                        correct: 0,
                        explanation: 'JavaScript é uma linguagem de programação principalmente usada para desenvolvimento web.'
                    },
                    {
                        question: 'Como declarar uma variável em JavaScript?',
                        options: ['var nome', 'variable nome', 'declare nome', 'nome = variable'],
                        correct: 0,
                        explanation: 'Use "var", "let" ou "const" para declarar variáveis em JavaScript.'
                    }
                ]
            },
            {
                title: 'Variáveis e Tipos de Dados',
                description: 'Entenda como trabalhar com variáveis e diferentes tipos de dados',
                language: 'javascript',
                order: 2,
                xpReward: 60,
                questions: [
                    {
                        question: 'Qual é o tipo de dado de "Hello World"?',
                        options: ['string', 'number', 'boolean', 'object'],
                        correct: 0,
                        explanation: 'Texto entre aspas é do tipo string em JavaScript.'
                    }
                ]
            }
        ],
        python: [
            {
                title: 'Introdução ao Python',
                description: 'Primeiros passos com a linguagem Python',
                language: 'python',
                order: 1,
                xpReward: 50,
                questions: [
                    {
                        question: 'Como imprimir "Olá Mundo" em Python?',
                        options: ['print("Olá Mundo")', 'console.log("Olá Mundo")', 'echo "Olá Mundo"', 'printf("Olá Mundo")'],
                        correct: 0,
                        explanation: 'Em Python, usamos print() para exibir texto na tela.'
                    }
                ]
            }
        ],
        html: [
            {
                title: 'Estrutura HTML Básica',
                description: 'Aprenda a estrutura fundamental de um documento HTML',
                language: 'html',
                order: 1,
                xpReward: 40,
                questions: [
                    {
                        question: 'Qual tag define o título de uma página HTML?',
                        options: ['<title>', '<header>', '<h1>', '<head>'],
                        correct: 0,
                        explanation: 'A tag <title> define o título que aparece na aba do navegador.'
                    }
                ]
            }
        ]
    };
    
    return lessonTemplates[language] || [];
}

function showLanguages() {
    document.getElementById('lessons-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.querySelector('.languages-grid').parentElement.classList.remove('hidden');
}

function showLanguageSelection() {
    showLanguages();
    currentLanguage = null;
}

function showLessons(language) {
    document.querySelector('.languages-grid').parentElement.classList.add('hidden');
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('lessons-section').classList.remove('hidden');
    
    document.getElementById('current-language-title').textContent = getLanguageDisplayName(language);
}

function displayLessons(lessons) {
    const lessonsList = document.getElementById('lessons-list');
    
    lessonsList.innerHTML = lessons.map((lesson, index) => {
        const isCompleted = userProgress.completedLessons.includes(lesson.id);
        const isLocked = index > 0 && !userProgress.completedLessons.includes(lessons[index - 1].id);
        
        return `
            <div class="lesson-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}" 
                 data-lesson-id="${lesson.id}" ${!isLocked ? 'onclick="startLesson(\'' + lesson.id + '\')"' : ''}>
                <div class="lesson-header">
                    <div class="lesson-number">${lesson.order}</div>
                    <div class="lesson-status">
                        ${isCompleted ? '<i class="fas fa-check-circle completed"></i>' : 
                          isLocked ? '<i class="fas fa-lock locked"></i>' : 
                          '<i class="fas fa-play-circle"></i>'}
                    </div>
                </div>
                <div class="lesson-content">
                    <h3 class="lesson-title">${lesson.title}</h3>
                    <p class="lesson-description">${lesson.description}</p>
                    <div class="lesson-stats">
                        <span>${lesson.questions.length} perguntas</span>
                        <span class="lesson-xp">+${lesson.xpReward} XP</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getLanguageDisplayName(language) {
    const names = {
        javascript: 'JavaScript',
        python: 'Python',
        html: 'HTML/CSS',
        react: 'React',
        java: 'Java',
        csharp: 'C#'
    };
    return names[language] || language;
}

async function startLesson(lessonId) {
    try {
        NetworkApp.showLoading();
        
        const lessonRef = firebase.doc(firebase.db, 'lessons', lessonId);
        const lessonSnap = await firebase.getDoc(lessonRef);
        
        if (lessonSnap.exists()) {
            currentLesson = { id: lessonId, ...lessonSnap.data() };
            startQuiz(currentLesson);
        }
        
    } catch (error) {
        console.error('Error starting lesson:', error);
        NetworkApp.showNotification('Erro ao iniciar lição.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

function startQuiz(lesson) {
    currentQuiz = lesson;
    currentQuestionIndex = 0;
    selectedAnswer = null;
    quizScore = 0;
    correctAnswers = 0;
    
    showQuizSection();
    displayQuestion();
}

function showQuizSection() {
    document.getElementById('lessons-section').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');
}

function displayQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    document.getElementById('quiz-question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('quiz-total-questions').textContent = currentQuiz.questions.length;
    document.getElementById('quiz-question').textContent = question.question;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <div class="quiz-option" data-option="${index}">
            ${option}
        </div>
    `).join('');
    
    // Add click listeners to options
    optionsContainer.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', () => {
            selectOption(parseInt(option.dataset.option));
        });
    });
    
    document.getElementById('submit-answer').disabled = true;
    document.getElementById('quiz-feedback').classList.add('hidden');
}

function selectOption(optionIndex) {
    selectedAnswer = optionIndex;
    
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-option="${optionIndex}"]`).classList.add('selected');
    document.getElementById('submit-answer').disabled = false;
}

function submitAnswer() {
    const question = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correct;
    
    if (isCorrect) {
        correctAnswers++;
        quizScore += 10;
    }
    
    // Show feedback
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `
        <div>
            <strong>${isCorrect ? 'Correto!' : 'Incorreto'}</strong>
            <p>${question.explanation}</p>
        </div>
    `;
    
    // Highlight correct/incorrect options
    document.querySelectorAll('.quiz-option').forEach((option, index) => {
        if (index === question.correct) {
            option.classList.add('correct');
        } else if (index === selectedAnswer && !isCorrect) {
            option.classList.add('incorrect');
        }
    });
    
    // Update submit button
    const submitBtn = document.getElementById('submit-answer');
    submitBtn.textContent = currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Próxima Pergunta' : 'Finalizar Quiz';
    submitBtn.onclick = nextQuestion;
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuiz.questions.length) {
        displayQuestion();
        document.getElementById('submit-answer').onclick = submitAnswer;
        document.getElementById('submit-answer').textContent = 'Responder';
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    const earnedXP = Math.floor((correctAnswers / currentQuiz.questions.length) * currentQuiz.xpReward);
    
    // Update user progress
    await updateUserProgress(earnedXP);
    
    // Show results
    showQuizResults(earnedXP);
    
    // Send achievement notification
    if (correctAnswers === currentQuiz.questions.length) {
        await sendNotification('achievement', 'Quiz Perfeito!', `Parabéns! Você acertou todas as ${currentQuiz.questions.length} perguntas em "${currentQuiz.title}".`);
    }
}

async function updateUserProgress(earnedXP) {
    try {
        userProgress.totalXP += earnedXP;
        
        if (!userProgress.completedLessons.includes(currentLesson.id)) {
            userProgress.completedLessons.push(currentLesson.id);
        }
        
        // Update language progress
        if (!userProgress.languageProgress[currentLanguage]) {
            userProgress.languageProgress[currentLanguage] = { completedLessons: 0, totalLessons: 10 };
        }
        userProgress.languageProgress[currentLanguage].completedLessons++;
        
        // Save to Firebase
        const progressRef = firebase.doc(firebase.db, 'userProgress', currentUser.uid);
        await firebase.updateDoc(progressRef, userProgress);
        
        updateUserProgressDisplay();
        
    } catch (error) {
        console.error('Error updating user progress:', error);
    }
}

function showQuizResults(earnedXP) {
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    
    document.getElementById('correct-answers').textContent = correctAnswers;
    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('earned-xp').textContent = earnedXP;
}

function restartQuiz() {
    startQuiz(currentLesson);
}

function nextLesson() {
    showLessons(currentLanguage);
    loadLessons(currentLanguage);
}

async function sendNotification(type, title, message) {
    try {
        const notification = {
            type,
            title,
            message,
            read: false,
            createdAt: new Date(),
            icon: type === 'achievement' ? 'fas fa-trophy' : 'fas fa-graduation-cap'
        };
        
        const notificationsRef = firebase.collection(firebase.db, 'notifications', currentUser.uid, 'items');
        await firebase.addDoc(notificationsRef, notification);
        
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Global functions
window.startLesson = startLesson;
window.selectOption = selectOption;
