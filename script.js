
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
    body {
      margin: 40px !important;
      padding: 20px !important;
      max-width: 800px !important;
      margin-left: auto !important;
      margin-right: auto !important;
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
  progressBarContainer.innerHTML = ""; // Clear existing content

  comments.forEach((comment, index) => {
    const stepEl = document.createElement("div");
    // Start in "untouched" state.
    stepEl.classList.add("step", "untouched");

    const diamondEl = document.createElement("div");
    diamondEl.classList.add("diamond");

    const outlineEl = document.createElement("div");
    outlineEl.classList.add("diamond-outline");
    diamondEl.appendChild(outlineEl);

    const numSpan = document.createElement("span");
    numSpan.textContent = index + 1;
    diamondEl.appendChild(numSpan);

    stepEl.appendChild(diamondEl);

    if (index < comments.length - 1) {
      const lineEl = document.createElement("div");
      lineEl.classList.add("line");
      stepEl.appendChild(lineEl);
    }

    progressBarContainer.appendChild(stepEl);
    // Save reference for later updates.
    comment.stepElement = stepEl;
  });
}

// Render comments and their interaction boxes in #commentContainer.
function renderComments(comments) {
  const commentContainer = document.getElementById("commentContainer");
  console.log("Rendering comments:", comments);

  comments.forEach((comment, index) => {
    // Initialize state property.
    comment.state = "untouched";
    
    const commentItem = document.createElement("div");
    commentItem.classList.add("comment-item");

    // Create header container for fancy number and metadata.
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("comment-header");

    const numberSpan = document.createElement("span");
    numberSpan.classList.add("comment-number");
    numberSpan.textContent = String.fromCodePoint(0x278A + index);
    headerDiv.appendChild(numberSpan);

    const metadataDiv = document.createElement("div");
    metadataDiv.classList.add("comment-metadata");
    const formattedDate = formatDate(comment.CommentDateTime);
    const author = comment.CommentAuthor.replace(/\s*\[\d+\]\s*/, '');
    metadataDiv.textContent = `Author: ${author} | Date: ${formattedDate}`;
    headerDiv.appendChild(metadataDiv);

    commentItem.appendChild(headerDiv);

    const textDiv = document.createElement("div");
    textDiv.classList.add("comment-text");
    textDiv.textContent = comment.CommentText;
    commentItem.appendChild(textDiv);

    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response-area");

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Your response here...";
    textarea.required = true;
    responseDiv.appendChild(textarea);

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Mark as Complete";

    // Event listener for focus.
    textarea.addEventListener("focus", () => {
      // Only change state if not complete.
      if (comment.state !== "complete" && comment.stepElement) {
        comment.state = "in-progress";
        comment.stepElement.classList.remove("untouched", "complete", "in-progress");
        comment.stepElement.classList.add("in-progress");
      }
      highlightDocumentText(comment.TextID, true);
    });

    // Event listener for blur.
    textarea.addEventListener("blur", () => {
      // Only change state if not complete.
      if (comment.state !== "complete" && comment.stepElement) {
        if (!textarea.value.trim()) {
          comment.state = "untouched";
          comment.stepElement.classList.remove("in-progress", "complete", "untouched");
          comment.stepElement.classList.add("untouched");
        }
      }
      highlightDocumentText(comment.TextID, false);
    });

    // Event listener for "Mark as Complete" button.
   completeBtn.addEventListener("click", () => {
  if (comment.state === "complete") {
    // Toggle back to in-progress so the user can edit.
    comment.state = "in-progress";
    completeBtn.classList.remove("btn-complete");
    if (comment.stepElement) {
      comment.stepElement.classList.remove("complete");
      comment.stepElement.classList.add("in-progress");
    }
  } else {
    // Mark as complete.
    comment.response = textarea.value.trim();
    comment.state = "complete";
    completeBtn.classList.add("btn-complete");
    if (comment.stepElement) {
      comment.stepElement.classList.remove("untouched", "in-progress");
      comment.stepElement.classList.add("complete");
    }
  }
});
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
  console.log("Reviewer Name Input:", reviewerNameInput);
  if (!reviewerNameInput || !reviewerNameInput.value.trim()) {
    alert("Please enter your name.");
    return;
  }

  // Exclude both reviewer-name and intro bubbles.
  const commentItems = document.querySelectorAll(
    ".comment-item:not(.reviewer-name-item):not(.client-intro-bubble)"
  );
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

  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId }),
  })
    .then((res) => res.json())
    .then((allData) => {
      const commentsForDoc = allData.Comments.filter(
        (c) => c.DocumentID === documentId
      );

      // Exclude intro and reviewer-name bubbles.
      const commentItems = document.querySelectorAll(
        ".comment-item:not(.reviewer-name-item):not(.client-intro-bubble)"
      );
      commentItems.forEach((item, idx) => {
        const textarea = item.querySelector("textarea");
        commentsForDoc[idx].response = textarea.value.trim();
      });

      const totalComments = commentsForDoc.length;
      let responseIndex = 0;
      const payloadComments = commentsForDoc.map((c) => {
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
            ResponseFullText: c.FullText,
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
            ResponseFullText: "",
          };
        }
      });

      const payload = {
        DocumentID: documentId,
        Comments: payloadComments,
      };

      console.log("Submitting data to Power Automate:", payload);

      fetch(
        "https://prod-187.westus.logic.azure.com:443/workflows/662f3d3b44054a3f930913f1007b9832/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a7Ev7_hYa2Dy75PO4Kij93tlmJLtFPFh1WhkoV-HuMc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
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
    const iframeDoc =
      docIframe.contentDocument || docIframe.contentWindow.document;
    if (iframeDoc) {
      injectDocumentStyle(iframeDoc);
      injectHighlightStyle(iframeDoc);
    }
  });

  // 2. Insert the Intro Message bubble at the top of the comment container.
  const commentContainer = document.getElementById("commentContainer");
  const introDiv = document.createElement("div");
  introDiv.classList.add("comment-item", "client-intro-bubble");
  const introContent = document.createElement("div");
  introContent.classList.add("intro-content");
  introContent.innerHTML = `
    <p>Welcome to AI Counsel! 👋</p>
    <p>I'm your Client Assistant and your attorney has some questions for you on your contract. A few quick notes:</p>
    <ul>
      <li>Hover over each comment to highlight the relevant text.</li>
      <li>Mark as Complete or minimize a comment for your own convenience.</li>
      <li>Your answers are securely submitted once you Submit All Answers.</li>
      <li>AI has pulled <span class="comment-count">[X]</span> items that need your attention.</li>
    </ul>
    <p>Ready to get started?</p>
  `;
  introDiv.appendChild(introContent);
  commentContainer.insertAdjacentElement("afterbegin", introDiv);

  // 3. Insert the "Your Name" bubble immediately below the intro bubble.
  const reviewerNameDiv = document.createElement("div");
  reviewerNameDiv.classList.add("comment-item", "reviewer-name-item");
  const nameResponseDiv = document.createElement("div");
  nameResponseDiv.classList.add("response-area");
  const nameLabel = document.createElement("div");
  nameLabel.textContent = "➡️ Let's start with your name:";
  const nameInput = document.createElement("input");
  nameInput.placeholder = "Enter Your Full Name...";
  nameInput.id = "reviewerNameInput";
  nameInput.required = true;
  nameInput.style.width = "100%";
  nameInput.style.marginBottom = "10px";
  nameResponseDiv.appendChild(nameLabel);
  nameResponseDiv.appendChild(nameInput);
  reviewerNameDiv.appendChild(nameResponseDiv);
  introDiv.insertAdjacentElement("afterend", reviewerNameDiv);

  // 4. Fetch comments from Power Automate.
  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Fetched data:", data);
      const commentsForDoc = data.Comments || [];
      
      // Update the intro bubble with the correct comment count.
      const commentCountElem = document.querySelector(".client-intro-bubble .comment-count");
      if (commentCountElem) {
        commentCountElem.textContent = commentsForDoc.length;
      }
      
      renderProgressBar(commentsForDoc);
      renderComments(commentsForDoc);
    })
    .catch((err) => {
      console.error("Error fetching comments:", err);
    });

  // 5. Set up the "Submit All" button.
  const submitBtn = document.getElementById("submitAllBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", handleSubmitAll);
  } else {
    console.error("No submitAllBtn found in the DOM.");
  }
});
