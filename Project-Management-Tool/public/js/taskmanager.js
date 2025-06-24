
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');

  // Correctly select the task-list div within each column using data-status
  const columns = {
    'To Do': document.querySelector('.column[data-status="To Do"] .task-list'),
    'In Progress': document.querySelector('.column[data-status="In Progress"] .task-list'),
    'Completed': document.querySelector('.column[data-status="Completed"] .task-list')
  };
  // Add a check to ensure columns are found before proceeding
  if (!columns['To Do'] || !columns['In Progress'] || !columns['Completed']) {
      console.error('One or more task columns (To Do, In Progress, Completed) not found in the DOM. Please ensure elements with data-status="To Do", "In Progress", and "Completed" and a nested .task-list div exist.');
      // Optionally, you might want to display a user-friendly message or disable functionality here
      return; // Exit the function if columns are not found
  }

  async function loadTasks() {
    if (!projectId) {
      console.warn('No projectId found in URL. Cannot load tasks.');
      return;
    }
    try {
      const res = await fetch(`/api/tasks/project/${projectId}`); // Corrected line
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const tasks = await res.json();
  
      // Clear existing tasks in all columns
      Object.values(columns).forEach(col => {
          if (col) col.innerHTML = ''; // Ensure col is not null before setting innerHTML
      });
  
      tasks.forEach(task => {
        renderTask(task);
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  function renderTask(task) {
    console.log('Task object in renderTask:', task);
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true; // Make the card draggable
    card.dataset.id = task.id; // Store the task ID
    card.innerHTML = `
      <strong>${task.title}</strong>
      <span class="delete-icon" onclick="deleteTask('${task.id}')">&#x2715;</span>
      <div class="assigned-members-row"></div> <!-- Container for assigned members -->
    `;
    columns[task.status].appendChild(card);
  
    // Add drag start listener to the card
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id); // Set the task ID as data
      card.classList.add('dragging'); // Add a class for styling while dragging
    });
  
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging'); // Remove the dragging class
    });
    card.addEventListener('click', async () => {
      const latestTask = await loadTaskDetails(task.id);
      if (latestTask) {
        openTaskModal(latestTask);
      } else {
        console.error('Failed to load latest task details for task ID:', task.id);
      }
    });
  
    // Render assigned members on the task card
    const assignedMembersContainer = card.querySelector('.assigned-members-row');
    if (task.assignedTo && Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach(user => {
        const img = document.createElement('img');
        img.src = user.image
          ? `/api/image-proxy?imageUrl=${encodeURIComponent(user.image)}`
          : '/images/default-profile.png';
        img.alt = user.displayName || '';
        img.classList.add('assigned-member-icon');
        assignedMembersContainer.appendChild(img);
      });
    }
    const deleteIcon = card.querySelector('.delete-icon');
    deleteIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to card click
    });
  }
  window.deleteTask = async (id) => {
    if (!confirm('Are you sure you want to delete this task? You and your team members will lose all data permanently associated with this task.')) {
      return; // User cancelled the deletion
    }
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };
  // Add Task inline input (like Trello, only title)
  document.querySelectorAll('.add-task-btn').forEach(button => {
    button.addEventListener('click', () => {
      const column = button.closest('.column');
      const status = column.dataset.status;
      // Prevent multiple input boxes
      if (column.querySelector('.task-input-box')) return;
      const inputBox = document.createElement('div');
      inputBox.classList.add('task-input-box');
      inputBox.innerHTML = `
        <input type="text" class="task-title-input" placeholder="Enter task title" />
        <div class="task-input-actions">
          <button class="cancel-task-btn">X</button>
        </div>
      `;
      // Append input box to the task-list within the column
      column.querySelector('.task-list').appendChild(inputBox);
      const taskTitleInput = inputBox.querySelector('.task-title-input');
      const cancelBtn = inputBox.querySelector('.cancel-task-btn');
      taskTitleInput.focus();
      const saveTask = async () => {
        const title = taskTitleInput.value.trim();
        if (!title) {
          inputBox.remove(); // No task entered, discard
          return;
        }
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description: '', status, projectId })
        });
        const task = await res.json();
        inputBox.remove(); // Clean input box
        renderTask(task);  // Render task card
      };
      // Save on Enter
      taskTitleInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') saveTask();
      });
      // Save on blur (clicking outside)
      taskTitleInput.addEventListener('blur', () => {
        saveTask();
      });
      // Cancel task
      cancelBtn.addEventListener('click', () => {
        inputBox.remove();
      });
    });
  });
  // Add drag and drop event listeners to columns
  document.querySelectorAll('.column').forEach(column => { // Changed from Object.values(columns).forEach(col => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault(); // Allow drop
      column.classList.add('drag-over'); // Add a class for visual feedback
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over'); // Remove the class when dragging leaves
    });

    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const draggedCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
      if (!draggedCard) return;

      const newStatus = column.dataset.status;
      const taskList = column.querySelector('.task-list');

      // Determine the drop position within the column
      const afterElement = getDragAfterElement(taskList, e.clientY);
      if (afterElement == null) {
        taskList.appendChild(draggedCard);
      } else {
        taskList.insertBefore(draggedCard, afterElement);
      }
      // Update task status if column changed (already handled by previous logic)
      // No need to explicitly update status if it's the same column, but the backend call handles it.
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    });
  });
  // Helper function to get the element after which the dragged element should be inserted
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: -Infinity }).element;
  }
