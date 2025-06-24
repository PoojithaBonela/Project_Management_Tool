const Project = require('../models/projectModel');
const User = require('../models/userModel');
const ProjectMember = require('../models/projectMemberModel');
const { Op } = require('sequelize'); // Add this line

// ✅ Create Project
exports.createProject = async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    const userId = req.user.id; // Assuming user information is available in req.user
    const project = await Project.create({ title, description, deadline, userId });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project', error });
  }
};

// ✅ Get All Projects for Logged-In User (owned + shared)
// ✅ Get All Projects for Logged-In User (owned + shared)
exports.getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    // Owned by user
    const ownedProjects = await Project.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // Shared with user
    const sharedProjects = await Project.findAll({
      include: [{
        model: User,
        as: 'Members', // ✅ Use same alias
        where: { id: userId },
        required: true,
        through: { attributes: [] }
      }],
      order: [['createdAt', 'DESC']]
    });

    // Merge and remove duplicates
    const allProjects = [
      ...ownedProjects,
      ...sharedProjects.filter(p => !ownedProjects.find(o => o.id === p.id))
    ];

    res.json(allProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch projects', error });
  }
};

// ✅ Update Project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await project.update(updates);
    res.json({ message: 'Project updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project', error });
  }
};

// ✅ Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project', error });
  }
};

// ✅ Get Project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project by ID:', error);
    res.status(500).json({ message: 'Failed to fetch project', error });
  }
};

// ✅ Add Member to Project (Updated to use displayName as "email")
exports.addMemberToProject = async (req, res) => {
  const { projectId } = req.params;
  const { displayName } = req.body; // frontend sends displayName (used like email)

  try {
    // Step 1: Find user by displayName
    const user = await User.findOne({ where: { displayName } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`User ID resolved from displayName: ${user.id}`);

    // Step 2: Add to project_members
    const [member, created] = await ProjectMember.findOrCreate({
      where: { userId: user.id, projectId },
    });

    if (!created) {
      return res.status(400).json({ message: 'User already added to project' });
    }

    res.status(200).json({ message: 'Member added successfully', member });

  } catch (error) {
    console.error('Error in addMemberToProject:', error);
    res.status(500).json({ message: 'Error adding member', error });
  }
};

// ✅ Search Users to Add as Members
exports.searchUsers = async (req, res) => {
  const { query } = req.query;

  try {
    const users = await User.findAll({
      where: {
        displayName: {
          [Op.like]: `%${query}%`
        }
      },
      attributes: ['id', 'displayName', 'image']
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Search failed', error });
  }
};

// ✅ Get Project Members
exports.getProjectMembers = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'Members',
          attributes: ['id', 'displayName', 'image'],
          through: { attributes: [] } // Exclude join table attributes
        },
        {
          model: User,
          as: 'User', // Assuming 'User' is the alias for the project owner
          attributes: ['id', 'displayName', 'image']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Combine project members and the project owner, ensuring no duplicates
    const allMembers = [...project.Members];
    if (project.User && !allMembers.some(member => member.id === project.User.id)) {
      allMembers.push(project.User);
    }

    res.json(allMembers);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ message: 'Failed to fetch project members', error });
  }
};
