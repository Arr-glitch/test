/**
 * Interactive English Learning Book
 * This script handles the dynamic loading of content,
 * user interaction with questions, progress tracking,
 * and UI updates for an interactive English learning application.
 */

// Configuration for final submission behavior
const REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION = false; // Set to true to require all questions to be checked before final submission, false to allow submission anytime.

class InteractiveBook {
    constructor() {
        this.currentChapter = 0; // Current active chapter index
        this.chapters = [];      // Stores loaded chapter data from JSON
        // userAnswers will now store objects: { answer: value, isCorrect: boolean }
        this.userAnswers = {};   // Stores user's answers for each question (key: q_chapterIndex_questionIndex, value: { answer: any, isCorrect: boolean })
        this.stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            chaptersCompleted: 0
        };
        // User information
        this.userName = '';
        this.userItqanId = '';

        // DOM elements references
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.totalScoreSpan = document.getElementById('totalScore');
        this.totalQuestionsSpan = document.getElementById('totalQuestions');
        this.chapterNavTop = document.getElementById('chapterNavTop'); // Reference to top navigation
        this.chapterNavBottom = document.getElementById('chapterNavBottom'); // Reference to bottom navigation
        this.bookContent = document.getElementById('bookContent');
        this.progressFill = document.getElementById('progressFill');
        this.correctAnswersStat = document.getElementById('correctAnswers');
        this.accuracyStat = document.getElementById('accuracy');
        this.chaptersCompletedStat = document.getElementById('chaptersCompleted');

        // Modal elements
        this.userInfoModal = document.getElementById('userInfoModal');
        this.userNameInput = document.getElementById('userNameInput');
        this.itqanIdInput = document.getElementById('itqanIdInput');
        this.startLearningBtn = document.getElementById('startLearningBtn');
        this.userInfoMessage = document.getElementById('userInfoMessage');

        this.finalScoreModal = document.getElementById('finalScoreModal');
        this.finalUserNameSpan = document.getElementById('finalUserName');
        this.finalItqanIdSpan = document.getElementById('finalItqanId');
        this.finalScoreDisplay = document.getElementById('finalScoreDisplay');
        this.finalTotalQuestions = document.getElementById('finalTotalQuestions');

        // New "Finish All Questions" button
        this.finishAllQuestionsBtn = document.getElementById('finishAllQuestionsBtn');