// 🔵 Add Members Modal Functionality
  const addMembersModal = document.getElementById('addMembersModal');
  const closeModalBtn = addMembersModal.querySelector('.close-button');
  const memberSearchInput = document.getElementById('memberSearchInput');
  const searchResultsList = document.getElementById('searchResultsList');
  const selectedMembersList = document.getElementById('selectedMembersList');
  const confirmAddMembersBtn = document.getElementById('confirmAddMembersBtn');
  
  let selectedMembers = new Set(); // to avoid duplicates
  
  // Open modal
  window.openAddMembersModal = function () {
    addMembersModal.classList.remove('hidden');
    memberSearchInput.value = '';
    searchResultsList.innerHTML = '';
    selectedMembersList.innerHTML = '';
    selectedMembers.clear();
  };
  
  // Close modal
  closeModalBtn.onclick = () => {
    addMembersModal.classList.add('hidden');
  };
  
  // Search input event
  memberSearchInput.addEventListener('input', async () => {
    const query = memberSearchInput.value.trim();
    if (!query) {
      searchResultsList.innerHTML = '';
      return;
    }

    try {
      const res = await fetch(`/api/projects/users/search?query=${encodeURIComponent(query)}`);
      const users = await res.json();

      searchResultsList.innerHTML = ''; // Clear previous results
      users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'search-user-item';
        li.dataset.userId = user.id;
        li.dataset.displayName = user.displayName; // Change from user.email to user.displayName
        li.textContent = user.displayName; // Change from user.email to user.displayName
        // IMPORTANT: Attach the event listener here, not in the innerHTML string
        li.addEventListener('click', () => window.selectMember(user.id, user.displayName, li)); // Change from user.email to user.displayName
        searchResultsList.appendChild(li);
      });
    } catch (err) {
      searchResultsList.innerHTML = '<li style="color:red;">Error searching users</li>';
    }
  });
  
  // Select member
  window.selectMember = function (userId, displayName, element) { // Change email to displayName
    console.log(`selectMember called with userId: ${userId}, displayName: ${displayName}`); // Change email to displayName
    if (selectedMembers.has(userId)) return;
  
    selectedMembers.add({ userId: userId, displayName: displayName }); // Store both userId and displayName
  
    const li = document.createElement('li');
    li.textContent = displayName; // Change email to displayName
    li.dataset.userId = userId;
    selectedMembersList.appendChild(li);
  
    element.innerHTML += ' ✅';
    element.style.pointerEvents = 'none';
  };
  
  // Confirm adding members
  confirmAddMembersBtn.addEventListener('click', async () => {
    console.log('Confirm Add Members button clicked!');
    const projectId = new URLSearchParams(window.location.search).get('projectId');
    console.log('Project ID:', projectId);
    console.log('Selected Members:', selectedMembers);

    if (selectedMembers.size === 0) {
      alert('Please select at least one member to add.');
      return;
    }

    for (let member of selectedMembers) { // Iterate over objects
      try {
        console.log(`Attempting to add member: ${member.displayName} to project ${projectId}`); // Change member.email to member.displayName
        const response = await fetch(`/api/projects/${projectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: member.displayName }) // Send the displayName
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }
        console.log(`Successfully added member: ${member.displayName}`); // Change member.email to member.displayName
      } catch (err) {
        console.error(`Failed to add user ${member.displayName}:`, err); // Change member.email to member.displayName
        alert(`Failed to add user ${member.displayName}: ${err.message}`); // Change member.email to member.displayName
      }
    }

    alert('Members added!');
    addMembersModal.classList.add('hidden');
    // Optionally, reload tasks or update UI to reflect new members
    // loadTasks(); // If you want to refresh the task list after adding members
  });
  // Task Detail Modal Functions
  const modal = document.getElementById("taskDetailModal");
  const closeButton = document.querySelector(".close-button");
  const descriptionField = document.getElementById("taskDescription");
  const commentBox = document.getElementById("newComment");
  const commentList = document.getElementById("commentsSection");
  const addCommentBtn = document.getElementById("addCommentBtn");
  const addDeadlineBtn = document.getElementById('addDeadlineBtn');
  const taskDeadlineInput = document.getElementById('taskDeadlineInput');
  const taskAttachmentsInput = document.getElementById('taskAttachments'); // New: Get the file input
  const attachmentsList = document.getElementById('attachmentsList');     // New: Get the attachments list container
  const descriptionWordCount = document.getElementById('descriptionWordCount'); // New: Get the word count display

  // Event listener for when the date input value changes
  taskDeadlineInput.addEventListener('change', async (event) => {
    const taskId = taskDetailModal.dataset.taskId; // Get the current task ID
    const newDeadline = event.target.value; // Get the new deadline value
  
    if (taskId && newDeadline) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ deadline: newDeadline })
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const result = await response.json();
        console.log('Task deadline updated successfully:', result);
        // Optionally, provide user feedback that the deadline was saved
      } catch (error) {
        console.error('Error updating task deadline:', error);
        // Optionally, provide user feedback about the error
      }
    }
  });

  // Function to fetch project details and set deadline constraints
  async function setTaskDeadlineConstraints(projectId) {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const project = await res.json();
      if (project.deadline) {
        // Set the max date for the task deadline to the project's deadline
        taskDeadlineInput.setAttribute('max', project.deadline.split('T')[0]);
      }
      // Optionally, set a min date if tasks cannot be set before project start or current date
      taskDeadlineInput.setAttribute('min', new Date().toISOString().split('T')[0]);

    } catch (error) {
      console.error('Failed to fetch project deadline:', error);
    }
  }

  let currentTaskDetail; // Declare currentTaskDetail in a scope accessible to relevant functions

  function openTaskModal(task) {
    currentTaskDetail = task; // Assign the task object to currentTaskDetail
    modal.classList.remove("hidden");
    taskDetailModal.dataset.taskId = task.id;
    
    // Dispatch custom event with taskId and projectId
    const event = new CustomEvent('openTaskModal', {
        detail: {
            taskId: task.id,
            projectId: projectId
        }
    });
    document.dispatchEvent(event); // Add this line to set the task ID
    document.querySelector("#modalTaskTitle").textContent = task.title;
    descriptionField.value = task.description || "";

    // New: Word limit for description
    const maxWords = 200;
    function updateWordCount() {
        const words = descriptionField.value.trim().split(/\s+/).filter(Boolean);
        const currentWords = words.length;
        descriptionWordCount.textContent = `${currentWords}/${maxWords} words`;
        if (currentWords > maxWords) {
            descriptionWordCount.style.color = 'red';
        } else {
            descriptionWordCount.style.color = '';
        }
    }

    descriptionField.removeEventListener('input', updateWordCount); // Remove previous listener to prevent duplicates
    descriptionField.addEventListener('input', updateWordCount);
    updateWordCount(); // Initial count

    // New: Save description on blur
    descriptionField.removeEventListener('blur', saveDescription); // Remove previous listener
    descriptionField.addEventListener('blur', saveDescription);

    // Handle task deadline input
    if (task.deadline) {
      taskDeadlineInput.value = task.deadline.split('T')[0]; // Assuming deadline is in ISO format
      taskDeadlineInput.style.display = 'block'; // Show the input if a deadline exists
    } else {
      taskDeadlineInput.value = ''; // Clear previous value
      taskDeadlineInput.style.display = 'none'; // Hide if no deadline
    }

    // Set deadline constraints when opening the modal
    if (projectId) {
      setTaskDeadlineConstraints(projectId);
    }
    // New: Display attachments
    attachmentsList.innerHTML = ""; // Clear previous attachments
    if (task.attachments && task.attachments.length > 0) {
        const attachmentsContainer = document.createElement("div");
        attachmentsContainer.classList.add("attachments-container");

        task.attachments.forEach(attachmentPath => {
            const attachmentName = attachmentPath.split('/').pop(); // Extract filename
            const attachmentItem = document.createElement("div");
            attachmentItem.classList.add("attachment-item");
            attachmentItem.innerHTML = `
                <a href="${attachmentPath}" target="_blank" class="attachment-link">${attachmentName}</a>
                <span class="delete-attachment-icon" data-attachment-path="${attachmentPath}" data-task-id="${task.id}">&#x2715;</span>
            `;
            attachmentsContainer.appendChild(attachmentItem);
        });
        attachmentsList.appendChild(attachmentsContainer);

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-attachment-icon').forEach(icon => {
            icon.addEventListener('click', async (event) => {
                const attachmentPathToDelete = event.target.dataset.attachmentPath;
                const taskId = event.target.dataset.taskId;
                if (confirm('Are you sure you want to delete this attachment?')) {
                    await deleteAttachment(taskId, attachmentPathToDelete);
                }
            });
        });
    }

    // New: Display assigned members in the modal
    renderAssignedMembersInModal(task);

    // Update the openTaskModal to include the Assign Task button functionality
    const assignTaskButtonIcon = document.querySelector('#taskDetailModal button i.fa-user-plus');
    if (assignTaskButtonIcon) {
      const assignTaskButton = assignTaskButtonIcon.closest('button');
      assignTaskButton?.addEventListener('click', () => {
        if (currentTaskDetail) {
          openAssignMembersToTaskModal(currentTaskDetail.id);
        }
      });
    } else {
      console.warn('Assign Task button not found');
    }
  }

  closeButton.addEventListener("click", () => {
    modal.classList.add("hidden");
    saveDescription(); // Call saveDescription without awaiting it
  });

  // New: Function to save description
  async function saveDescription() {
    const taskId = taskDetailModal.dataset.taskId;
    const newDescription = descriptionField.value.trim();
    const words = newDescription.split(/\s+/).filter(Boolean);
    const maxWords = 200; // Define maxWords here as well for saveDescription

    if (words.length > maxWords) {
        alert(`Description exceeds the word limit of ${maxWords} words. Please shorten it.`);
        return; // Prevent saving if word limit is exceeded
    }

    if (taskId) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ description: newDescription })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Task description updated successfully!');
      } catch (error) {
        console.error('Error updating task description:', error);
      }
    }
  }

  // New: Function to delete an attachment
  async function deleteAttachment(taskId, attachmentPath) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentPath })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Reload the task to update the attachments list in the modal
      const updatedTaskRes = await fetch(`/api/tasks/${taskId}`);
      if (!updatedTaskRes.ok) {
        throw new Error(`HTTP error! status: ${updatedTaskRes.status}`);
      }
      const updatedTask = await updatedTaskRes.json();
      openTaskModal(updatedTask); // Re-open modal with updated task data

      alert('Attachment deleted successfully!');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment: ' + error.message);
    }
  }

  addCommentBtn.addEventListener("click", () => {
    const comment = commentBox.value.trim();
    if (comment) {
      const div = document.createElement("div");
      div.textContent = comment;
      div.style.marginBottom = "6px";
      commentList.appendChild(div);
      commentBox.value = "";
    }
  });

  // Event listener for the new Add Deadlines button
  addDeadlineBtn.addEventListener('click', () => {
    if (taskDeadlineInput.style.display === 'none') {
      taskDeadlineInput.style.display = 'block';
    } else {
      taskDeadlineInput.style.display = 'none';
      taskDeadlineInput.value = ''; // Clear the date if hidden
    }
  });

  // New: Event listener for file input change
  taskAttachmentsInput.addEventListener('change', async (event) => {
    const taskId = taskDetailModal.dataset.taskId;
    const files = event.target.files;

    if (taskId && files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('attachment', files[i]);
      }

      try {
        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Attachment uploaded successfully:', result);
        // Refresh attachments list in modal
        // You might need to re-fetch the task or update the task object directly
        // For now, let's just re-open the modal with updated task data (requires fetching task again)
        const updatedTaskRes = await fetch(`/api/tasks/${taskId}`); // Use the new getTaskById endpoint
        if (updatedTaskRes.ok) {
          const updatedTask = await updatedTaskRes.json();
          openTaskModal(updatedTask);
        } else {
          console.error('Failed to fetch updated task:', updatedTaskRes.statusText);
        }
      } catch (error) {
        console.error('Error uploading attachment:', error);
        // Optionally, provide user feedback about the error
      }
    }
  });

  // Full dropdown replacement
  const viewTasksDropdownBtn = document.getElementById('viewTasksDropdownBtn');
  const allTasksDropdown = document.getElementById('allTasksDropdown');

  
  // Toggle the dropdown visibility
  viewTasksDropdownBtn.addEventListener('click', function () {
    allTasksDropdown.classList.toggle('show');
    if (allTasksDropdown.classList.contains('show')) {
        fetchAndDisplayAllTasks(); // Load tasks when dropdown is shown
    }
  });
  
  // Close dropdown when clicking outside
  window.addEventListener('click', function (event) {
      if (!event.target.matches('.dropbtn') && !event.target.closest('.dropdown-content')) {
          if (allTasksDropdown.classList.contains('show')) {
              allTasksDropdown.classList.remove('show');
          }
      }
  });
  
  // Fetch and display tasks for the current project
  async function fetchAndDisplayAllTasks() {
    try {
        if (!projectId) {
            allTasksDropdown.innerHTML = '<a href="#">Error: No project found.</a>';
            return;
        }
  
        const response = await fetch(`/api/tasks/project/${projectId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
        let tasks = await response.json();
  
        // Sort by deadline: tasks without deadline appear last
        tasks.sort((a, b) => {
            const dateA = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
            const dateB = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
            return dateA - dateB;
        });
  
        // Clear existing dropdown items
        allTasksDropdown.innerHTML = '';
  
        if (tasks.length === 0) {
            allTasksDropdown.innerHTML = '<a href="#">No tasks found.</a>';
            return;
        }
  
        // Add task items
        tasks.forEach(task => {
            const taskLink = document.createElement('a');
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';
            const status = task.status || 'To Do';
  
            taskLink.classList.add('task-dropdown-item');
            taskLink.innerHTML = `
                <strong>${task.title}</strong><br>
                <small style="color: #90e0ef">Status: ${status}</small><br>
                <small>Deadline: ${deadline}</small>
            `;
  
            taskLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Optional: open popup or modal with task details
                console.log('Clicked task:', task);
            });
  
            allTasksDropdown.appendChild(taskLink);
        });
  
    } catch (error) {
        console.error('Error loading tasks:', error);
        allTasksDropdown.innerHTML = '<a href="#">Error loading tasks.</a>';
    }
  }
  

  // 🔵 View Members Modal Functionality
  const viewMembersBtn = document.getElementById('viewMembersBtn');
  const viewMembersModal = document.querySelector('.view-members-modal');
  const viewMembersCloseBtn = viewMembersModal ? viewMembersModal.querySelector('.close-button') : null;
  const projectMembersList = document.getElementById('projectMembersList');
  
  // Function to fetch and display project members
  async function fetchProjectMembers() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
  
    if (!projectId) {
      console.warn('No projectId found in URL. Cannot load project members.');
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const members = await res.json();
      console.log('Fetched members:', members); // Keep this for debugging if needed
      projectMembersList.innerHTML = ''; // Clear existing members
      if (members.length === 0) {
        projectMembersList.innerHTML = '<li>No members found for this project.</li>';
      } else {
        members.forEach(member => {
          const li = document.createElement('li');
          
          // Create an image element for the member's profile picture
          const img = document.createElement('img');
          // Use the image proxy for Google profile images, otherwise use the direct URL or default
          img.src = member.image && member.image.startsWith('https://lh3.googleusercontent.com/')
            ? `/api/image-proxy?imageUrl=${encodeURIComponent(member.image)}`
            : member.image || '/images/default-profile.png';
          img.alt = member.displayName;
          img.classList.add('member-profile-pic'); // Add a class for styling
          
          // Create a span for the display name
          const span = document.createElement('span');
          span.textContent = member.displayName;

          li.appendChild(img);
          li.appendChild(span);
          projectMembersList.appendChild(li);
        });
      }
    } catch (error) {
      console.error('Failed to load project members:', error);
      projectMembersList.innerHTML = '<li style="color:red;">Error loading members.</li>';
    }
  }
  
  // Open View Members modal
  if (viewMembersBtn) {
    viewMembersBtn.addEventListener('click', () => {
      if (viewMembersModal) {
        viewMembersModal.classList.remove('hidden');
        fetchProjectMembers(); // Fetch members when modal opens
      }
    });
  }
  
  // Close View Members modal
  if (viewMembersCloseBtn) {
    viewMembersCloseBtn.addEventListener('click', () => {
      if (viewMembersModal) {
        viewMembersModal.classList.add('hidden');
      }
    });
  }
  
  // Close modal if clicked outside (optional, but good UX)
  if (viewMembersModal) {
    viewMembersModal.addEventListener('click', (e) => {
      if (e.target === viewMembersModal) {
        viewMembersModal.classList.add('hidden');
      }
    });
  }
// ==================== ASSIGN MEMBERS TO TASK MODAL ====================

const assignMembersToTaskModal = document.getElementById('assignMembersToTaskModal');
const closeAssignMembersToTaskModalBtn = assignMembersToTaskModal.querySelector('.close-button');
const assignMembersList = document.getElementById('assignMembersList');
const confirmAssignMembersBtn = document.getElementById('confirmAssignMembersBtn');

// State
let currentTaskIdForAssignment = null;
let selectedMembersForAssignment = new Set();
let projectMembersCache = [];

// Fetch projectId from URL
function getProjectIdFromUrl() {
  return new URLSearchParams(window.location.search).get('projectId');
}

// Fetch all project members once and cache
async function loadProjectMembers() {
  if (projectMembersCache.length) return projectMembersCache;

  const projectId = getProjectIdFromUrl();
  if (!projectId) return [];

  try {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      projectMembersCache = await res.json();
      return projectMembersCache;
    }
  } catch (error) {
    console.error('Error fetching members:', error);
  }
  return [];
}

