/*************************************************
 * script.js 
 * Reviewer Portal
 *************************************************/

// --- CONSTANTS & HELPER FUNCTIONS ---

// Power Automate endpoint for fetching comments.
const COMMENTS_URL =
  "https://prod-15.westus.logic.azure.com:443/workflows/318e9ff4339b4f6e8527a2ab74027c0d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8Wg9umOg3LnKsvTvCTSIB6XtntGYjiW8iKU4XGs9xWM";

// Extract DocumentID from the query string (?documentId=XYZ)
function getDocumentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("documentId");
}

// Inject document style to override fonts in the iframe.
function injectDocumentStyle(iframeDoc) {
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = `
    html, body {
      font-family: 'Roboto', sans-serif !important;
    }
  `;
  iframeDoc.head.appendChild(styleEl);
}

// Inject CSS for highlighted text and additional font overrides into the iframe.
function injectHighlightStyle(iframeDoc) {
  // Add Roboto font link.
  const fontLink = iframeDoc.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap";
  iframeDoc.head.appendChild(fontLink);

  // Add override styles and highlight styles.
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = `
    html, body, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, a {
      font-family: 'Roboto', sans-serif !important;
    }
    [style*="font-family"] {
      font-family: 'Roboto', sans-serif !important;
    }
    .highlighted-text {
      background-color: #e8eb6d;
      transition: background-color 0.3s ease;
    }
    /* Add margins to the document body */
    body {
      margin: 40px !important;
      padding: 20px !important;
      max-width: 800px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    /* Additional container overrides (if needed) */
    .document-content, main, article, .content, #content, .document {
      margin: 20px !important;
      padding: 15px !important;
    }
  `;
  iframeDoc.head.appendChild(styleEl);
}

// Format date string into "M/D/YYYY h:mm AM/PM" format.
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) {
    console.warn("Invalid date:", dateString);
    return "Invalid Date";
  }
  return date
    .toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}

// --- RENDERING FUNCTIONS ---

// Render the diamond-based progress bar in #progressBarContainer.
function renderProgressBar(comments) {
  const progressBarContainer = document.getElementById("progressBarContainer");
  progressBarContainer.innerHTML = ""; // Clear any existing content

  comments.forEach((comment, index) => {
    // Create the container for this step with default state "untouched".
    const stepEl = document.createElement("div");
    stepEl.classList.add("step", "untouched");

    // Create the diamond element.
    const diamondEl = document.createElement("div");
    diamondEl.classList.add("diamond");

    // Create the white outline element inside the diamond.
    const outlineEl = document.createElement("div");
    outlineEl.classList.add("diamond-outline");
    diamondEl.appendChild(outlineEl);

    // Create the span with the step number inside the diamond.
    const numSpan = document.createElement("span");
    numSpan.textContent = index + 1;
    diamondEl.appendChild(numSpan);

    stepEl.appendChild(diamondEl);

    // If this is not the last step, add a connecting line.
    if (index < comments.length - 1) {
      const lineEl = document.createElement("div");
      lineEl.classList.add("line");
      stepEl.appendChild(lineEl);
    }

    progressBarContainer.appendChild(stepEl);
    // Save a reference for later updates.
    comment.stepElement = stepEl;
  });
}

// Render comments and their interaction boxes in #commentContainer.
function renderComments(comments) {
  const commentContainer = document.getElementById("commentContainer");
  console.log("Rendering comments:", comments);

  comments.forEach((comment) => {
    const commentItem = document.createElement("div");
    commentItem.classList.add("comment-item");

    // Add hover events for highlighting document text.
    commentItem.addEventListener("mouseenter", () => {
      highlightDocumentText(comment.TextID, true);
    });
    commentItem.addEventListener("mouseleave", () => {
      highlightDocumentText(comment.TextID, false);
    });

    // Create metadata element (displaying Author and formatted Date).
    const metadataDiv = document.createElement("div");
    metadataDiv.classList.add("comment-metadata");
    const formattedDate = formatDate(comment.CommentDateTime);
    const author = comment.CommentAuthor.replace(/\s*\[\d+\]\s*/, '');
    metadataDiv.textContent = `Author: ${author} | Date: ${formattedDate}`;
    commentItem.appendChild(metadataDiv);

    // Create comment text element.
    const textDiv = document.createElement("div");
    textDiv.classList.add("comment-text");
    textDiv.textContent = comment.CommentText;
    commentItem.appendChild(textDiv);

    // Create interaction area for response.
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response-area");

    // Create a textarea for user response.
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Your response here...";
    textarea.required = true;
    responseDiv.appendChild(textarea);

    // Create a "Mark as Complete" button.
    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Mark as Complete";

    // --- Event Listeners for interaction ---
    textarea.addEventListener("focus", () => {
      if (comment.stepElement) {
        comment.stepElement.classList.remove("untouched", "complete");
        comment.stepElement.classList.add("in-progress");
      }
      highlightDocumentText(comment.TextID, true);
    });
    textarea.addEventListener("blur", () => {
      if (!textarea.value.trim()) {
        if (comment.stepElement && !comment.isComplete) {
          comment.stepElement.classList.remove("in-progress", "complete");
          comment.stepElement.classList.add("untouched");
        }
      }
      highlightDocumentText(comment.TextID, false);
    });
    completeBtn.addEventListener("click", () => {
      comment.res
