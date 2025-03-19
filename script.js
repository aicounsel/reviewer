/***************************************************
 * script.js
 ***************************************************/

// =====================================
// 1. Optional Password Gate
// =====================================
const correctPassword = "mySecretPassword"; // Obviously store more securely if possible

function setupPasswordGate() {
  const overlay = document.getElementById("passwordOverlay");
  const mainContainer = document.getElementById("mainContainer");
  const passwordInput = document.getElementById("passwordInput");
  const passwordSubmit = document.getElementById("passwordSubmit");
  const passwordError = document.getElementById("passwordError");

  if (!overlay || !passwordInput || !passwordSubmit) {
    // If we don't have these elements, maybe we skip password gating
    return;
  }

  // By default, hide the main container (in style.css or here)
  mainContainer.style.display = "none";

  passwordSubmit.addEventListener("click", () => {
    if (passwordInput.value === correctPassword) {
      // Correct password
      overlay.style.display = "none";
      mainContainer.style.display = "block";
    } else {
      // Wrong password
      passwordError.style.display = "block";
    }
  });
}

// =====================================
// 2. Utility: Get Document ID from URL
// =====================================
function getDocumentID() {
  // Example: ?documentId=firstlastcliente-1986b709-7f46-4c71-a03d-4ab8b924ea68
  // or you might parse from window.location.pathname if you prefer.
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get("documentId");
  return docId;
}

// =====================================
// 3. Load the Document in the Left Panel
// =====================================
function loadDocument(docId) {
  const iframe = document.getElementById("documentFrame");
  if (!iframe) return;

  // Construct the path to the HTML file
  // e.g. /agreements/<DocumentID>.html
  if (docId) {
    iframe.src = `agreements/${docId}.html`;
  } else {
    // If no docId, maybe show an error or a default page
    iframe.src = `agreements/default.html`;
  }
}

// =====================================
// 4. Fetch Comments Data
// =====================================
// For simplicity, we fetch a local JSON file. 
// In reality, you'd fetch from Power Automate or a live endpoint.
function fetchCommentsJSON() {
  // Replace 'comments.json' with your real endpoint.
  return fetch("comments.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load comments JSON");
      return res.json();
    })
    .catch((err) => {
      console.error("Error fetching comments:", err);
      return [];
    });
}

// =====================================
// 5. Render Progress Bar & Comments
// =====================================

// We'll store comment data in memory for easy referencing
let commentsData = [];

// For the dynamic progress bar, we'll store each step's element references
const progressBarSteps = [];

/**
 * Render the progress bar based on the number of comments.
 */
function renderProgressBar(numComments) {
  const progressBar = document.getElementById("progressBar");
  if (!progressBar) return;

  // Clear existing content if any
  progressBar.innerHTML = "";

  for (let i = 0; i < numComments; i++) {
    // Create the diamond shape
    const stepEl = document.createElement("div");
    stepEl.classList.add("progress-step");
    stepEl.textContent = i + 1; // label = 1,2,3,...

    // Keep track of this step in an array so we can update colors later
    progressBarSteps.push(stepEl);

    // Add step to the DOM
    progressBar.appendChild(stepEl);

    // If not the last step, add a connector line
    if (i < numComments - 1) {
      const connector = document.createElement("div");
      connector.classList.add("progress-connector");
      progressBar.appendChild(connector);
      progressBarSteps.push(connector);
    }
  }
}

/**
 * Render the comments list on the right panel
 */
function renderCommentsList(filteredComments) {
  const commentsList = document.getElementById("commentsList");
  if (!commentsList) return;

  // Clear out existing
  commentsList.innerHTML = "";

  filteredComments.forEach((comment, index) => {
    // Create the comment container
    const commentItem = document.createElement("div");
    commentItem.classList.add("comment-item");

    // Comment header (ID, Author, Date)
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("comment-header");

    const leftHeader = document.createElement("span");
    leftHeader.textContent = `ID: ${comment.CommentID}`;

    const rightHeader = document.createElement("span");
    rightHeader.textContent = comment.CommentDateTime; // e.g., "3/15/2025 03:50 PM"

    headerDiv.appendChild(leftHeader);
    headerDiv.appendChild(rightHeader);

    // Comment text
    const commentTextDiv = document.createElement("div");
    commentTextDiv.classList.add("comment-text");
    commentTextDiv.textContent = comment.CommentText;

    // Author line (optional)
    const authorDiv = document.createElement("div");
    authorDiv.style.fontStyle = "italic";
    authorDiv.textContent = `By: ${comment.CommentAuthor}`;

    // Response area
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("comment-response");

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Type your response here...";

    // Keep track of the response in our data array
    // so we don't have to fish it out of the DOM later.
    // We'll store it in the comment object itself.
    textarea.addEventListener("input", () => {
      comment.responseText = textarea.value;
      // If user is typing, let's highlight the progress step in yellow
      updateProgressBarStep(index, "yellow");
    });

    responseDiv.appendChild(textarea);

    // Mark as complete
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("comment-actions");

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Mark as Complete";
    completeBtn.classList.add("mark-complete-btn");
    completeBtn.addEventListener("click", () => {
      // If there's a response, we'll consider it complete
      if (comment.responseText && comment.responseText.trim().length > 0) {
        comment.isComplete = true;
        // Update the progress bar for this comment
        updateProgressBarStep(index, "blue");
      } else {
        // If there's no response, revert to grey or show an alert
        alert("Please enter a response before marking complete.");
      }
    });

    actionsDiv.appendChild(completeBtn);

    // Attach highlight/scroll logic
    // On focus of the textarea, highlight the relevant text in the left doc
    textarea.addEventListener("focus", () => {
      highlightDocumentText(comment.TextID, true);
      // Also highlight the progress step in yellow (if not completed)
      if (!comment.isComplete) {
        updateProgressBarStep(index, "yellow");
      }
    });
    // On blur, remove highlight if not completed
    textarea.addEventListener("blur", () => {
      highlightDocumentText(comment.TextID, false);
      if (!comment.isComplete) {
        // revert to grey or check if user typed something
        if (comment.responseText && comment.responseText.trim().length > 0) {
          // user typed something but hasn't marked complete => stay yellow or revert?
          // For this example, let's revert to grey if they're not actively focused
          updateProgressBarStep(index, "grey");
        } else {
          updateProgressBarStep(index, "grey");
        }
      }
    });

    // Append everything to commentItem
    commentItem.appendChild(headerDiv);
    commentItem.appendChild(commentTextDiv);
    commentItem.appendChild(authorDiv);
    commentItem.appendChild(responseDiv);
    commentItem.appendChild(actionsDiv);

    // Finally, append to the list
    commentsList.appendChild(commentItem);
  });
}