// Fetch latest task data (including assigned members)
async function loadTaskDetails(taskId) {
  const res = await fetch(`/api/tasks/${taskId}`);
  return res.ok ? await res.json() : null;
}

// Toggle member selection
function toggleMemberSelection(memberId, memberItem) {
  if (selectedMembersForAssignment.has(memberId)) {
    selectedMembersForAssignment.delete(memberId);
    memberItem.classList.remove('selected');
  } else {
    selectedMembersForAssignment.add(memberId);
    memberItem.classList.add('selected');
  }
}

// Render profile avatars inside modal
function renderAssignedMembersInModal(task) {
  const container = document.getElementById('assignedMembersDisplay');
  if (!container) return;
  container.innerHTML = '';
  task.assignedTo?.forEach(user => {
    const img = document.createElement('img');
    img.src = user.image ? `/api/image-proxy?imageUrl=${encodeURIComponent(user.image)}` : '/images/default-profile.png';
    img.alt = user.displayName || user.firstName || '';
    img.classList.add('assigned-member-icon');
    container.appendChild(img);
  });
}

// Render profile avatars on task card
function renderAssignedMembersOnCard(taskId, assignedUsers) {
  const cardContainer = document.querySelector(`.task-card[data-id="${taskId}"] .assigned-members-row`);
  if (!cardContainer) return;
  cardContainer.innerHTML = '';
  assignedUsers.forEach(user => {
    const img = document.createElement('img');
    img.src = user.image ? `/api/image-proxy?imageUrl=${encodeURIComponent(user.image)}` : '/images/default-profile.png';
    img.alt = user.displayName || '';
    img.classList.add('assigned-member-icon');
    cardContainer.appendChild(img);
  });
}

