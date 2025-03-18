// Wait until the iframe is fully loaded before attaching event listeners
document.getElementById('docFrame').addEventListener('load', function() {
  
  // Helper function to scroll and highlight the corresponding anchor in the iframe document
  function highlightAnchor(anchorId) {
    var iframe = document.getElementById('docFrame');
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Log to debug
    console.log("Looking for anchor with name:", anchorId);
    
    var anchorElem = iframeDoc.querySelector('a[name="' + anchorId + '"]');
    if (anchorElem) {
      console.log("Found anchor:", anchorElem);
      anchorElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      anchorElem.classList.add('highlight');
      setTimeout(function() {
        anchorElem.classList.remove('highlight');
      }, 2000);
    } else {
      console.log('Could not locate the reference for anchor:', anchorId);
    }
  }

  // Attach click event listener to each comment block
  document.querySelectorAll('.comment-block').forEach(function(block) {
    block.addEventListener('click', function() {
      var anchorId = block.getAttribute('data-anchor');
      highlightAnchor(anchorId);
    });
  });

  // Attach a focus event to each response field to highlight the corresponding anchor when activated
  document.querySelectorAll('.response-field').forEach(function(field) {
    field.addEventListener('focus', function() {
      var parentBlock = field.closest('.comment-block');
      if (parentBlock) {
        var anchorId = parentBlock.getAttribute('data-anchor');
        highlightAnchor(anchorId);
      }
    });
  });
  
}); // end of iframe onload event

// Function to collect and submit responses (remains unchanged)
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