        this.init(); // Initialize the book
    }

    /**
     * Initializes the book by loading content and setting up the UI.
     */
    async init() {
        this.showLoading(true); // Show loading indicator initially
        
        // First, prompt for user info. The loading indicator will remain visible behind the modal.
        await this.promptForUserInfo();

        // After user info is submitted, proceed with loading content and rendering
        try {
            await this.loadContent(); // Load content from JSON
            this.renderChapterNavigation(); // Create chapter navigation buttons
            
            // Attempt to load saved progress, otherwise show the first chapter
            if (this.loadProgress()) {
                // If progress loaded, ensure the UI reflects the loaded chapter
                this.showChapter(this.currentChapter, false); // Don't save progress immediately after loading
            } else {
                this.showChapter(0); // Show first chapter if no saved progress
            }
            
            this.updateStats(); // Update statistics display
            
            // Add event listener for the new "Finish All Questions" button
            if (this.finishAllQuestionsBtn) {
                this.finishAllQuestionsBtn.addEventListener('click', () => this.checkCompletionAndShowScore());
            }

        } catch (error) {
            console.error('Failed to initialize book:', error);
            // Display an error message to the user
            this.bookContent.innerHTML = `
                <div class="loading" style="display: block;">
                    <p style="color: #f56565;">Error loading content. Please try again later.</p>
                </div>
            `;
        } finally {
            this.showLoading(false); // Hide loading indicator after everything is loaded/rendered
        }
    }

    /**
     * Prompts the user for their name and ITQAN ID using a custom modal.
     * Returns a Promise that resolves when the user submits valid information.
     */
    promptForUserInfo() {
        return new Promise(resolve => {
            this.userInfoModal.style.display = 'flex'; // Show the modal

            // Load saved user info if available
            try {
                const savedUserInfo = localStorage.getItem('englishBookUserInfo');
                if (savedUserInfo) {
                    const userInfo = JSON.parse(savedUserInfo);
                    this.userNameInput.value = userInfo.name || '';
                    this.itqanIdInput.value = userInfo.itqanId || '';
                    this.userName = userInfo.name || '';
                    this.userItqanId = userInfo.itqanId || '';
                }
            } catch (e) {
                console.error('Error loading user info from localStorage:', e);
            }

            const handleSubmit = () => {
                const name = this.userNameInput.value.trim();
                const itqanId = this.itqanIdInput.value.trim();

                if (name && itqanId) {
                    this.userName = name;
                    this.userItqanId = itqanId;
                    try {
                        localStorage.setItem('englishBookUserInfo', JSON.stringify({ name: this.userName, itqanId: this.userItqanId }));
                    } catch (e) {
                        console.error('Error saving user info to localStorage:', e);
                    }
                    this.userInfoModal.style.display = 'none'; // Hide the modal
                    this.startLearningBtn.removeEventListener('click', handleSubmit); // Clean up listener
                    resolve(); // Resolve the promise to continue initialization
                } else {
                    this.userInfoMessage.textContent = 'Please enter both your name and ITQAN ID.';
                }
            };

            this.startLearningBtn.addEventListener('click', handleSubmit);
            
            // Allow pressing Enter in input fields to submit
            this.userNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSubmit();
            });
            this.itqanIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSubmit();
            });
        });
    }

    /**
     * Toggles the visibility of the loading indicator.
     * @param {boolean} show - True to show, false to hide.
     */
    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Loads chapter content from the external 'content.json' file.
     * If loading fails, it falls back to default content (though in a production
     * environment, you'd want robust error handling or a pre-bundled fallback).
     */
    async loadContent() {
        try {
            const response = await fetch('./content.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.chapters = data.chapters;
            this.calculateTotalQuestions(); // Calculate total questions based on loaded content
        } catch (error) {
            console.error('Error fetching content.json:', error);
            // Fallback to a simple error message or default content if necessary
            // For this example, we'll just log the error and let the init() catch it.
            throw new Error('Could not load content.json. Please ensure the file exists and is accessible.');
        }
    }

    /**
     * Calculates the total number of questions across all chapters.
     */
    calculateTotalQuestions() {
        this.stats.totalQuestions = this.chapters.reduce((total, chapter) => {
            return total + chapter.questions.length;
        }, 0);
        this.totalQuestionsSpan.textContent = this.stats.totalQuestions;
    }

    /**
     * Renders the navigation buttons for each chapter.
     */
    renderChapterNavigation() {
        if (!this.chapterNavTop || !this.chapterNavBottom || !this.chapters.length) return;

        const navHtml = this.chapters.map((chapter, index) =>
            `<button class="chapter-btn ${index === this.currentChapter ? 'active' : ''}" onclick="book.showChapter(${index})">
                ${index + 1}. ${chapter.title}
            </button>`
        ).join('');

        this.chapterNavTop.innerHTML = navHtml;
        this.chapterNavBottom.innerHTML = navHtml; // Render to both top and bottom
    }

    /**
     * Displays a specific chapter's content and questions.
     * @param {number} index - The index of the chapter to show.
     * @param {boolean} saveProgressAfterShow - Whether to save progress after showing the chapter. Default is true.
     */
    showChapter(index, saveProgressAfterShow = true) {
        if (index < 0 || index >= this.chapters.length) {
            console.warn('Chapter index out of bounds:', index);
            return;
        }

        this.currentChapter = index;

        // Update navigation button active state for both top and bottom navs
        document.querySelectorAll('.chapter-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        const chapter = this.chapters[index];
        if (!chapter) {
            this.bookContent.innerHTML = '<div class="loading" style="display: block;"><p>Chapter content not found.</p></div>';
            return;
        }

        // Render chapter content and questions
        this.bookContent.innerHTML = `
            <div class="chapter active">
                <h2>${chapter.title}</h2>
                <div class="lesson-content">
                    <h3>Reading Passage</h3>
                    <p>${chapter.content.passage}</p>
                    ${chapter.content.explanation ? `
                        <h3>Explanation</h3>
                        <p>${chapter.content.explanation}</p>
                    ` : ''}
                </div>
                <div class="questions">
                    ${chapter.questions.map((q, i) => this.renderQuestion(q, index, i)).join('')}
                </div>
                <div class="chapter-actions">
                    <button class="btn check-chapter-btn" id="checkChapterBtn" onclick="book.checkCurrentChapterAnswers()">Check Chapter Answers</button>
                </div>
            </div>
        `;

        this.initializeDragDrop(); // Re-initialize drag-drop listeners for new content
        this.updateProgress(); // Update progress bar
        this.applyUserAnswersToChapter(); // Apply previously saved answers to the rendered chapter

        // After rendering, check if the chapter has already been checked and disable the button
        const chapterAlreadyChecked = chapter.questions.every((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            // A question is considered 'answered' if its entry exists in userAnswers AND has an isCorrect status
            return this.userAnswers[questionId] !== undefined && this.userAnswers[questionId].isCorrect !== undefined; 
        });

        if (chapterAlreadyChecked) {
            const checkBtn = document.getElementById('checkChapterBtn');
            if (checkBtn) {
                checkBtn.disabled = true;
            }
        }

        if (saveProgressAfterShow) {
            this.saveProgress(); // Save progress after showing the chapter
        }
    }

    /**
     * Renders a single question based on its type.
     * Removed individual "Check Answer" buttons.
     * @param {object} question - The question object from content.json.
     * @param {number} chapterIndex - The index of the current chapter.
     * @param {number} questionIndex - The index of the question within the chapter.
     * @returns {string} HTML string for the question.
     */
    renderQuestion(question, chapterIndex, questionIndex) {
        const questionId = `q_${chapterIndex}_${questionIndex}`;
        const userAnswerData = this.userAnswers[questionId]; // Get the stored answer data
        const userAnswer = userAnswerData ? userAnswerData.answer : undefined; // Extract the answer value
        const isQuestionChecked = userAnswerData && userAnswerData.isCorrect !== undefined; // True if question has been checked

        let questionHtml = '';

        switch (question.type) {
            case 'multiple-choice':
                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="options">
                            ${question.options.map((option, i) =>
                                `<div class="option ${userAnswer === i && !isQuestionChecked ? 'selected' : ''}"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})"
                                      ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                    ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'fill-in-blank':
                questionHtml = `
                    <div class="question-container input-question">
                        <div class="question">${question.question}</div>
                        <input type="text" id="input_${questionId}" placeholder="Type your answer here..."
                               value="${userAnswer !== undefined ? userAnswer : ''}"
                               ${isQuestionChecked ? 'disabled' : ''}>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'drag-drop':
                // For drag-drop, items need to be re-randomized if not already answered
                const itemsToDisplay = (userAnswerData && userAnswerData.answer && userAnswerData.answer.droppedItems) ? userAnswerData.answer.droppedItems : [...question.items].sort(() => Math.random() - 0.5);
                const dropZoneContent = (userAnswerData && userAnswerData.answer && userAnswerData.answer.dropZones) ? userAnswerData.answer.dropZones : Array(question.correct.length).fill('Drop here');

                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="drag-drop" id="dragdrop_${questionId}">
                            <div class="drag-items" ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                ${itemsToDisplay.map((item, i) =>
                                    // Only render if the item hasn't been dropped or if the question hasn't been checked
                                    (dropZoneContent.includes(item) && isQuestionChecked) ? '' : `<div class="drag-item" draggable="true" data-item="${item}">${item}</div>`
                                ).join('')}
                            </div>
                            <div class="drop-zones" ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                ${dropZoneContent.map((content, i) =>
                                    `<div class="drop-zone ${content !== 'Drop here' ? 'filled' : ''}" data-position="${i}">
                                        ${content}
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'reading-passage':
                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="options">
                            ${question.options.map((option, i) =>
                                `<div class="option ${userAnswer === i && !isQuestionChecked ? 'selected' : ''}"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})"
                                      ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                    ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            default:
                questionHtml = `<div class="question-container"><p>Unsupported question type: ${question.type}</p></div>`;
                break;
        }
        return questionHtml;
    }

    /**
     * Checks all answers for the current chapter.
     * This replaces individual "Check Answer" buttons per question.
     */
    checkCurrentChapterAnswers() {
        const chapter = this.chapters[this.currentChapter];
        let allQuestionsAttemptedInChapter = true; // Flag to ensure all questions in the chapter have an attempt

        chapter.questions.forEach((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            const feedbackElement = document.getElementById(`feedback_${questionId}`);
            let userAnswer;
            let isCorrect;
            let currentQuestionAttempted = true; // Flag for individual question attempt in this check

            // If question has already been checked, skip re-evaluation but re-apply feedback
            if (this.userAnswers[questionId] && this.userAnswers[questionId].isCorrect !== undefined) {
                this.applyFeedbackForQuestion(questionId, q, this.userAnswers[questionId].answer, this.userAnswers[questionId].isCorrect);
                return; 
            }

            if (q.type === 'multiple-choice' || q.type === 'reading-passage') {
                const container = feedbackElement.closest('.question-container');
                const selectedOption = container.querySelector('.option.selected');
                userAnswer = selectedOption ? parseInt(selectedOption.dataset.optionIndex) : undefined;

                if (userAnswer === undefined) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">Please select an answer.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = (Array.isArray(q.correct) && q.correct.includes(userAnswer)) || (!Array.isArray(q.correct) && userAnswer === q.correct);
                    // Store the answer and its correctness
                    this.userAnswers[questionId] = { answer: userAnswer, isCorrect: isCorrect };
                }

            } else if (q.type === 'fill-in-blank') {
                const inputElement = document.getElementById(`input_${questionId}`);
                userAnswer = inputElement.value.trim();
                if (!userAnswer) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">Please enter an answer.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = (Array.isArray(q.correct) && q.correct.map(s => s.toLowerCase()).includes(userAnswer.toLowerCase())) || (!Array.isArray(q.correct) && userAnswer.toLowerCase() === q.correct.toLowerCase());
                    // Store the answer and its correctness
                    this.userAnswers[questionId] = { answer: userAnswer, isCorrect: isCorrect };
                }

            } else if (q.type === 'drag-drop') {
                const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
                const currentDropZoneContent = Array.from(dropZones).map(zone => zone.textContent.trim());
                
                if (currentDropZoneContent.some(text => text === 'Drop here' || text === '')) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">Please fill all positions.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = JSON.stringify(currentDropZoneContent) === JSON.stringify(q.correct);
                    // Store the answer and its correctness (including dropped items state for re-render)
                    this.userAnswers[questionId] = { answer: { dropZones: currentDropZoneContent, droppedItems: [] }, isCorrect: isCorrect }; 
                }
            }

            // If any question in the chapter was not attempted in this check, set overall flag to false
            if (!currentQuestionAttempted) {
                allQuestionsAttemptedInChapter = false;
            } else {
                // Apply feedback and confetti for newly checked questions
                this.applyFeedbackForQuestion(questionId, q, userAnswer, isCorrect);
                if (isCorrect) showConfetti();
            }
        });

        // After all questions in the chapter are processed, disable the button if all were attempted
        if (allQuestionsAttemptedInChapter) {
             document.getElementById('checkChapterBtn').disabled = true;
             this.showCustomMessage('Chapter answers checked!', 'success');
        } else {
            this.showCustomMessage('Please answer all questions in the chapter before checking!', 'info');
        }
        this.updateStats(); // Update global stats based on all changes
        this.saveProgress(); // Save progress after checking the chapter
    }

    /**
     * Helper to apply feedback and styling to a single question.
     * @param {string} questionId - The ID of the question.
     * @param {object} question - The question object.
     * @param {*} userAnswer - The user's answer.
     * @param {boolean} isCorrect - Whether the answer is correct.
     */
    applyFeedbackForQuestion(questionId, question, userAnswer, isCorrect) {
        const feedbackElement = document.getElementById(`feedback_${questionId}`);
        if (!feedbackElement) return;

        // Only show correct/incorrect, not the actual correct answer or feedback text
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
            </div>
        `;

        // Disable interaction elements and apply correct/incorrect styling
        if (question.type === 'multiple-choice' || question.type === 'reading-passage') {
            const container = feedbackElement.closest('.question-container');
            const options = container.querySelectorAll('.option');
            options.forEach(option => {
                option.style.pointerEvents = 'none'; // Disable interaction
                option.classList.remove('selected'); // Remove any temporary selection
                const optionIndex = parseInt(option.dataset.optionIndex);
                if (isCorrect && (optionIndex === question.correct || (Array.isArray(question.correct) && question.correct.includes(optionIndex)))) {
                    option.classList.add('correct');
                } else if (!isCorrect && optionIndex === userAnswer) {
                    option.classList.add('incorrect');
                }
            });
        } else if (question.type === 'fill-in-blank') {
            const inputElement = document.getElementById(`input_${questionId}`);
            if (inputElement) inputElement.disabled = true; // Disable input
        } else if (question.type === 'drag-drop') {
            const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
            const dragItemsContainer = document.querySelector(`#dragdrop_${questionId} .drag-items`);
            
            dropZones.forEach((zone, index) => {
                zone.style.pointerEvents = 'none'; // Disable dropping
                // Re-apply correct/incorrect background based on the stored answer
                if (userAnswer && userAnswer.dropZones && userAnswer.dropZones[index] === question.correct[index]) {
                    zone.style.backgroundColor = '#c6f6d5';
                    zone.style.borderColor = '#48bb78';
                } else if (userAnswer && userAnswer.dropZones) { // If answered but incorrect
                    zone.style.backgroundColor = '#fed7d7';
                    zone.style.borderColor = '#f56565';
                }
            });
            if (dragItemsContainer) dragItemsContainer.style.pointerEvents = 'none'; // Disable dragging
        }
    }


    /**
     * Applies previously saved user answers to the currently rendered chapter.
     * This ensures that when a user navigates back to a chapter, their answers are displayed.
     */
    applyUserAnswersToChapter() {
        const chapterQuestions = this.chapters[this.currentChapter].questions;
        let chapterFullyAnswered = true; // Track if all questions in this chapter have been answered

        chapterQuestions.forEach((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            const userAnswerData = this.userAnswers[questionId]; // Get the stored answer data
            
            if (userAnswerData && userAnswerData.isCorrect !== undefined) { // Check if the question has been checked
                this.applyFeedbackForQuestion(questionId, q, userAnswerData.answer, userAnswerData.isCorrect);
            } else if (userAnswerData && userAnswerData.answer !== undefined) { // Question attempted but not yet checked
                // For multiple-choice/reading-passage, re-apply 'selected' class
                if (q.type === 'multiple-choice' || q.type === 'reading-passage') {
                    const container = document.querySelector(`#feedback_${questionId}`).closest('.question-container');
                    const options = container.querySelectorAll('.option');
                    options.forEach(option => {
                        if (parseInt(option.dataset.optionIndex) === userAnswerData.answer) {
                            option.classList.add('selected');
                        } else {
                            option.classList.remove('selected');
                        }
                        // Ensure interactivity is enabled if not yet checked
                        option.style.pointerEvents = 'auto'; 
                    });
                } else if (q.type === 'fill-in-blank') {
                    const inputElement = document.getElementById(`input_${questionId}`);
                    if (inputElement) inputElement.disabled = false; // Ensure input is enabled
                } else if (q.type === 'drag-drop') {
                    const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
                    const dragItemsContainer = document.querySelector(`#dragdrop_${questionId} .drag-items`);
                    if (dropZones) dropZones.forEach(zone => zone.style.pointerEvents = 'auto');
                    if (dragItemsContainer) dragItemsContainer.style.pointerEvents = 'auto';
                }
                chapterFullyAnswered = false; // This chapter is not fully checked yet
            } else {
                chapterFullyAnswered = false; // At least one question in this chapter is not answered
            }
        });

        // Disable the chapter's "Check Chapter Answers" button if all questions in it are answered
        const checkBtn = document.getElementById('checkChapterBtn');
        if (checkBtn) {
            checkBtn.disabled = chapterFullyAnswered;
        }
    }

    /**
     * Handles option selection for multiple-choice and reading-passage questions.
     * @param {string} questionId - The ID of the question.
     * @param {number} optionIndex - The index of the selected option.
     */
    selectOption(questionId, optionIndex) {
        const container = document.querySelector(`#feedback_${questionId}`).closest('.question-container');
        const options = container.querySelectorAll('.option');

        // For single-choice, remove 'selected' from all, then add to the clicked one.
        options.forEach(option => option.classList.remove('selected'));
        options[optionIndex].classList.add('selected');

        // Store the selection. It will be officially saved with isCorrect status when "Check Chapter Answers" is clicked.
        this.userAnswers[questionId] = { answer: optionIndex, isCorrect: undefined }; // isCorrect is undefined until checked
    }

    /**
     * Updates the displayed statistics (score, accuracy, chapters completed)
     * and the progress bar.
     */
    updateStats() {
        // Count all questions that have been attempted (have an entry in userAnswers)
        const attemptedQuestionsCount = Object.keys(this.userAnswers).length;

        // Recalculate correct answers from scratch to ensure accuracy
        let currentCorrectAnswers = 0;
        Object.values(this.userAnswers).forEach(answerData => {
            if (answerData && answerData.isCorrect === true) { // Explicitly check for true
                currentCorrectAnswers++;
            }
        });
        this.stats.correctAnswers = currentCorrectAnswers;

        const accuracy = attemptedQuestionsCount > 0 ? Math.round((this.stats.correctAnswers / attemptedQuestionsCount) * 100) : 0;
        
        this.totalScoreSpan.textContent = this.stats.correctAnswers;
        this.correctAnswersStat.textContent = this.stats.correctAnswers;
        this.accuracyStat.textContent = accuracy + '%';
        
        // Update chapters completed based on all questions in a chapter being answered AND checked
        let completedCount = 0;
        this.chapters.forEach((chapter, chapIndex) => {
            const chapterQuestions = chapter.questions.length;
            const checkedInChapter = chapter.questions.filter((q, qIndex) => {
                const qId = `q_${chapIndex}_${qIndex}`;
                return this.userAnswers[qId] !== undefined && this.userAnswers[qId].isCorrect !== undefined;
            }).length;

            if (checkedInChapter === chapterQuestions && chapterQuestions > 0) {
                completedCount++;
            }
        });
        this.stats.chaptersCompleted = completedCount;
        this.chaptersCompletedStat.textContent = this.stats.chaptersCompleted;
        
        this.updateProgress(); // Update progress bar

        // Enable/disable "Finish All Questions" button based on configuration
        if (this.finishAllQuestionsBtn) {
            if (REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION) {
                const allQuestionsChecked = Object.values(this.userAnswers).filter(ad => ad.isCorrect !== undefined).length;
                this.finishAllQuestionsBtn.disabled = !(allQuestionsChecked === this.stats.totalQuestions && this.stats.totalQuestions > 0);
            } else {
                this.finishAllQuestionsBtn.disabled = false; // Always enabled if not required
            }
        }
    }

    /**
     * Checks if all questions have been answered and displays the final score modal.
     */
    checkCompletionAndShowScore() {
        if (REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION) {
            const allQuestionsChecked = Object.values(this.userAnswers).filter(ad => ad.isCorrect !== undefined).length;
            if (allQuestionsChecked === this.stats.totalQuestions && this.stats.totalQuestions > 0) {
                this.displayFinalScore();
            } else {
                this.showCustomMessage('Please answer and check all questions across all chapters before finishing!', 'info');
            }
        } else {
            // If not required, just display the score
            this.displayFinalScore();
        }
    }

    /**
     * Displays the final score modal with user's name, ID, and score.
     */
    displayFinalScore() {
        this.finalUserNameSpan.textContent = this.userName;
        this.finalItqanIdSpan.textContent = this.userItqanId;
        this.finalScoreDisplay.textContent = this.stats.correctAnswers;
        this.finalTotalQuestions.textContent = this.stats.totalQuestions;
        this.finalScoreModal.style.display = 'flex'; // Show the final score modal
    }

    /**
     * Hides the final score modal.
     */
    hideFinalScoreModal() {
        this.finalScoreModal.style.display = 'none';
        // Optionally, reset progress or navigate to a start screen here
        // For now, it just closes the modal.
    }

    /**
     * Updates the width of the progress bar based on overall progress.
     */
    updateProgress() {
        const attemptedQuestionsCount = Object.keys(this.userAnswers).length;

        const progressPercentage = this.stats.totalQuestions > 0 ? (attemptedQuestionsCount / this.stats.totalQuestions) * 100 : 0;
        this.progressFill.style.width = progressPercentage + '%';
    }

    /**
     * Saves the current progress (user answers, stats, current chapter, user info) to localStorage.
     */
    saveProgress() {
        const progress = {
            userAnswers: this.userAnswers,
            stats: this.stats,
            currentChapter: this.currentChapter,
            userName: this.userName, // Save user info
            userItqanId: this.userItqanId // Save user info
        };
        try {
            localStorage.setItem('englishBookProgress', JSON.stringify(progress));
            console.log('Progress saved successfully!');
        } catch (e) {
            console.error('Cannot save progress - localStorage not available or quota exceeded:', e);
            // Inform the user if saving failed
            // Using a custom message box instead of alert()
            this.showCustomMessage('Could not save progress. Your browser might be in private mode or storage is full.', 'error');
        }
    }

    /**
     * Loads saved progress from localStorage.
     * @returns {boolean} True if progress was loaded, false otherwise.
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('englishBookProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.userAnswers = progress.userAnswers || {};
                this.stats = { ...this.stats, ...progress.stats }; // Merge loaded stats
                this.currentChapter = progress.currentChapter || 0;
                this.userName = progress.userName || ''; // Load user info
                this.userItqanId = progress.userItqanId || ''; // Load user info
                console.log('Progress loaded successfully!');
                return true;
            }
        } catch (e) {
            console.error('Cannot load progress - localStorage not available or data corrupted:', e);
            // Using a custom message box instead of alert()
            this.showCustomMessage('Could not load saved progress. Your browser might be in private mode or data is corrupted.', 'error');
        }
        return false;
    }

    /**
     * Resets all user progress and statistics.
     */
    resetProgress() {
        // Using a custom confirmation dialog
        this.showConfirmDialog('Are you sure you want to reset all your progress? This cannot be undone.', () => {
            this.userAnswers = {};
            this.stats = {
                totalQuestions: this.stats.totalQuestions, // Keep total questions, reset others
                correctAnswers: 0,
                chaptersCompleted: 0
            };
            this.currentChapter = 0;
            this.userName = ''; // Reset user info
            this.userItqanId = ''; // Reset user info
            try {
                localStorage.removeItem('englishBookProgress');
                localStorage.removeItem('englishBookUserInfo'); // Also clear user info
                console.log('Progress reset successfully!');
            } catch (e) {
                console.error('Cannot clear progress - localStorage not available:', e);
            }
            this.updateStats(); // Update UI to reflect reset
            this.showChapter(0); // Show the first chapter
            // Re-prompt for user info after reset
            this.promptForUserInfo();
            this.showCustomMessage('Progress reset successfully!', 'success');
        });
    }

    /**
     * Exports the user's progress as a JSON file.
     */
    exportProgress() {
        const progress = {
            userName: this.userName,
            userItqanId: this.userItqanId,
            userAnswers: this.userAnswers,
            stats: this.stats,
            currentChapter: this.currentChapter,
            timestamp: new Date().toISOString(),
            // Optionally, include chapter titles for context
            chapterTitles: this.chapters.map(chap => chap.title)
        };
        
        const dataStr = JSON.stringify(progress, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `english_learning_progress_${this.userName.replace(/\s/g, '_') || 'user'}.json`;
        document.body.appendChild(link); // Append to body to make it clickable
        link.click(); // Programmatically click the link to trigger download
        document.body.removeChild(link); // Clean up the temporary link
        URL.revokeObjectURL(link.href); // Release the object URL
        this.showCustomMessage('Progress exported successfully!', 'success');
    }

    /**
     * Shows a custom message box (replaces alert()).
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', or 'info' for styling.
     */
    showCustomMessage(message, type) {
        const messageBox = document.createElement('div');
        messageBox.classList.add('custom-message-box', type);
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        // Position it nicely (e.g., top center)
        messageBox.style.position = 'fixed';
        messageBox.style.top = '20px';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translateX(-50%)';
        messageBox.style.padding = '15px 25px';
        messageBox.style.borderRadius = '10px';
        messageBox.style.zIndex = '10000';
        messageBox.style.color = 'white';
        messageBox.style.fontWeight = 'bold';
        messageBox.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        messageBox.style.opacity = '0';
        messageBox.style.transition = 'opacity 0.3s ease-in-out, top 0.3s ease-in-out';

        if (type === 'success') messageBox.style.backgroundColor = '#4CAF50';
        else if (type === 'error') messageBox.style.backgroundColor = '#f44336';
        else messageBox.style.backgroundColor = '#2196F3';

        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.top = '30px'; // Slide down slightly
        }, 10);

        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.top = '10px'; // Slide up and fade out
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000); // Message disappears after 3 seconds
    }

    /**
     * Shows a custom confirmation dialog (replaces confirm()).
     * @param {string} message - The message to display.
     * @param {function} onConfirm - Callback function if user confirms.
     */
    showConfirmDialog(message, onConfirm) {
        const confirmOverlay = document.createElement('div');
        confirmOverlay.classList.add('modal-overlay'); // Reuse modal-overlay style
        confirmOverlay.style.display = 'flex'; // Ensure it's visible

        confirmOverlay.innerHTML = `
            <div class="modal-content">
                <h2>Confirmation</h2>
                <p>${message}</p>
                <div style="margin-top: 20px;">
                    <button class="btn" id="confirmYes" style="margin-right: 10px;">Yes</button>
                    <button class="btn" id="confirmNo">No</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmOverlay);

        const confirmYesBtn = document.getElementById('confirmYes');
        const confirmNoBtn = document.getElementById('confirmNo');

        const cleanup = () => {
            confirmYesBtn.removeEventListener('click', handleYes);
            confirmNoBtn.removeEventListener('click', handleNo);
            confirmOverlay.remove();
        };

        const handleYes = () => {
            onConfirm();
            cleanup();
        };

        const handleNo = () => {
            cleanup();
        };

        confirmYesBtn.addEventListener('click', handleYes);
        confirmNoBtn.addEventListener('click', handleNo);
    }
}

// Global instance of the InteractiveBook
let book;

// Initialize the book when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    book = new InteractiveBook();
});

/**
 * Utility function to show a simple confetti animation.
 * This is a visual flourish for correct answers.
 */
function showConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a2d2ff', '#ffcbf2'];
    const confettiCount = 70; // More confetti!
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = Math.random() * 8 + 5 + 'px'; // Random size
            confetti.style.height = confetti.style.width;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.borderRadius = '50%';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            confetti.style.transition = `all ${2 + Math.random() * 2}s ease-out`; // Random duration
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`; // Initial random rotation
            
            document.body.appendChild(confetti);
            
            // Animate confetti falling and fading
            setTimeout(() => {
                confetti.style.top = '100vh';
                confetti.style.left = `${parseFloat(confetti.style.left) + (Math.random() - 0.5) * 50}px`; // Drift left/right
                confetti.style.transform = `rotate(${720 + Math.random() * 360}deg)`; // Spin more
                confetti.style.opacity = '0';
            }, 50); // Small delay to apply initial styles before transition
            
            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, (2 + Math.random() * 2) * 1000 + 100); // Match transition duration + cleanup buffer
        }, i * 30); // Stagger confetti appearance
    }
}

