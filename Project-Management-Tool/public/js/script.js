
document.addEventListener('DOMContentLoaded', () => {
  // Fetch and store current user details in localStorage
  async function fetchAndSetCurrentUser() {
    try {
      const response = await fetch('/auth/current_user');
      if (response.ok) {
        const user = await response.json();
        if (user.id) {
          localStorage.setItem('userId', user.id);
          localStorage.setItem('userImage', user.image);
          localStorage.setItem('userDisplayName', user.displayName);
          console.log('Current user info set in localStorage:', user);

          // Dispatch a custom event to notify other parts of the application
          const event = new Event('currentUserUpdated');
          document.dispatchEvent(event);
        } else {
          console.log('User not logged in or user ID not available.');
          // Clear localStorage if user is not logged in
          localStorage.removeItem('userId');
          localStorage.removeItem('userImage');
          localStorage.removeItem('userDisplayName');
        }
      } else {
        console.error('Failed to fetch current user:', response.statusText);
        // Clear localStorage on error as well
        localStorage.removeItem('userId');
        localStorage.removeItem('userImage');
        localStorage.removeItem('userDisplayName');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Clear localStorage on network error
      localStorage.removeItem('userId');
      localStorage.removeItem('userImage');
      localStorage.removeItem('userDisplayName');
    }
  }

  fetchAndSetCurrentUser();

  const projectContainer = document.getElementById('projectContainer');
  const createProjectBtn = document.getElementById('createProjectBtn');
  const modal = document.getElementById('createProjectModal');
  const closeModalBtn = document.querySelector('.close-button');
  const projectForm = document.getElementById('projectForm');
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/auth/logout', { method: 'GET' });
        if (response.ok) {
          window.location.href = '/';
        } else {
          console.error('Logout failed:', response.statusText);
          // Removed: alert('Logout failed.');
        }
      } catch (error) {
        console.error('Error during logout:', error);
        // Removed: alert('Logout failed.');
      }
    });
  }

  if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => (modal.style.display = 'block'));
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => (modal.style.display = 'none'));
  }

  window.addEventListener('click', (event) => {
    if (event.target == modal) modal.style.display = 'none';
  });

  if (projectForm) {
    const projectDeadlineInput = document.getElementById('projectDeadline');
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const minDate = `${year}-${month}-${day}`;
    projectDeadlineInput.setAttribute('min', minDate);

    projectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = document.getElementById('projectTitle').value;
      const description = document.getElementById('projectDescription').value;
      const deadline = document.getElementById('projectDeadline').value;

      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, deadline }),
        });

        if (res.ok) {
          modal.style.display = 'none';
          projectForm.reset();
          loadProjects();
        } else {
          const errorText = await res.text();
          alert('Failed to create project: ' + errorText);
        }
      } catch (error) {
        console.error('Create project error:', error);
        alert('An error occurred while creating the project.');
      }
    });
  }

  const renderCard = (project) => {
    const card = document.createElement('div');
    card.className = 'project-card';
  
    const deadlineDate = project.deadline
      ? new Date(project.deadline).toLocaleDateString()
      : 'No deadline';
  
    const deadlineInputValue = project.deadline
      ? new Date(project.deadline).toISOString().split('T')[0]
      : '';
  
    // Get current date in YYYY-MM-DD format for the min attribute
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const minDate = `${year}-${month}-${day}`;
  
    card.innerHTML = `
      <div class="project-title-wrapper">
        <h3 class="editable" data-field="title" data-id="${project.id}">${project.title}</h3>
      </div>
      <p class="project-description editable" data-field="description" data-id="${project.id}">${project.description}</p>
      <hr class="project-divider">
      <div class="project-footer">
        <div class="deadline-input-container">
          <label for="deadline-${project.id}">Deadline:</label>
          <input type="date" class="project-deadline-input" id="deadline-${project.id}" data-field="deadline" data-id="${project.id}" value="${deadlineInputValue}" min="${minDate}">
        </div>
        <span class="delete-icon" data-id="${project.id}" title="Delete">&#x1F5D1;</span>
      </div>
    `;
  
    const titleElement = card.querySelector('h3');
    const descriptionElement = card.querySelector('p');
    const deadlineInputElement = card.querySelector('.project-deadline-input');
    const deleteIcon = card.querySelector('.delete-icon');
  
    const makeEditable = (element) => {
      if (element.type !== 'date') {
        element.contentEditable = true;
        element.classList.add('editing');
      }
      element.focus();
    };

    const saveChanges = async (element, field, newValue) => {
      if (element.contentEditable === 'true') {
        element.contentEditable = false;
        element.classList.remove('editing');
      }
      const projectId = element.dataset.id;

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: newValue }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          alert('Update failed: ' + errorText);
          loadProjects(); // Reload to revert to original value on error
        } else if (field === 'deadline') {
          // Update the displayed date if needed, though input type=date handles display
        }
      } catch (error) {
        console.error('Update error:', error);
        alert('An error occurred while saving.');
        loadProjects(); // Reload to revert to original value on error
      }
    };

    titleElement.addEventListener('click', (e) => {
      e.stopPropagation();
      makeEditable(e.target);
    });
    descriptionElement.addEventListener('click', (e) => {
      e.stopPropagation();
      makeEditable(e.target);
    });

    deadlineInputElement.addEventListener('change', (e) => {
      saveChanges(e.target, 'deadline', e.target.value);
    });

    titleElement.addEventListener('blur', (e) => saveChanges(e.target, 'title', e.target.textContent.trim()));
    descriptionElement.addEventListener('blur', (e) => saveChanges(e.target, 'description', e.target.textContent.trim()));

    titleElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleElement.blur();
      }
    });
    descriptionElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        descriptionElement.blur();
      }
    });

    deleteIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this project?')) {
        try {
          const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
          if (res.ok) card.remove();
          else {
            const errorText = await res.text();
            alert('Failed to delete: ' + errorText);
          }
        } catch (err) {
          console.error('Delete error:', err);
          alert('Error while deleting the project.');
        }
      }
    });

    card.addEventListener('click', (e) => {
      // Check if the clicked element is the delete icon or within the deadline input container
      const isDeleteIcon = e.target.classList.contains('delete-icon');
      const isDeadlineInput = e.target.closest('.deadline-input-container');

      if (!e.target.classList.contains('editable') && !isDeleteIcon && !isDeadlineInput) {
        window.location.href = `taskmanager.html?projectId=${project.id}`;
      }
    });

    projectContainer.appendChild(card);
  };

  const loadProjects = async () => {
    if (!projectContainer) return;
    projectContainer.innerHTML = '';

    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const projects = await res.json();
        if (projects.length === 0) {
          projectContainer.innerHTML = '<p>No projects found. Create a new one!</p>';
        } else {
          projects.forEach(renderCard);
        }
      } else {
        const errorText = await res.text();
        projectContainer.innerHTML = `<p>Error: ${errorText}</p>`;
      }
    } catch (error) {
      projectContainer.innerHTML = `<p>Error fetching projects: ${error.message}</p>`;
    }
  };

  loadProjects();
});
