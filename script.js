/*****************************************************
 * Basic PDF.js Setup
 *****************************************************/

// Path to your PDF worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.js';

// Example PDF URL (you'd set this dynamically)
const pdfUrl = 'my-sample.pdf';

// Store the loaded PDF document object globally
let pdfDoc = null;

/*****************************************************
 * Example "Comment" Data Structure
 * - In real usage, these come from your database/SharePoint.
 * - Each "comment" references a page number and a bounding box
 *   for the highlight: (x, y, width, height).
 * - Coordinates assume some scale factor you used for rendering.
 *****************************************************/
const commentData = [
  {
    id: 1,
    pageNumber: 1,
    title: "Section 1: Indemnification",
    question: "Do you agree with unlimited indemnification?",
    answer: "",
    highlight: { x: 100, y: 150, width: 200, height: 40 } 
  },
  {
    id: 2,
    pageNumber: 1,
    title: "Section 1: Payment Terms",
    question: "Is 30 days an acceptable payment period?",
    answer: "",
    highlight: { x: 100, y: 300, width: 250, height: 40 } 
  },
  {
    id: 3,
    pageNumber: 2,
    title: "Section 2: Dispute Resolution",
    question: "Preferred jurisdiction?",
    answer: "",
    highlight: { x: 80, y: 200, width: 300, height: 40 } 
  }
];

document.addEventListener('DOMContentLoaded', init);

function init() {
  // Load the PDF
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    pdfDoc = pdf;
    renderPDF();
    renderComments();
    updateProgressBar();
  });
}

/*****************************************************
 * Render the PDF pages on canvas
 *****************************************************/
function renderPDF() {
  const viewer = document.getElementById('pdf-viewer');

  // Clear any existing canvas
  viewer.innerHTML = "";

  // Render each page
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    pdfDoc.getPage(pageNum).then(page => {
      const scale = 1.2;
      const viewport = page.getViewport({ scale });

      // Create canvas for this page
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');

      // Append canvas so user sees the page
      viewer.appendChild(canvas);

      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext).promise.then(() => {
        // Once the page is rendered, overlay any highlight boxes 
        // that belong to this page.
        overlayHighlights(pageNum, scale, canvas);
      });
    });
  }
}

/*****************************************************
 * Overlay Highlight Boxes
 * - For each comment referencing this page, draw a 
 *   highlight <div> absolutely positioned over the canvas.
 *****************************************************/
function overlayHighlights(pageNum, scale, canvas) {
  // Filter commentData for those that match this page
  const highlights = commentData.filter(c => c.pageNumber === pageNum);

  highlights.forEach(item => {
    // Calculate where to place highlight box.
    // Coordinates in "item.highlight" are assumed to match 
    // the scale used for rendering or you need to multiply
    // them by the same scale factor.

    const x = item.highlight.x;
    const y = item.highlight.y;
    const w = item.highlight.width;
    const h = item.highlight.height;

    // Create a highlight box
    const highlightDiv = document.createElement('div');
    highlightDiv.className = 'highlight-box';
    // Position relative to the canvas's position
    highlightDiv.style.left = (canvas.offsetLeft + x) + 'px';
    highlightDiv.style.top = (canvas.offsetTop + y) + 'px';
    highlightDiv.style.width = w + 'px';
    highlightDiv.style.height = h + 'px';

    // If you'd like to handle clicks on the highlight:
    highlightDiv.addEventListener('click', () => {
      // For example, scroll to the corresponding comment
      scrollToComment(item.id);
    });

    // Insert highlight box in the same container as the canvas
    canvas.parentNode.appendChild(highlightDiv);
  });
}

/*****************************************************
 * Render the Comments in the Side Panel
 *****************************************************/
function renderComments() {
  const container = document.getElementById('prompts-container');
  container.innerHTML = '';

  commentData.forEach(comment => {
    const div = document.createElement('div');
    div.classList.add('prompt-item');

    // Title
    const titleEl = document.createElement('div');
    titleEl.className = 'prompt-title';
    titleEl.textContent = comment.title;
    div.appendChild(titleEl);

    // Question
    const questionEl = document.createElement('div');
    questionEl.className = 'prompt-question';
    questionEl.textContent = comment.question;
    div.appendChild(questionEl);

    // Textarea
    const inputEl = document.createElement('textarea');
    inputEl.className = 'prompt-input';
    inputEl.rows = 2;
    inputEl.placeholder = "Type your response...";
    inputEl.value = comment.answer;
    inputEl.addEventListener('input', (e) => {
      comment.answer = e.target.value;
      updateProgressBar();
    });
    div.appendChild(inputEl);

    // Button to jump to highlight
    const jumpBtn = document.createElement('button');
    jumpBtn.textContent = 'Show Highlight';
    jumpBtn.addEventListener('click', () => {
      jumpToPageAndHighlight(comment);
    });
    div.appendChild(jumpBtn);

    container.appendChild(div);
  });
}

/*****************************************************
 * Jump to Page & Highlight
 * - Scrolls the PDF viewer to the canvas for that page
 *   and maybe flashes the highlight.
 *****************************************************/
function jumpToPageAndHighlight(comment) {
  const viewer = document.getElementById('pdf-viewer');
  const allCanvases = viewer.querySelectorAll('canvas');

  // Because we rendered pages in order, 
  // the nth canvas is for page n (index offset by 1).
  const targetCanvas = allCanvases[comment.pageNumber - 1];
  if (targetCanvas) {
    viewer.scrollTo({
      top: targetCanvas.offsetTop - 20,
      behavior: 'smooth'
    });
    // Optional: you could briefly flash the highlight color
    // or do something else visually.
  }
}

/*****************************************************
 * Scroll from Highlight to the correct Comment
 *****************************************************/
function scrollToComment(commentId) {
  const container = document.getElementById('prompts-container');
  const item = container.querySelectorAll('.prompt-item')[commentId - 1];
  if (item) {
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/*****************************************************
 * Progress Bar
 *****************************************************/
function updateProgressBar() {
  const total = commentData.length;
  const answered = commentData.filter(c => c.answer.trim() !== '').length;
  const percent = Math.round((answered / total) * 100);

  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  bar.style.width = percent + '%';
  text.textContent = `${percent}% Complete`;
}