/**
 * Handles keyboard navigation for chapters (ArrowLeft, ArrowRight).
 */
document.addEventListener('keydown', (e) => {
    if (book && book.chapters.length) {
        // Prevent navigation if any modal is open
        if (document.getElementById('userInfoModal').style.display === 'flex' || 
            document.getElementById('finalScoreModal').style.display === 'flex' ||
            document.querySelector('.custom-message-box') ||
            document.querySelector('.modal-overlay.custom-confirm')) { // Check for custom confirm
            return;
        }

        if (e.key === 'ArrowLeft') {
            book.showChapter(Math.max(0, book.currentChapter - 1));
        } else if (e.key === 'ArrowRight') {
            book.showChapter(Math.min(book.chapters.length - 1, book.currentChapter + 1));
        }
    }
});

/**
 * Touch support for mobile devices (swipe left/right for chapter navigation).
 */
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    // Prevent swipe navigation if any modal is open
    if (document.getElementById('userInfoModal').style.display === 'flex' || 
        document.getElementById('finalScoreModal').style.display === 'flex' ||
        document.querySelector('.custom-message-box') ||
        document.querySelector('.modal-overlay.custom-confirm')) { // Check for custom confirm
        return;
    }
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    // Prevent swipe navigation if any modal is open
    if (document.getElementById('userInfoModal').style.display === 'flex' || 
        document.getElementById('finalScoreModal').style.display === 'flex' ||
        document.querySelector('.custom-message-box') ||
        document.querySelector('.modal-overlay.custom-confirm')) { // Check for custom confirm
        return;
    }
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (!book || !book.chapters.length) return;
    
    const swipeThreshold = 75; // Increased threshold for more deliberate swipes
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && book.currentChapter < book.chapters.length - 1) {
            // Swipe left (dragged finger left) - next chapter
            book.showChapter(book.currentChapter + 1);
        } else if (diff < 0 && book.currentChapter > 0) {
            // Swipe right (dragged finger right) - previous chapter
            book.showChapter(book.currentChapter - 1);
        }
    }
}

