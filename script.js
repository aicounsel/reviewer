/* Style for the minimize toggle button in the comment header */
.minimize-toggle {
  margin-left: auto; /* push to the right */
  background: transparent;
  border: none;
  font-size: 1em;
  cursor: pointer;
}

/* When a comment is minimized, hide the comment text and response area */
.comment-item.minimized .comment-text,
.comment-item.minimized .response-area {
  display: none;
}

/* Optionally adjust the header when minimized */
.comment-item.minimized .comment-header {
  justify-content: space-between;
}
