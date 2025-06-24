// DOM elements
const commentsSection = document.getElementById('commentsSection');
const newCommentInput = document.getElementById('newComment');
const addCommentButton = document.getElementById('addCommentBtn');

// Track current user & members
let currentUser = {
  id: localStorage.getItem('userId'),
  image: localStorage.getItem('userImage'),
  displayName: localStorage.getItem('userDisplayName'),
};
let membersLookup = {}; // Populate with project members { id: { image, displayName } }

// Fetch project members into a lookup
async function fetchProjectMembers(projectId) {
  if (!projectId) return;
  try {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      const members = await res.json();
      membersLookup = {};
      members.forEach(m => {
        membersLookup[m.id] = { image: m.image, displayName: m.displayName };
      });
    } else {
      console.error('Error fetching project members:', res.statusText);
    }
  } catch (error) {
    console.error('Error fetching project members:', error);
  }
}

// Fetch existing comments for the current task
async function fetchTaskComments() {
  const taskId = taskDetailModal.dataset.taskId;
  if (!taskId) {
    console.warn('No Task ID found in modal dataset. Cannot fetch comments.');
    return;
  }

  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (res.ok) {
      const comments = await res.json();
      commentsSection.innerHTML = '';
      comments.forEach(comment => appendComment(comment));
    } else {
      console.error('Error fetching comments:', res.statusText);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
}

// Append one comment to UI
function appendComment(comment) {
  const isOwnComment = String(comment.userId) === String(currentUser?.id);
  const div = document.createElement('div');
  div.classList.add('comment', isOwnComment ? 'message-right' : 'message-left');
  div.dataset.commentId = comment.id; // Add data attribute for easy lookup

  div.innerHTML = `
    ${!isOwnComment ? `
      <img class="comment-avatar"
           src="${membersLookup[comment.userId]?.image
             ? `/api/image-proxy?imageUrl=${encodeURIComponent(membersLookup[comment.userId].image)}`
             : '/images/default-profile.png'}"
           alt="${membersLookup[comment.userId]?.displayName || ''}">
    ` : ''}
    <div class="comment-content-wrapper">
      <div class="comment-body">
        <div class="comment-text">${comment.deleted ? '<em>This comment was deleted!</em>' : comment.content}</div>
        <div class="comment-time">${new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
      </div>
      ${isOwnComment && !comment.deleted ? '<button class="delete-btn"><i class="fas fa-times"></i></button>' : ''}
    </div>
    ${isOwnComment ? `
      <img class="comment-avatar"
           src="${currentUser.image ? `/api/image-proxy?imageUrl=${encodeURIComponent(currentUser.image)}` : '/images/default-profile.png'}"
           alt="${currentUser.displayName}">
    ` : ''}
  `;

  // Delete handler
  const deleteButton = div.querySelector('.delete-btn');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      if (confirm('Delete this comment?')) {
        await deleteComment(comment.id); // Pass comment ID to the function
      }
    });
  }

  commentsSection.appendChild(div);

  console.log('--- APPEND COMMENT DEBUG ---');
  console.log('currentUser:', currentUser);
  console.log('comment:', comment);
  console.log('typeof currentUser.id:', typeof currentUser.id, 'typeof comment.userId:', typeof comment.userId);
  console.log('currentUser.id == comment.userId:', currentUser.id == comment.userId);
  console.log('String(currentUser.id) === String(comment.userId):', String(currentUser.id) === String(comment.userId));
  console.log('isOwnComment:', isOwnComment);
}

// POST new comment
addCommentButton.addEventListener('click', async () => {
  const text = newCommentInput.value.trim();
  if (!text) return;

  const taskId = taskDetailModal.dataset.taskId;
  if (!taskId) {
    console.error('Task ID not found for adding comment.');
    return;
  }

  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text })
    });

    if (res.ok) {
      newCommentInput.value = '';
      await fetchTaskComments(); // reload all comments
    } else {
      console.error('Error posting comment:', res.statusText);
    }
  } catch (error) {
    console.error('Error posting comment:', error);
  }
});

// DELETE comment
async function deleteComment(commentId) {
  try {
    const res = await fetch(`/api/tasks/comments/${commentId}/delete`, { method: 'DELETE' });
    if (res.ok) {
      // Find the comment element in the DOM and update its content
      const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentElement) {
        const commentTextElement = commentElement.querySelector('.comment-text');
        if (commentTextElement) {
          commentTextElement.innerHTML = '<em>This comment was deleted 🚫</em>';
        }
        const deleteButton = commentElement.querySelector('.delete-btn');
        if (deleteButton) {
          deleteButton.remove(); // Remove the delete button
        }
      }
      alert('Comment was deleted successfully!'); // Alert user
    } else {
      console.error('Error deleting comment:', res.statusText);
      alert('Failed to delete comment.');
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('An error occurred while deleting the comment.');
  }
}

// Fetch and display comments when task modal is opened
document.addEventListener('openTaskModal', async (e) => {
  console.log('openTaskModal event triggered in comments.js');
  const taskId = e.detail.taskId;
  const projectId = e.detail.projectId;
  taskDetailModal.dataset.taskId = taskId;
  await fetchProjectMembers(projectId); // Populate members lookup
  await fetchTaskComments();
});

// Listen for the custom event dispatched when user info is updated in localStorage
document.addEventListener('currentUserUpdated', () => {
  console.log('currentUserUpdated event received in comments.js');
  // Re-initialize currentUser from localStorage
  currentUser = {
    id: localStorage.getItem('userId'),
    image: localStorage.getItem('userImage'),
    displayName: localStorage.getItem('userDisplayName'),
  };
  // Re-fetch and display comments to apply correct ownership styling
  fetchTaskComments();
});