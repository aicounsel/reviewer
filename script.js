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

// Inject CSS for highlighted text into the iframe.
function injectHighlightStyle(iframeDoc) {
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = `
    /* Override the body font-family for the iframe */
    body {
      font-family: 'Roboto', sans-serif !important;
    }
    .highlighted-text {
      background-color: yellow;
      transition: background-color 0.3s ease;
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
    // Create the container for this step and set default state as "untouched".
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
    numSpan.textContent = index + 1; // or padStart if needed
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

    commentItem.addEventListener("mouseenter", () => {
  highlightDocumentText(comment.TextID, true);
});
commentItem.addEventListener("mouseleave", () => {
  highlightDocumentText(comment.TextID, false);
});
    // Create metadata element (displaying Author and formatted Date).
// Create metadata element (displaying Author and formatted Date).
const metadataDiv = document.createElement("div");
metadataDiv.classList.add("comment-metadata");
const formattedDate = formatDate(comment.CommentDateTime);
// Remove any bracketed number (e.g., " [3]") from the author name.
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
        // Remove "untouched" and "complete", then add "in-progress".
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
      comment.response = textarea.value.trim();
      comment.isComplete = true;
      if (comment.stepElement) {
        // Remove "untouched" and "in-progress", then add "complete".
        comment.stepElement.classList.remove("untouched", "in-progress");
        comment.stepElement.classList.add("complete");
      }
    });
    // Append the button to the response area.
    responseDiv.appendChild(completeBtn);

    commentItem.appendChild(responseDiv);
    commentContainer.appendChild(commentItem);
  });
}

// --- UTILITY FUNCTIONS ---

// Highlight or un-highlight text in the loaded iframe.
function highlightDocumentText(textID, highlight) {
  const docIframe = document.getElementById("docIframe");
  const iframeDoc = docIframe.contentDocument || docIframe.contentWindow.document;
  if (!iframeDoc) return;
  const anchor = iframeDoc.querySelector(`a[name="${textID}"]`);
  if (!anchor) return;
  if (highlight) {
    anchor.classList.add("highlighted-text");
    anchor.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    anchor.classList.remove("highlighted-text");
  }
}

// Handle "Submit All" button click.
function handleSubmitAll() {
  const documentId = getDocumentIdFromUrl();
  const reviewerNameInput = document.getElementById("reviewerNameInput");
  if (!reviewerNameInput.value.trim()) {
    alert("Please enter your name.");
    return;
  }

  // Validate that all comment responses (excluding the reviewer name box) are filled.
  const commentItems = document.querySelectorAll(".comment-item:not(.reviewer-name-item)");
  let allFilled = true;
  commentItems.forEach((item) => {
    const textarea = item.querySelector("textarea");
    if (textarea && !textarea.value.trim()) {
      allFilled = false;
    }
  });
  if (!allFilled) {
    alert("Please fill out all comment responses.");
    return;
  }

  // Re-fetch comments to build the submission payload.
  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId })
  })
    .then((res) => res.json())
    .then((allData) => {
      const commentsForDoc = allData.Comments.filter(c => c.DocumentID === documentId);

      // Collect responses from DOM.
      const commentItems = document.querySelectorAll(".comment-item:not(.reviewer-name-item)");
      commentItems.forEach((item, idx) => {
        const textarea = item.querySelector("textarea");
        commentsForDoc[idx].response = textarea.value.trim();
      });

      const totalComments = commentsForDoc.length;
      let responseIndex = 0;

      const payloadComments = commentsForDoc.map(c => {
        if (c.response && c.response !== "") {
          responseIndex++;
          return {
            CommentID: c.CommentID,
            ResponseID: `_cmnt${totalComments + responseIndex}`,
            ResponseText: c.response,
            ResponseAuthor: reviewerNameInput.value.trim(),
            ResponseDateTime: new Date().toISOString(),
            ResponseTextID: `_cmntref${totalComments + responseIndex}`,
            ResponseTextHighlight: c.TextHighlight,
            ResponseFullText: c.FullText
          };
        } else {
          return {
            CommentID: c.CommentID,
            ResponseID: "",
            ResponseText: "",
            ResponseAuthor: "",
            ResponseDateTime: "",
            ResponseTextID: "",
            ResponseTextHighlight: "",
            ResponseFullText: ""
          };
        }
      });

      const payload = {
        DocumentID: documentId,
        Comments: payloadComments
      };

      console.log("Submitting data to Power Automate:", payload);

      fetch("https://prod-187.westus.logic.azure.com:443/workflows/662f3d3b44054a3f930913f1007b9832/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a7Ev7_hYa2Dy75PO4Kij93tlmJLtFPFh1WhkoV-HuMc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(() => {
          alert("Responses submitted successfully!");
        })
        .catch((err) => {
          console.error("Error submitting responses:", err);
          alert("An error occurred while submitting responses.");
        });
    })
    .catch((err) => {
      console.error("Error in handleSubmitAll fetch:", err);
    });
}

// --- MAIN EXECUTION: Run After DOM Loads ---
document.addEventListener("DOMContentLoaded", () => {
  const documentId = getDocumentIdFromUrl();
  if (!documentId) {
    alert("No DocumentID provided in URL. Example: ?documentId=mydoc-1234");
    return;
  }

  // 1. Set the iframe source to the matching HTML in /agreements.
  const docIframe = document.getElementById("docIframe");
  docIframe.src = `./agreements/${documentId}.html`;
  docIframe.addEventListener("load", () => {
    const iframeDoc = docIframe.contentDocument || docIframe.contentWindow.document;
    if (iframeDoc) {
 /* Override font for the entire document in the iframe */
    body {
      font-family: 'Roboto', sans-serif !important;
    }
      injectHighlightStyle(iframeDoc);
    }
  });

  // 2. Insert Reviewer Name box above the comment container.
  const reviewerNameDiv = document.createElement("div");
  reviewerNameDiv.classList.add("comment-item", "reviewer-name-item");
  const nameResponseDiv = document.createElement("div");
  nameResponseDiv.classList.add("response-area");
  const nameLabel = document.createElement("div");
  nameLabel.textContent = "Your Name";
  const nameInput = document.createElement("input");
  nameInput.placeholder = "Enter Your Name...";
  nameInput.id = "reviewerNameInput";
  nameInput.required = true;
  nameInput.style.width = "100%";
  nameInput.style.marginBottom = "10px";
  nameResponseDiv.appendChild(nameLabel);
  nameResponseDiv.appendChild(nameInput);
  reviewerNameDiv.appendChild(nameResponseDiv);
  const commentContainer = document.getElementById("commentContainer");
  commentContainer.insertAdjacentElement("afterbegin", reviewerNameDiv);

  // 3. Fetch comments from Power Automate.
  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId })
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Fetched data:", data);
      const commentsForDoc = data.Comments || [];
      renderProgressBar(commentsForDoc);
      renderComments(commentsForDoc);
    })
    .catch((err) => {
      console.error("Error fetching comments:", err);
    });

  // 4. Set up the "Submit All" button.
  document.getElementById("submitAllBtn").addEventListener("click", handleSubmitAll);
});
