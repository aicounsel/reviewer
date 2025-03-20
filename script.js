/*************************************************
 * script.js 
 * Reviewer Portal
 *************************************************/

// Helper: Extract DocumentID from the query string (?documentId=XYZ)
function getDocumentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("documentId");
}

/**
 * Inject CSS for highlighted text into the iframe.
 */
function injectHighlightStyle(iframeDoc) {
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = `
    .highlighted-text {
      background-color: yellow;
      transition: background-color 0.3s ease;
    }
  `;
  iframeDoc.head.appendChild(styleEl);
}

/**
 * Helper: Format date string into "M/D/YYYY h:mm AM/PM" format.
 */
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

/**
 * Render the progress bar in #progressBarContainer.
 */
function renderProgressBar(comments) {
  const progressBarContainer = document.getElementById("progressBarContainer");
  progressBarContainer.innerHTML = ""; // Clear existing
  comments.forEach((comment, index) => {
    const stepDiv = document.createElement("div");
    stepDiv.classList.add("step", "gray"); // Default color: gray
    const stepLabel = document.createElement("span");
    stepLabel.textContent = index + 1;
    stepDiv.appendChild(stepLabel);
    progressBarContainer.appendChild(stepDiv);
    // Store reference for later color updates.
    comment.stepElement = stepDiv;
  });
}

/**
 * Render comments and their interaction boxes in #commentContainer.
 */
function renderComments(comments) {
  // Reviewer Name box is already inserted at the top.
  const commentContainer = document.getElementById("commentContainer");

  // Log the comments array to help debug.
  console.log("Rendering comments:", comments);

  // Loop over each comment.
  comments.forEach((comment) => {
    const commentItem = document.createElement("div");
    commentItem.classList.add("comment-item");

    // Comment metadata (without the ID and with formatted date).
    const metadataDiv = document.createElement("div");
    metadataDiv.classList.add("comment-metadata");
    const formattedDate = formatDate(comment.CommentDateTime);
    metadataDiv.textContent = `Author: ${comment.CommentAuthor} | Date: ${formattedDate}`;
    commentItem.appendChild(metadataDiv);

    // Comment text.
    const textDiv = document.createElement("div");
    textDiv.classList.add("comment-text");
    textDiv.textContent = comment.CommentText;
    commentItem.appendChild(textDiv);

    // Interaction box for responses.
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response-area");

    // Create a textarea for entering the response.
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Your response here...";
    textarea.required = true;
    responseDiv.appendChild(textarea);

    // Create a "Mark as Complete" button.
    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Mark as Complete";

    // Event listeners for focus, blur, and button click.
    textarea.addEventListener("focus", () => {
      if (comment.stepElement) {
        comment.stepElement.classList.remove("gray", "blue");
        comment.stepElement.classList.add("yellow");
      }
      highlightDocumentText(comment.TextID, true);
    });
    textarea.addEventListener("blur", () => {
      if (!textarea.value.trim()) {
        if (comment.stepElement && !comment.isComplete) {
          comment.stepElement.classList.remove("yellow", "blue");
          comment.stepElement.classList.add("gray");
        }
      }
      highlightDocumentText(comment.TextID, false);
    });
    completeBtn.addEventListener("click", () => {
      comment.response = textarea.value.trim();
      comment.isComplete = true;
      if (comment.stepElement) {
        comment.stepElement.classList.remove("gray", "yellow");
        comment.stepElement.classList.add("blue");
      }
    });
    responseDiv.appendChild(completeBtn);

    commentItem.appendChild(responseDiv);
    commentContainer.appendChild(commentItem);
  });
}

/**
 * Highlights or un-highlights text in the loaded iframe.
 */
function highlightDocumentText(textID, highlight) {
  const docIframe = document.getElementById("docIframe");
  const iframeDoc =
    docIframe.contentDocument || docIframe.contentWindow.document;
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

/**
 * Called when user clicks "Submit All Answers".
 * Validates that all fields are filled in, then gathers responses and sends them to the Power Automate flow.
 */
function handleSubmitAll() {
  const documentId = getDocumentIdFromUrl();

  // Validate reviewer name is provided.
  const reviewerNameInput = document.getElementById("reviewerNameInput");
  if (!reviewerNameInput.value.trim()) {
    alert("Please enter your name.");
    return;
  }

  // Validate that all comment responses are filled.
  const commentItems = document.querySelectorAll(
    ".comment-item:not(.reviewer-name-item)"
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

  // Re-fetch the comments to build the submission payload.
  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId })
  })
    .then((res) => res.json())
    .then((allData) => {
      const commentsForDoc = allData.Comments.filter(
        (c) => c.DocumentID === documentId
      );

      // Collect responses from the DOM.
      const commentItems = document.querySelectorAll(
        ".comment-item:not(.reviewer-name-item)"
      );
      commentItems.forEach((item, idx) => {
        const textarea = item.querySelector("textarea");
        const textVal = textarea.value.trim();
        commentsForDoc[idx].response = textVal;
      });

      // Compute total number of comments.
      const totalComments = commentsForDoc.length;
      let responseIndex = 0;

      // Build payload including computed response details.
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

      // POST the payload to the update flow.
      fetch(
        "https://prod-187.westus.logic.azure.com:443/workflows/662f3d3b44054a3f930913f1007b9832/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a7Ev7_hYa2Dy75PO4Kij93tlmJLtFPFh1WhkoV-HuMc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
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

// Main code: run after DOM loads.
document.addEventListener("DOMContentLoaded", () => {
  const documentId = getDocumentIdFromUrl();

  // If no DocumentID is provided, alert and exit.
  if (!documentId) {
    alert("No DocumentID provided in URL. Example: ?documentId=mydoc-1234");
    return;
  }

  // 1. Set the iframe source to the matching .html in /agreements
  const docIframe = document.getElementById("docIframe");
  docIframe.src = `./agreements/${documentId}.html`;

  // 2. Once the iframe finishes loading, inject CSS for .highlighted-text
  docIframe.addEventListener("load", () => {
    const iframeDoc =
      docIframe.contentDocument || docIframe.contentWindow.document;
    if (iframeDoc) {
      injectHighlightStyle(iframeDoc);
    }
  });

  // 3. Insert Reviewer Name interaction box above the first comment box.
  const reviewerNameDiv = document.createElement("div");
  reviewerNameDiv.classList.add("comment-item", "reviewer-name-item");
  const nameResponseDiv = document.createElement("div");
  nameResponseDiv.classList.add("response-area");
  const nameLabel = document.createElement("div");
  nameLabel.textContent = "Your Name";
  nameLabel.style.fontWeight = "bold";
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

  // 4. Fetch comments from Power Automate.
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

  // 5. Set up "Submit All" button with required-field validation.
  document
    .getElementById("submitAllBtn")
    .addEventListener("click", handleSubmitAll);
});
