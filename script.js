  // Function to scroll and highlight the anchor in the document iframe
  function highlightAnchor(anchorId) {
    var iframe = document.getElementById('docFrame');
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    var anchorElem = iframeDoc.querySelector('a[name="' + anchorId + '"]');
    if (anchorElem) {
      anchorElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      anchorElem.classList.add('highlight');
      setTimeout(function() {
        anchorElem.classList.remove('highlight');
      }, 2000);
    } else {
      console.log('Could not locate the reference for anchor:', anchorId);
    }
  }

  // When a comment block is clicked, scroll to its corresponding anchor.
  document.querySelectorAll('.comment-block').forEach(function(block) {
    block.addEventListener('click', function() {
      var anchorId = block.getAttribute('data-anchor');
      highlightAnchor(anchorId);
    });
  });

  // Additionally, when a response field is focused, highlight the corresponding anchor.
  document.querySelectorAll('.response-field').forEach(function(field) {
    field.addEventListener('focus', function() {
      var parentBlock = field.closest('.comment-block');
      if (parentBlock) {
        var anchorId = parentBlock.getAttribute('data-anchor');
        highlightAnchor(anchorId);
      }
    });
  });

  // Function to collect and submit responses.
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
    // You can later send these responses to your backend (e.g., via an AJAX call)
    alert("Responses have been submitted. Check console for details.");
  }
