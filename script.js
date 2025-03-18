// Wait until the iframe is fully loaded before attaching event listeners.
document.getElementById('docFrame').addEventListener('load', function() {
  // Helper function to scroll and highlight the corresponding anchor in the iframe document.
  function highlightAnchor(anchorId) {
    if (!anchorId) {
      console.error("No anchor ID provided");
      return;
    }
    
    const iframe = document.getElementById('docFrame');
    if (!iframe) {
      console.error("Could not find docFrame element");
      return;
    }
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    console.log("Looking for anchor with name:", anchorId);

    // Use the data-anchor value directly.
    const anchorElem = iframeDoc.querySelector('a[name="' + anchorId + '"]');
    if (anchorElem) {
      console.log("Found anchor:", anchorElem);
      anchorElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add the highlight class
      anchorElem.classList.add('highlight');
      
      // Remove the highlight class after a delay
      setTimeout(function() {
        anchorElem.classList.remove('highlight');
      }, 2000);
    } else {
      console.warn("Could not locate the reference for anchor:", anchorId);
    }
  }

  // Attach click event listener to each comment block.
  document.querySelectorAll('.comment-block').forEach(function(block) {
    block.addEventListener('click', function() {
      const anchorId = this.getAttribute('data-anchor');
      highlightAnchor(anchorId);
    });
  });

  // Attach a focus event to each response field so that when the user clicks into it,
  // the corresponding anchor is highlighted.
  document.querySelectorAll('.response-field').forEach(function(field) {
    field.addEventListener('focus', function() {
      const parentBlock = this.closest('.comment-block');
      if (parentBlock) {
        const anchorId = parentBlock.getAttribute('data-anchor');
        highlightAnchor(anchorId);
      }
    });
  });
}); // End of iframe onload event.

// Function to collect and submit responses.
function submitResponses() {
  const responses = [];
  
  document.querySelectorAll('.comment-block').forEach(function(block) {
    const commentText = block.querySelector('.comment-text')?.innerText || '';
    const responseField = block.querySelector('.response-field');
    const response = responseField ? responseField.value : '';
    const anchor = block.getAttribute('data-anchor');
    
    responses.push({
      anchor: anchor,
      comment: commentText,
      response: response
    });
  });
  
  console.log("Collected Responses:", responses);
  
  // You might want to send this data to a server instead of just logging it
  // const result = await fetch('/api/submit-responses', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(responses)
  // });
  
  alert("Responses have been submitted. Check console for details.");
  
  return responses; // Return the data for potential further processing
}