/**
 * Prints the content of the currently active chapter.
 */
function printChapter() {
    const printContent = document.querySelector('.chapter.active');
    if (printContent) {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>English Learning - Chapter ${book.currentChapter + 1}</title>
                    <style>
                        /* Basic print styles */
                        body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                        h2, h3 { color: #333; }
                        .lesson-content, .question-container {
                            margin: 20px 0;
                            padding: 15px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            page-break-inside: avoid; /* Avoid breaking these elements across pages */
                        }
                        .question { font-weight: bold; margin-bottom: 10px; }
                        .options, .drag-drop, .drop-zones { display: block; } /* Ensure block display for print */
                        .option, .drag-item, .drop-zone {
                            margin: 5px 0;
                            padding: 8px;
                            border: 1px solid #eee;
                            background-color: #f9f9f9;
                            border-radius: 5px;
                        }
                        .option.correct { background-color: #e6ffe6; border-color: #a3e6a3; }
                        .option.incorrect { background-color: #ffe6e6; border-color: #e6a3a3; }
                        .feedback { margin-top: 10px; padding: 10px; border-radius: 5px; }
                        .feedback.correct { background-color: #d4edda; color: #155724; border-color: #c3e6cb; }
                        .feedback.incorrect { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb; }
                        input[type="text"] { border: 1px solid #ccc; padding: 5px; width: 80%; }
                        .btn, .utility-buttons, .progress-bar, .score, .chapter-nav, .stats, .chapter-actions, .final-actions { display: none; } /* Hide interactive elements including chapter actions and final actions */
                        @media print {
                            body { margin: 0; padding: 10mm; }
                            .container { box-shadow: none; border-radius: 0; background: none; }
                            .header { background: none; border: none; padding: 0; margin-bottom: 20px; }
                            .header .logo { display: none; } /* Hide logo in print */
                            .chapter.active { animation: none; display: block; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close(); // Close the document stream
        printWindow.print(); // Trigger the print dialog
        printWindow.onafterprint = () => printWindow.close(); // Close window after printing
    } else {
        book.showCustomMessage('No chapter content to print.', 'info');
    }
}
