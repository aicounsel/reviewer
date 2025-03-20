/*************************************************
 * script.js 
 * Skeleton for the reviewer portal logic
 *************************************************/

// Power Automate endpoint for fetching comments
const COMMENTS_URL =
  "https://prod-15.westus.logic.azure.com:443/workflows/318e9ff4339b4f6e8527a2ab74027c0d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8Wg9umOg3LnKsvTvCTSIB6XtntGYjiW8iKU4XGs9xWM";

/**
 * On page load, do the following:
 * 1. Get DocumentID from query string
 * 2. Load the relevant doc into the left panel
 * 3. Fetch comments data & render the progress bar and comments
 */
document.addEventListener("DOMContentLoaded", () => {
  const documentId = getDocumentIdFromUrl();

  // If you want to handle "no DocumentID" gracefully:
  if (!documentId) {
    alert("No DocumentID provided in URL. Example: ?documentId=mydoc-1234");
    return;
  }

  // 1. Set the iframe source to the matching .html in /agreements
  const docIframe = document.getElementById("docIframe");
  docIframe.src = `./agreements/${documentId}.html`;

  // 2. Once the iframe finishes loading, inject CSS for .highlighted-text
  docIframe.addEventListener("load", () => {
    const iframeDoc = docIframe.contentDocument || docIframe.contentWindow.document;
    if (iframeDoc) {
      injectHighlightStyle(iframeDoc);
    }
  });

  // 3. Fetch comments from Power Automate
  fetch(COMMENTS_URL, {
    method: "POST", // since your flow uses an HTTP POST trigger
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId })
  })
    .then((res) => res.json())
    .then((data) => {
      // data now contains { DocumentID, Comments }
      const commentsForDoc = data.Comments || [];
      renderProgressBar(commentsForDoc);
      renderComments(commentsForDoc);
    })
    .catch((err) => {
      console.error("Error fetching comments:", err);
    });

  // 4. Set up "Submit All" button
  document
    .getElementById("submitAllBtn")
    .addEventListener("click", handleSubmitAll);
});

/**
 * Helper: Extract DocumentID from the query string (?documentId=XYZ)
 */
function getDocumentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("documentId");
}

/**
 * Highlight: Inject the style needed for .highlighted-text into the iframe
 */
function injectHighlightStyle(iframeDoc) {
  // Create a <style> node
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = `
    .highlighted-text {
      background-color: yellow;
      transition: background-color 0.3s ease;
    }
  `;
  // Append to the <head> of the iframe
  iframeDoc.head.appendChild(styleEl);
}

/**
 * Render the progress bar in #progressBarContainer.
 * Each comment will map to a diamond/step.
 */
function renderProgressBar(comments) {
  const progressBarContainer = document.getElementById("progressBarContainer");
  progressBarContainer.innerHTML = ""; // clear existing

  comments.forEach((comment, index) => {
    // Create a diamond step
    const stepDiv = document.createElement("div");
    stepDiv.classList.add("step", "gray"); // default color: gray

    // Label it with index+1
    const stepLabel = document.createElement("span");
    stepLabel.textContent = index + 1;

    stepDiv.appendChild(stepLabel);
    progressBarContainer.appendChild(stepDiv);

    // Store reference on the comment object so we can update color easily
    comment.stepElement = stepDiv;
  });
}

/**
 * Render comments in #commentContainer
 */
function renderComments(comments) {
  const commentContainer = document.getElementById("commentContainer");
  commentContainer.innerHTML = ""; // clear existing

  comments.forEach((comment, index) => {
    // Create a container for each comment
    const commentItem = document.createElement("div");
    commentItem.classList.add("comment-item");

    // Comment metadata
    const metadataDiv = document.createElement("div");
    metadataDiv.classList.add("comment-metadata");
    metadataDiv.textContent = `ID: ${comment.CommentID} | Author: ${comment.CommentAuthor} | Date: ${comment.CommentDateTime}`;
    commentItem.appendChild(metadataDiv);

    // Comment text
    const textDiv = document.createElement("div");
    textDiv.classList.add("comment-text");
    textDiv.textContent = comment.CommentText;
    commentItem.appendChild(textDiv);

    // Response area
    const responseDiv = document.createElement("div");
    responseDiv.classList.add("response-area");

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Your response here...";
    responseDiv.appendChild(textarea);

    // "Mark as complete" button
    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Mark as Complete";

    // When the user focuses on the textarea
    textarea.addEventListener("focus", () => {
      // Turn the corresponding progress bar step to yellow
      if (comment.stepElement) {
        comment.stepElement.classList.remove("gray", "blue");
        comment.stepElement.classList.add("yellow");
      }

      // Highlight the text in the iframe if possible
      highlightDocumentText(comment.TextID, true);
    });

    // When the user blurs the textarea
    textarea.addEventListener("blur", () => {
      // If they haven't clicked "complete" and the textarea is empty,
      // revert to gray, else stay yellow if there's content.
      if (!textarea.value.trim()) {
        if (comment.stepElement && !comment.isComplete) {
          comment.stepElement.classList.remove("yellow", "blue");
          comment.stepElement.classList.add("gray");
        }
      }
      // Remove highlight
      highlightDocumentText(comment.TextID, false);
    });

    // On "Mark as Complete"
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
 * Called when user clicks "Submit All Answers"
 * Gather up the responses and send them back to your Power Automate flow
 * which updates the corresponding SharePoint rows with the response details.
 */
console.log("Submit All Answers clicked.");
function handleSubmitAll() {
  const documentId = getDocumentIdFromUrl();
  fetch(COMMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ DocumentID: documentId })
  })
    .then((res) => res.json())
    .then((allData) => {
      // allData is { DocumentID, Comments }
      // Filter comments for this DocumentID
      const commentsForDoc = allData.Comments.filter(
        (c) => c.DocumentID === documentId
      );

      // Collect the responses from the DOM
      const commentItems = document.querySelectorAll(".comment-item");
      commentItems.forEach((item, idx) => {
        const textarea = item.querySelector("textarea");
        const textVal = textarea.value.trim();
        commentsForDoc[idx].response = textVal;
      });

      // Build final data payload including additional response details.
      // NOTE: Replace "Reviewer Name" with an actual value if available.
      const payload = {
        DocumentID: documentId,
        Comments: commentsForDoc.map((c) => ({
          CommentID: c.CommentID,
          // Response details being sent to update SharePoint:
          ResponseText: c.response || "",
          ResponseAuthor: "Reviewer Name", // Replace with dynamic reviewer info if available.
          ResponseDateTime: new Date().toISOString(),
          ResponseTextID: c.TextID, // Or use a new value if needed.
          ResponseTextHighlight: c.TextHighlight, // Adjust if you want different formatting.
          ResponseFullText: c.FullText // Or build an HTML string if required.
        }))
      };

      console.log("Submitting data to Power Automate:", payload);

      // POST to your Power Automate endpoint that handles updating the SharePoint list.
      fetch("https://prod-101.westus.logic.azure.com:443/workflows/a89622dede3e4598bf5403e30fedf87b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=kD52-8wSlzumCmCs_In5ugvt_cndHeOptsjPyQWHGd0", {
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

/**
 * Simple function to highlight (or un-highlight) the text in the loaded iframe
 * identified by the <a name="TextID">.
 *  - highlight = true -> add highlighting
 *  - highlight = false -> remove highlighting
 */
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
