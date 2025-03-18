// Define a mapping between the Q&A panel's data-anchor values and the actual anchor names in the document.
// Adjust these values based on the correct anchors for each comment.
var anchorMapping = {
  "cmnt1": "_cmntref1", // For example, change this if "This needs to be more detailed." is at a different anchor.
  "cmnt2": "_cmntref2", // Update accordingly.
  "cmnt3": "_cmntref3",
  "cmnt4": "_cmntref4"
};

// Wait until the iframe is fully loaded before attaching event listeners.
document.getElementById('docFrame').addEventListener('load', function() {

  // Helper function to scroll and highlight the corresponding anchor in the iframe document.
  function highlightAnchor(qnaAnchorId) {
    var actualAnchorName = anchorMapping[qnaAnchorId];
    if (!actualAnchorName) {
      console.log("No mapping found for", qnaAnchorId);
      return;
    }
    var iframe = document.getElementById('docFrame');
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    console.log("Looking for anchor with name:", actualAnchorName);
    var anchorElem = iframeDoc.querySelector('a[name="' + actualAnchorName + '"]');
    if (anchorElem) {
      console.log("Found anchor:", anchorElem);
      anchorElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      anchorElem.classList.add('highlight');
      setTimeout(function() {
        anchorElem.classList.remove('highlight');
      }, 2000);
    } else {
      console.log('Could not locate the reference for anchor:', actualAnchorName);
    }
  }

  // Attach click event listener to each comment block.
  document.querySelectorAll('.comment-block').forEach(function(block) {
    block.addEventListener('click', function() {
      var qnaAnchorId = block.getAttribute('data-anchor');
      highlightAnchor(qnaAnchorId);
    });
  });

  // Attach a focus event to each response field to highlight the corresponding anchor when activated.
  document.querySelectorAll('.response-field').forEach(function(field) {
    field.addEventListener('focus', function() {
      var parentBlock = field.closest('.comment-block');
      if (parentBlock) {
        var qnaAnchorId = parentBlock.getAttribute('data-anchor');
        highlightAnchor(qnaAnchorId);
      }
    });
  });

}); // End of iframe onload event.

// Function to collect and submit responses (remains unchanged).
function submitResponses() {
  var responses = [];
  document.querySelectorAll('.comment-block').forEach(function(block) {
    var commentText = block.querySelector('.comment-text').innerText;
    var response = block.querySelector('.response-field').value;
    var anchor = block.getAttribute('data-anchor');
    responses.push({
      anchor: anchor,
      comment: commentText,
      response: response
    });
  });
  console.log("Collected Responses:", responses);
  alert("Responses have been submitted. Check console for details.");
}