// =====================================
// 6. Progress Bar Coloring
// =====================================
function updateProgressBarStep(stepIndex, colorState) {
  // Each step has a diamond and possibly a connector after it,
  // so we need to map index -> 2*index for the diamond, 2*index+1 for the connector
  // Example:
  //  stepIndex=0 => diamond @0, connector @1
  //  stepIndex=1 => diamond @2, connector @3
  // etc.

  const diamondPos = stepIndex * 2; 
  const connectorPos = stepIndex * 2 + 1;

  const validDiam = progressBarSteps[diamondPos];
  const validConn = progressBarSteps[connectorPos];

  // Decide color class
  let backgroundClass = "";
  switch (colorState) {
    case "yellow":
      backgroundClass = "step-yellow";
      break;
    case "blue":
      backgroundClass = "step-blue";
      break;
    case "grey":
    default:
      backgroundClass = "";
  }

  // Remove existing color classes
  if (validDiam) {
    validDiam.classList.remove("step-yellow", "step-blue");
    if (backgroundClass) validDiam.classList.add(backgroundClass);
  }
  if (validConn) {
    validConn.classList.remove("step-yellow", "step-blue");
    if (backgroundClass) validConn.classList.add(backgroundClass);
  }
}

// =====================================
// 7. Highlighting & Scrolling
// =====================================
function highlightDocumentText(textID, shouldHighlight) {
  // Access the iframe document to find the anchor or span
  const iframe = document.getElementById("documentFrame");
  if (!iframe) return;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  if (!iframeDoc) return;

  // Find the anchor with name=textID or an element with id=textID
  const anchorEl = iframeDoc.querySelector(`a[name="${textID}"]`) || iframeDoc.getElementById(textID);
  if (!anchorEl) return;

  if (shouldHighlight) {
    // Scroll into view
    anchorEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Add highlight class to the anchor or its children
    anchorEl.classList.add("highlighted-text");
    // Or if the text is in a <span> child, you might highlight that specifically.
    // e.g. anchorEl.querySelector("span").classList.add("highlighted-text");
  } else {
    anchorEl.classList.remove("highlighted-text");
  }
}

// =====================================
// 8. Submit All Responses
// =====================================
function setupSubmitAllButton() {
  const submitAllBtn = document.getElementById("submitAll");
  if (!submitAllBtn) return;

  submitAllBtn.addEventListener("click", () => {
    // Gather all the responses that are complete or incomplete
    const dataToSubmit = {
      DocumentID: getDocumentID() || "unknown-document",
      Comments: commentsData.map((c) => ({
        CommentID: c.CommentID,
        ResponseText: c.responseText || "",
        IsComplete: !!c.isComplete,
      })),
    };

    console.log("Submitting data:", dataToSubmit);

    // Example: Send to Power Automate endpoint
    fetch("https://your-power-automate-flow-url.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSubmit),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error submitting data to Power Automate");
        alert("All answers submitted successfully!");
      })
      .catch((err) => {
        console.error("Submission error:", err);
        alert("Something went wrong while submitting.");
      });
  });
}

// =====================================
// 9. Initialization
// =====================================
document.addEventListener("DOMContentLoaded", async () => {
  // If using password gating, uncomment this
  // setupPasswordGate();

  // Get Document ID from query string
  const docId = getDocumentID();
  // Load the doc into the iframe
  loadDocument(docId);

  // Retrieve comments from JSON
  const allComments = await fetchCommentsJSON();

  // Filter for the current doc
  commentsData = allComments.filter((item) => {
    return item.DocumentID === docId;
  });

  // Build the progress bar with the number of comments we found
  renderProgressBar(commentsData.length);

  // Render the comments list
  renderCommentsList(commentsData);

  // Set up submission logic
  setupSubmitAllButton();
});