// Show the modal
async function openAssignMembersToTaskModal(taskId) {
  currentTaskIdForAssignment = taskId;
  selectedMembersForAssignment.clear();

  const task = await loadTaskDetails(taskId);
  if (!task) return;

  // Set current selection
  task.assignedTo?.forEach(user => selectedMembersForAssignment.add(user.id));
  renderAssignedMembersInModal(task); // show existing avatars in the top section of modal

  assignMembersList.innerHTML = '';
  const members = await loadProjectMembers();

  members.forEach(member => {
    const div = document.createElement('div');
    div.classList.add('member-item');
    div.dataset.memberId = member.id;
    div.innerHTML = `
      <img src="${member.image ? `/api/image-proxy?imageUrl=${encodeURIComponent(member.image)}` : '/images/default-profile.png'}" class="profile-pic">
      <span>${member.displayName || member.firstName}</span>
    `;
    if (selectedMembersForAssignment.has(member.id)) div.classList.add('selected');
    div.addEventListener('click', () => toggleMemberSelection(member.id, div));
    assignMembersList.appendChild(div);
  });

  assignMembersToTaskModal.classList.remove('hidden');
}

// Close the modal
closeAssignMembersToTaskModalBtn.addEventListener('click', () => {
  assignMembersToTaskModal.classList.add('hidden');
  currentTaskIdForAssignment = null;
});
window.addEventListener('click', e => {
  if (e.target === assignMembersToTaskModal) closeAssignMembersToTaskModalBtn.click();
});

// Confirm and submit selection
confirmAssignMembersBtn.addEventListener('click', async () => {
  if (!currentTaskIdForAssignment) return;

  const payload = { assignedMembers: Array.from(selectedMembersForAssignment) };
  const res = await fetch(`/api/tasks/${currentTaskIdForAssignment}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert('Error assigning members.');
    return;
  }

  const updatedTask = await loadTaskDetails(currentTaskIdForAssignment);

  // Update currentTaskDetail with the latest data
  currentTaskDetail = updatedTask;

  // Sync UI immediately
  renderAssignedMembersInModal(updatedTask);
  renderAssignedMembersOnCard(currentTaskIdForAssignment, updatedTask.assignedTo);
  assignMembersToTaskModal.classList.add('hidden');
});

// Attach to assign task button (using delegation if multiple tasks)
document.body.addEventListener('click', e => {
  if (e.target.closest('.assign-task-btn')) {
    const taskId = e.target.closest('[data-task-id]').dataset.taskId;
    openAssignMembersToTaskModal(taskId);
  }
});

loadTasks();
});


