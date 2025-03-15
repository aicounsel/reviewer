/***************************************
 * Data Setup: Example prompts.
 * In a real scenario, you might pull these from
 * a SharePoint list, a database, or your backend.
 ***************************************/
const promptsData = [
  {
    id: 1,
    sectionId: 1,   // Links to "Section 1: Indemnification Clause"
    title: "Indemnification Details",
    question: "Please confirm the scope of indemnification you'd like.",
    answer: ""      // Will be filled by the user
  },
  {
    id: 2,
    sectionId: 2,
    title: "Payment Terms Confirmation",
    question: "Do you agree with a 30-day payment window, or do you need a different duration?",
    answer: ""
  },
  {
    id: 3,
    sectionId: 3,
    title: "Dispute Resolution Venue",
    question: "Which jurisdiction/court do you prefer for dispute resolution?",
    answer: ""
  }
];

window.addEventListener("DOMContentLoaded", () => {
  renderPrompts();
  updateProgressBar();
});

/************************************************
 * Render the prompts in the right-hand panel
 ************************************************/
function renderPrompts() {
  const container = document.getElementById("prompts-container");
  container.innerHTML = ""; // Clear out if there's anything

  promptsData.forEach((prompt) => {
    const promptDiv = document.createElement("div");
    promptDiv.classList.add("prompt-item");

    // Title
    const titleEl = document.createElement("div");
    titleEl.classList.add("prompt-title");
    titleEl.textContent = prompt.title;
    promptDiv.appendChild(titleEl);

    // Question
    const questionEl = document.createElement("div");
    questionEl.classList.add("prompt-question");
    questionEl.textContent = prompt.question;
    promptDiv.appendChild(questionEl);

    // Input
    const inputEl = document.createElement("textarea");
    inputEl.classList.add("prompt-input");
    inputEl.rows = 2;
    inputEl.value = prompt.answer;
    inputEl.placeholder = "Type your response here...";
    inputEl.addEventListener("input", (e) => {
      prompt.answer = e.target.value;
      updateProgressBar();
    });
    promptDiv.appendChild(inputEl);

    // A small "jump to section" button (optional)
    const jumpBtn = document.createElement("button");
    jumpBtn.textContent = "Show Section";
    jumpBtn.addEventListener("click", () => {
      highlightSection(prompt.sectionId);
    });
    promptDiv.appendChild(jumpBtn);

    container.appendChild(promptDiv);
  });
}

/************************************************
 * Highlight the relevant document section
 ************************************************/
function highlightSection(sectionId) {
  // Remove 'selected' from all highlightable sections
  const sections = document.querySelectorAll(".highlightable");
  sections.forEach((sec) => sec.classList.remove("selected"));

  // Add 'selected' to the chosen one
  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add("selected");
    // Scroll it into view if you'd like
    targetSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/************************************************
 * Update the progress bar
 ************************************************/
function updateProgressBar() {
  const totalPrompts = promptsData.length;
  // Count how many are "answered" (non-empty)
  const answeredCount = promptsData.filter((p) => p.answer.trim() !== "").length;

  // Calculate percentage
  const percentComplete = Math.round((answeredCount / totalPrompts) * 100);

  // Update bar width
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = percentComplete + "%";

  // Update text
  const progressText = document.getElementById("progress-text");
  progressText.textContent = `${percentComplete}% Complete`;
}
