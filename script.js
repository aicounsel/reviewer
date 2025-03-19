/*************************************************************
  On page load, we:
   1) Parse the DocumentID from the URL.
   2) Set the iframe source to load the corresponding .html in /agreements/.
   3) Fetch the comments JSON and filter by DocumentID.
   4) Render the progress bar and comments list.
   5) Handle highlight logic and “mark as complete” logic.
**************************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // 1) Get Document ID from URL ?documentId=...
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get("documentId") || "defaultDocId"; 
  // If you prefer the docId to come from the actual path, parse window.location.pathname instead.

  // 2) Load the corresponding .html in the iframe
  const iframe = document.getElementById("doc-iframe");
  iframe.src = `agreements/${docId}.html`;

  // 3) Fetch comments JSON & filter
  fetch("comments.json") // Adjust path if needed
    .then(response => response.json())
    .then(allComments => {
      // Filter for those that match the docId
      const docComments = allComments.filter(c => c.DocumentID === docId);

      // If no comments found, handle gracefully
      if (docComments.length === 0) {
        console.log("No comments found for this DocumentID.");
      }

      // 4) Render the progress bar & comments list
      renderProgressBar(docComments.length);
      renderCommentsList(docComments);

      // Listen for Submit All
      const submitAllBtn = document.getElementById("submit-all-btn");
      submitAllBtn.addEventListener("click", () => {
        handleSubmitAll(docId, docComments);
      });
    })
    .catch(err => {
      console.error("Error fetching comments:", err);
    });
});

/*************************************************************
  Render a simple progress bar with N “segments” (diamonds or squares).
  For demonstration, let's just add <span> elements for each step.
**************************************************************/
function renderProgressBar(numComments) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.innerHTML = ""; // Clear any existing

  for (let i = 0; i < numComments; i++) {
    const stepEl = document.createElement("span");
    stepEl.classList.add("progress-step");
    stepEl.textContent = i + 1;
    // We can style it as a diamond via CSS transform, or keep it simple
    stepEl.style.display = "inline-block";
    stepEl.style.width = "20px";
    stepEl.style.height = "20px";
    stepEl.style.lineHeight = "20px";
    stepEl.style.textAlign = "center";
    stepEl.style.marginRight = "8px";
    stepEl.style.backgroundColor = "#ccc";
    stepEl.style.color = "#fff";
    stepEl.style.borderRadius = "3px";
    stepEl.style.transform = "rotate(45deg)";
    stepEl.style.cursor = "pointer";

    progressBar.appendChild(stepEl);

    // Optional: add a line or arrow between steps
    if (i < numComments - 1) {
      const connector = document.createElement("span");
      connector.textContent = "---";
      connector.style.marginRight = "8px";
      progressBar.appendChild(connector);
    }
  }
}

/*************************************************************
  Render the comments list on the right pane.
  We'll maintain an internal array to track each comment's status:
    - "notTouched"
    - "inProgress"
    - "complete"
**************************************************************/
function renderCommentsList(comments) {
  const commentsList = document.getElementById("comments-list");
  commentsList.innerHTML = "";

  comments.forEach((comment, index) => {
    // Create a container for each comment
    const commentEl = document.createElement("div");
    commentEl.classList.add("comment-item");

    // Comment metadata header
    const header = document.createElement("header");
    header.textContent = `Comment #${index + 1} | ${comment.CommentAuthor} | ${comment.CommentDateTime}`;
    commentEl.appendChild(header);

    // Actual comment text
    const commentTextP = document.createElement("p");
    commentTextP.classList.add("comment-text");
    commentTextP.textContent = comment.CommentText;
    commentEl.appendChild(commentTextP);

    // Response textarea
    const responseArea = document.createElement("textarea");
    responseArea.classList.add("response-area");
    responseArea.placeholder = "Write your response here...";
    commentEl.appendChild(responseArea);

    // Mark Complete button
    const completeBtn = document.createElement("button");
    completeBtn.classList.add("mark-complete-btn");
    completeBtn.textContent = "Mark as Complete";
    commentEl.appendChild(completeBtn);

    // Append to list
    commentsList.appendChild(commentEl);

    // Track status in an attribute or in memory
    let status = "notTouched";

    // PROGRESS BAR ELEM
    const progressStep = document.querySelectorAll(".progress-step")[index];

    // Events:
    // 1) Focus in => highlight doc text, turn step "yellow"
    responseArea.addEventListener("focus", () => {
      if (status === "notTouched") {
        status = "inProgress";
        progressStep.style.backgroundColor = "yellow";
      }
      highlightDocumentText(comment.TextID, true);
    });

    // 2) Blur => if no text is present, revert to "notTouched", else remain "inProgress"
    responseArea.addEventListener("blur", () => {
      highlightDocumentText(comment.TextID, false);
      if (!responseArea.value.trim() && status !== "complete") {
        status = "notTouched";
        progressStep.style.backgroundColor = "#ccc";
      }
    });

    // 3) Mark Complete => set status to "complete", step to "blue"
    completeBtn.addEventListener("click", () => {
      status = "complete";
      progressStep.style.backgroundColor = "#007bff";
    });
  });
}

/*************************************************************
  Highlight or un-highlight the relevant text in the document.
  This depends on whether you can access the iframe’s DOM.
**************************************************************/
function highlightDocumentText(textID, shouldHighlight) {
  // Attempt to highlight in the iframe
  const iframe = document.getElementById("doc-iframe");
  const doc = iframe.contentWindow.document; // same-domain only

  if (!doc) return;

  // Find the anchor or element with name=textID
  const anchor = doc.querySelector(`a[name="${textID}"]`) || doc.getElementById(textID);
  if (!anchor) return;

  if (shouldHighlight) {
    anchor.classList.add("highlighted-text");
    // Scroll into view smoothly
    anchor.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    anchor.classList.remove("highlighted-text");
  }
}

/*************************************************************
  Handle "Submit All" -> gather all responses & send to Power Automate
**************************************************************/
function handleSubmitAll(docId, comments) {
  // Build a data object
  const payload = {
    DocumentID: docId,
    Comments: []
  };

  // Grab the textareas from the DOM
  const commentEls = document.querySelectorAll(".comment-item");
  commentEls.forEach((item, index) => {
    const textarea = item.querySelector("textarea");
    const responseText = textarea.value.trim();
    const commentID = comments[index].CommentID;

    payload.Comments.push({
      CommentID: commentID,
      ResponseText: responseText
    });
  });

  // For demo: just log it. In reality, you'd POST to Power Automate
  console.log("Final payload:", payload);

  /*
  fetch("https://your-power-automate-endpoint.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    console.log("Submitted successfully:", data);
    alert("All answers submitted!");
  })
  .catch(err => {
    console.error("Submission error:", err);
    alert("There was an error submitting your responses.");
  });
  */
}
