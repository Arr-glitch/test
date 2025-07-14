/**
 * Interactive English Learning Book
 * This script handles the dynamic loading of content,
 * user interaction with questions, progress tracking,
 * and UI updates for an interactive English learning application.
 */
class InteractiveBook {
    constructor() {
        this.currentChapter = 0; // Current active chapter index
        this.chapters = [];      // Stores loaded chapter data from JSON
        this.userAnswers = {};   // Stores user's answers for each question (key: q_chapterIndex_questionIndex, value: userAnswer)
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

        this.init(); // Initialize the book
    }

    /**
     * Initializes the book by loading content and setting up the UI.
     */
    async init() {
        this.showLoading(true); // Show loading indicator initially
        
        // First, prompt for user info
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
            this.showLoading(false); // Hide main loading indicator while modal is open

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
        // Modified to display chapter.content.passage directly and remove 'Lesson', 'Examples'
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
            </div>
        `;

        this.initializeDragDrop(); // Re-initialize drag-drop listeners for new content
        this.updateProgress(); // Update progress bar
        this.applyUserAnswersToChapter(); // Apply previously saved answers to the rendered chapter

        if (saveProgressAfterShow) {
            this.saveProgress(); // Save progress after showing the chapter
        }
    }

    /**
     * Renders a single question based on its type.
     * @param {object} question - The question object from content.json.
     * @param {number} chapterIndex - The index of the current chapter.
     * @param {number} questionIndex - The index of the question within the chapter.
     * @returns {string} HTML string for the question.
     */
    renderQuestion(question, chapterIndex, questionIndex) {
        const questionId = `q_${chapterIndex}_${questionIndex}`;
        const userAnswer = this.userAnswers[questionId];
        let questionHtml = '';

        switch (question.type) {
            case 'multiple-choice':
                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="options">
                            ${question.options.map((option, i) =>
                                `<div class="option"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})">
                                    ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <button class="btn" onclick="book.checkAnswer('${questionId}')">Check Answer</button>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'fill-in-blank':
                questionHtml = `
                    <div class="question-container input-question">
                        <div class="question">${question.question}</div>
                        <input type="text" id="input_${questionId}" placeholder="Type your answer here..."
                               value="${userAnswer !== undefined ? userAnswer : ''}">
                        <button class="btn" onclick="book.checkFillInBlank('${questionId}')">Check Answer</button>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'drag-drop':
                // For drag-drop, items need to be re-randomized if not already answered
                const itemsToDisplay = (userAnswer && userAnswer.droppedItems) ? userAnswer.droppedItems : [...question.items].sort(() => Math.random() - 0.5);
                const dropZoneContent = (userAnswer && userAnswer.dropZones) ? userAnswer.dropZones : Array(question.correct.length).fill('Drop here');

                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="drag-drop" id="dragdrop_${questionId}">
                            <div class="drag-items">
                                ${itemsToDisplay.map((item, i) =>
                                    // Only render if the item hasn't been dropped
                                    dropZoneContent.includes(item) ? '' : `<div class="drag-item" draggable="true" data-item="${item}">${item}</div>`
                                ).join('')}
                            </div>
                            <div class="drop-zones">
                                ${dropZoneContent.map((content, i) =>
                                    `<div class="drop-zone ${content !== 'Drop here' ? 'filled' : ''}" data-position="${i}">
                                        ${content}
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                        <button class="btn" onclick="book.checkDragDrop('${questionId}')">Check Answer</button>
                        <div class="feedback" id="feedback_${questionId}"></div>
                    </div>
                `;
                break;

            case 'reading-passage':
                // Removed the inner 'lesson-content' block for reading passage questions
                // as the main passage is now displayed at the chapter level.
                questionHtml = `
                    <div class="question-container">
                        <div class="question">${question.question}</div>
                        <div class="options">
                            ${question.options.map((option, i) =>
                                `<div class="option"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})">
                                    ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <button class="btn" onclick="book.checkAnswer('${questionId}')">Check Answer</button>
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
     * Applies previously saved user answers to the currently rendered chapter.
     * This ensures that when a user navigates back to a chapter, their answers are displayed.
     */
    applyUserAnswersToChapter() {
        const chapterQuestions = this.chapters[this.currentChapter].questions;
        chapterQuestions.forEach((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            const userAnswer = this.userAnswers[questionId];
            if (userAnswer !== undefined) {
                const feedbackElement = document.getElementById(`feedback_${questionId}`);
                if (feedbackElement) {
                    // Re-check answer to apply correct/incorrect styling and feedback
                    // This is a simplified re-application; a more robust solution might
                    // store the checked state and feedback directly.
                    if (q.type === 'multiple-choice' || q.type === 'reading-passage') {
                        const container = feedbackElement.closest('.question-container');
                        const options = container.querySelectorAll('.option');
                        const isCorrect = (Array.isArray(q.correct) && q.correct.includes(userAnswer)) || (!Array.isArray(q.correct) && userAnswer === q.correct);

                        options.forEach((option, index) => {
                            option.classList.remove('selected');
                            if (index === q.correct || (Array.isArray(q.correct) && q.correct.includes(index))) {
                                option.classList.add('correct');
                            } else if (index === userAnswer && !isCorrect) {
                                option.classList.add('incorrect');
                            }
                            option.style.pointerEvents = 'none'; // Disable interaction
                        });
                        container.querySelector('.btn').disabled = true;
                        feedbackElement.innerHTML = `
                            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${q.feedback}
                            </div>
                        `;
                    } else if (q.type === 'fill-in-blank') {
                        const inputElement = document.getElementById(`input_${questionId}`);
                        if (inputElement) {
                            inputElement.value = userAnswer;
                            inputElement.disabled = true;
                            const isCorrect = (Array.isArray(q.correct) && q.correct.map(s => s.toLowerCase()).includes(userAnswer.toLowerCase())) || (!Array.isArray(q.correct) && userAnswer.toLowerCase() === q.correct.toLowerCase());
                            feedbackElement.innerHTML = `
                                <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                                    ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${q.feedback}
                                </div>
                            `;
                            feedbackElement.closest('.question-container').querySelector('.btn').disabled = true;
                        }
                    } else if (q.type === 'drag-drop') {
                        // Drag-drop re-application is handled during renderQuestion
                        // but we need to disable the button and show feedback.
                        const isCorrect = JSON.stringify(userAnswer.dropZones) === JSON.stringify(q.correct);
                        const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
                        dropZones.forEach((zone, index) => {
                            if (zone.textContent.trim() === q.correct[index]) {
                                zone.style.backgroundColor = '#c6f6d5';
                                zone.style.borderColor = '#48bb78';
                            } else {
                                zone.style.backgroundColor = '#fed7d7';
                                zone.style.borderColor = '#f56565';
                            }
                        });
                        feedbackElement.innerHTML = `
                            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${q.feedback}
                                <br><strong>Correct order:</strong> ${q.correct.join(' → ')}
                            </div>
                        `;
                        feedbackElement.closest('.question-container').querySelector('.btn').disabled = true;
                    }
                }
            }
        });
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
        // If multiple correct answers were allowed, this logic would need to change
        // to allow toggling 'selected' for multiple options (e.g., using checkboxes).
        options.forEach(option => option.classList.remove('selected'));
        options[optionIndex].classList.add('selected');

        this.userAnswers[questionId] = optionIndex;
    }

    /**
     * Checks the answer for multiple-choice and reading-passage questions.
     * @param {string} questionId - The ID of the question.
     */
    checkAnswer(questionId) {
        const [chapterIndex, questionIndex] = questionId.split('_').slice(1).map(Number);
        const question = this.chapters[chapterIndex].questions[questionIndex];
        const userAnswer = this.userAnswers[questionId];
        const feedbackElement = document.getElementById(`feedback_${questionId}`);
        
        if (userAnswer === undefined) {
            feedbackElement.innerHTML = '<div class="feedback incorrect">Please select an answer first.</div>';
            return;
        }
        
        // Determine if the answer is correct.
        // Handles both single correct answer (number) and multiple correct answers (array of numbers).
        let isCorrect;
        if (Array.isArray(question.correct)) {
            // If question.correct is an array, all selected options must match all correct options.
            // This would require changing `selectOption` to handle multiple selections.
            // For now, assuming `question.correct` is a single index for multiple-choice.
            isCorrect = question.correct.includes(userAnswer);
        } else {
            isCorrect = userAnswer === question.correct;
        }
        
        // Update visual feedback
        const container = feedbackElement.closest('.question-container');
        const options = container.querySelectorAll('.option');
        
        options.forEach((option, index) => {
            option.classList.remove('selected'); // Remove selected class
            if (Array.isArray(question.correct)) {
                // If multiple correct answers, highlight all correct ones
                if (question.correct.includes(index)) {
                    option.classList.add('correct');
                } else if (index === userAnswer && !isCorrect) {
                    option.classList.add('incorrect');
                }
            } else {
                // Single correct answer
                if (index === question.correct) {
                    option.classList.add('correct');
                } else if (index === userAnswer && !isCorrect) {
                    option.classList.add('incorrect');
                }
            }
            option.style.pointerEvents = 'none'; // Disable further interaction
        });
        
        // Show feedback message
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${question.feedback}
            </div>
        `;
        
        // Update stats if the answer was correct and not previously answered correctly
        // We only count correct answers once per question.
        if (isCorrect && this.userAnswers[questionId] !== 'correct_already') {
            this.stats.correctAnswers++;
            this.userAnswers[questionId] = 'correct_already'; // Mark as correctly answered
        } else if (!isCorrect) {
            // If incorrect, store the user's incorrect answer to re-display
            this.userAnswers[questionId] = userAnswer;
        }

        this.updateStats(); // Update global statistics
        container.querySelector('.btn').disabled = true; // Disable check button
        if (isCorrect) showConfetti(); // Show confetti for correct answers
        this.saveProgress(); // Save progress after checking answer
        this.checkCompletionAndShowScore(); // Check if all questions are answered
    }

    /**
     * Checks the answer for fill-in-the-blank questions.
     * @param {string} questionId - The ID of the question.
     */
    checkFillInBlank(questionId) {
        const [chapterIndex, questionIndex] = questionId.split('_').slice(1).map(Number);
        const question = this.chapters[chapterIndex].questions[questionIndex];
        const inputElement = document.getElementById(`input_${questionId}`);
        const userAnswer = inputElement.value.trim();
        const feedbackElement = document.getElementById(`feedback_${questionId}`);
        
        if (!userAnswer) {
            feedbackElement.innerHTML = '<div class="feedback incorrect">Please enter an answer first.</div>';
            return;
        }
        
        // Determine if the answer is correct.
        // Handles both single correct answer (string) and multiple correct answers (array of strings).
        let isCorrect;
        if (Array.isArray(question.correct)) {
            isCorrect = question.correct.map(s => s.toLowerCase()).includes(userAnswer.toLowerCase());
        } else {
            isCorrect = userAnswer.toLowerCase() === question.correct.toLowerCase();
        }
        
        // Show feedback message
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${question.feedback}
            </div>
        `;
        
        // Update stats if the answer was correct and not previously answered correctly
        if (isCorrect && this.userAnswers[questionId] !== 'correct_already') {
            this.stats.correctAnswers++;
            this.userAnswers[questionId] = 'correct_already'; // Mark as correctly answered
        } else if (!isCorrect) {
            // If incorrect, store the user's incorrect answer to re-display
            this.userAnswers[questionId] = userAnswer;
        }

        this.updateStats(); // Update global statistics
        inputElement.disabled = true; // Disable input field
        feedbackElement.closest('.question-container').querySelector('.btn').disabled = true; // Disable check button
        if (isCorrect) showConfetti(); // Show confetti for correct answers
        this.saveProgress(); // Save progress after checking answer
        this.checkCompletionAndShowScore(); // Check if all questions are answered
    }

    /**
     * Initializes drag and drop functionality for all drag-drop questions.
     */
    initializeDragDrop() {
        const dragItems = document.querySelectorAll('.drag-item');
        const dropZones = document.querySelectorAll('.drop-zone');
        
        // Add event listeners for drag items
        dragItems.forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // Add event listeners for drop zones
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
            zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }

    /**
     * Handles the dragstart event for draggable items.
     * @param {Event} e - The drag event.
     */
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.item); // Store the item's text content
        e.target.classList.add('dragging');
        // Set a custom drag image if desired
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent GIF
        e.dataTransfer.setDragImage(img, 0, 0);
    }

    /**
     * Handles the dragend event for draggable items.
     * @param {Event} e - The drag event.
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    /**
     * Handles the dragover event for drop zones. Prevents default to allow dropping.
     * @param {Event} e - The drag event.
     */
    handleDragOver(e) {
        e.preventDefault();
    }

    /**
     * Handles the dragenter event for drop zones. Adds visual feedback.
     * @param {Event} e - The drag event.
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    /**
     * Handles the dragleave event for drop zones. Removes visual feedback.
     * @param {Event} e - The drag event.
     */
    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    /**
     * Handles the drop event for drop zones. Places the dragged item into the zone.
     * @param {Event} e - The drop event.
     */
    handleDrop(e) {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        const dropZone = e.target.closest('.drop-zone'); // Ensure we get the drop-zone element
        
        if (dropZone && dropZone.textContent.trim() === 'Drop here') { // Only allow dropping into empty zones
            dropZone.textContent = data;
            dropZone.classList.remove('drag-over');
            dropZone.classList.add('filled');
            
            // Remove the original dragged item from the drag-items list
            const draggedItem = document.querySelector(`.drag-item.dragging[data-item="${data}"]`);
            if (draggedItem) {
                draggedItem.remove();
            }
        }
    }

    /**
     * Checks the answer for drag-drop questions.
     * @param {string} questionId - The ID of the question.
     */
    checkDragDrop(questionId) {
        const [chapterIndex, questionIndex] = questionId.split('_').slice(1).map(Number);
        const question = this.chapters[chapterIndex].questions[questionIndex];
        const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
        const feedbackElement = document.getElementById(`feedback_${questionId}`);
        
        // Get the current order of items in the drop zones
        const userAnswerOrder = Array.from(dropZones).map(zone => zone.textContent.trim());
        
        // Check if all drop zones are filled
        if (userAnswerOrder.some(text => text === 'Drop here' || text === '')) {
            feedbackElement.innerHTML = '<div class="feedback incorrect">Please fill all positions first.</div>';
            return;
        }
        
        // Compare with the correct order
        const isCorrect = JSON.stringify(userAnswerOrder) === JSON.stringify(question.correct);
        
        // Apply visual feedback to drop zones
        dropZones.forEach((zone, index) => {
            if (zone.textContent.trim() === question.correct[index]) {
                zone.style.backgroundColor = '#c6f6d5'; // Correct color
                zone.style.borderColor = '#48bb78';
            } else {
                zone.style.backgroundColor = '#fed7d7'; // Incorrect color
                zone.style.borderColor = '#f56565';
            }
            // Disable further dropping/dragging on this question
            zone.style.pointerEvents = 'none';
        });

        // Disable drag items for this question
        const dragItemsContainer = document.querySelector(`#dragdrop_${questionId} .drag-items`);
        if (dragItemsContainer) {
            dragItemsContainer.style.pointerEvents = 'none';
        }
        
        // Show text feedback
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect.'} ${question.feedback}
                <br><strong>Correct order:</strong> ${question.correct.join(' → ')}
            </div>
        `;
        
        // Update stats if correct
        if (isCorrect && this.userAnswers[questionId] !== 'correct_already') {
            this.stats.correctAnswers++;
            this.userAnswers[questionId] = 'correct_already'; // Mark as correctly answered
        } else if (!isCorrect) {
            // Store the current state of dropped items and remaining draggable items
            this.userAnswers[questionId] = {
                dropZones: userAnswerOrder,
                droppedItems: Array.from(document.querySelectorAll(`#dragdrop_${questionId} .drag-item`)).map(item => item.dataset.item)
            };
        }
        
        this.updateStats(); // Update global statistics
        feedbackElement.closest('.question-container').querySelector('.btn').disabled = true; // Disable check button
        if (isCorrect) showConfetti(); // Show confetti for correct answers
        this.saveProgress(); // Save progress after checking answer
        this.checkCompletionAndShowScore(); // Check if all questions are answered
    }

    /**
     * Updates the displayed statistics (score, accuracy, chapters completed)
     * and the progress bar.
     */
    updateStats() {
        const answeredQuestionsCount = Object.keys(this.userAnswers).filter(key => 
            this.userAnswers[key] === 'correct_already' || (typeof this.userAnswers[key] === 'number') || (typeof this.userAnswers[key] === 'string') || (typeof this.userAnswers[key] === 'object' && this.userAnswers[key] !== null)
        ).length;

        const accuracy = answeredQuestionsCount > 0 ? Math.round((this.stats.correctAnswers / answeredQuestionsCount) * 100) : 0;
        
        this.totalScoreSpan.textContent = this.stats.correctAnswers;
        this.correctAnswersStat.textContent = this.stats.correctAnswers;
        this.accuracyStat.textContent = accuracy + '%';
        
        // Update chapters completed based on all questions in a chapter being answered
        let completedCount = 0;
        this.chapters.forEach((chapter, chapIndex) => {
            const chapterQuestions = chapter.questions.length;
            const answeredInChapter = chapter.questions.filter((q, qIndex) => {
                const qId = `q_${chapIndex}_${qIndex}`;
                return this.userAnswers[qId] !== undefined;
            }).length;

            if (answeredInChapter === chapterQuestions && chapterQuestions > 0) {
                completedCount++;
            }
        });
        this.stats.chaptersCompleted = completedCount;
        this.chaptersCompletedStat.textContent = this.stats.chaptersCompleted;
        
        this.updateProgress(); // Update progress bar
    }

    /**
     * Checks if all questions have been answered and displays the final score modal.
     */
    checkCompletionAndShowScore() {
        const answeredQuestionsCount = Object.keys(this.userAnswers).filter(key => 
            this.userAnswers[key] === 'correct_already' || (typeof this.userAnswers[key] === 'number') || (typeof this.userAnswers[key] === 'string') || (typeof this.userAnswers[key] === 'object' && this.userAnswers[key] !== null)
        ).length;

        if (answeredQuestionsCount === this.stats.totalQuestions && this.stats.totalQuestions > 0) {
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
    }

    /**
     * Updates the width of the progress bar based on overall progress.
     */
    updateProgress() {
        const answeredQuestionsCount = Object.keys(this.userAnswers).filter(key => 
            this.userAnswers[key] === 'correct_already' || (typeof this.userAnswers[key] === 'number') || (typeof this.userAnswers[key] === 'string') || (typeof this.userAnswers[key] === 'object' && this.userAnswers[key] !== null)
        ).length;

        const progressPercentage = this.stats.totalQuestions > 0 ? (answeredQuestionsCount / this.stats.totalQuestions) * 100 : 0;
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
            alert('Could not save progress. Your browser might be in private mode or storage is full.');
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
            // Inform the user if loading failed
            alert('Could not load saved progress. Your browser might be in private mode or data is corrupted.');
        }
        return false;
    }

    /**
     * Loads progress and then re-renders the current chapter and updates stats.
     * Useful for a "Load Progress" button.
     */
    loadProgressAndRender() {
        if (this.loadProgress()) {
            this.showChapter(this.currentChapter, false); // Re-render current chapter without saving again
            this.updateStats(); // Ensure stats are fully updated
        } else {
            alert('No saved progress found!');
        }
    }

    /**
     * Resets all user progress and statistics.
     */
    resetProgress() {
        if (!confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
            return; // User cancelled
        }
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
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
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
                        .btn, .utility-buttons, .progress-bar, .score, .chapter-nav, .stats { display: none; } /* Hide interactive elements */
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
        alert('No chapter content to print.');
    }
}
