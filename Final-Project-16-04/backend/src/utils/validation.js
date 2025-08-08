// Validation utilities for CloudSync

const validateRegistration = (data) => {
  const { username, email, password } = data;
  const errors = {};

  // Username validation
  if (!username) {
    errors.username = "Username is required";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters long";
  } else if (username.length > 30) {
    errors.username = "Username must be less than 30 characters";
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username = "Username can only contain letters, numbers, and underscores";
  }

  // Email validation
  if (!email) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }
  }

  // Password validation
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
  } else if (password.length > 128) {
    errors.password = "Password must be less than 128 characters";
  } else if (!/(?=.*[a-z])/.test(password)) {
    errors.password = "Password must contain at least one lowercase letter";
  } else if (!/(?=.*[A-Z])/.test(password)) {
    errors.password = "Password must contain at least one uppercase letter";
  } else if (!/(?=.*\d)/.test(password)) {
    errors.password = "Password must contain at least one number";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateLogin = (data) => {
  const { email, password } = data;
  const errors = {};

  // Email validation
  if (!email) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }
  }

  // Password validation
  if (!password) {
    errors.password = "Password is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateFileUpload = (file) => {
  const errors = {};

  if (!file) {
    errors.file = "File is required";
    return { isValid: false, errors };
  }

  // File size validation (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errors.file = "File size must be less than 50MB";
  }

  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv', 'application/json', 'application/xml',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-rar-compressed'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.file = "File type not allowed";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateTeamCreation = (data) => {
  const { name, description, visibility } = data;
  const errors = {};

  // Name validation
  if (!name) {
    errors.name = "Team name is required";
  } else if (name.length < 2) {
    errors.name = "Team name must be at least 2 characters long";
  } else if (name.length > 100) {
    errors.name = "Team name must be less than 100 characters";
  }

  // Description validation
  if (description && description.length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  // Visibility validation
  if (visibility && !['public', 'private'].includes(visibility)) {
    errors.visibility = "Visibility must be either 'public' or 'private'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateProjectCreation = (data) => {
  const { name, description, dueDate, teamId } = data;
  const errors = {};

  // Name validation
  if (!name) {
    errors.name = "Project name is required";
  } else if (name.length < 2) {
    errors.name = "Project name must be at least 2 characters long";
  } else if (name.length > 100) {
    errors.name = "Project name must be less than 100 characters";
  }

  // Description validation
  if (description && description.length > 1000) {
    errors.description = "Description must be less than 1000 characters";
  }

  // Due date validation
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.dueDate = "Invalid due date format";
    } else if (dueDateObj < new Date()) {
      errors.dueDate = "Due date cannot be in the past";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateTaskCreation = (data) => {
  const { title, description, dueDate, priority, status } = data;
  const errors = {};

  // Title validation
  if (!title) {
    errors.title = "Task title is required";
  } else if (title.length < 2) {
    errors.title = "Task title must be at least 2 characters long";
  } else if (title.length > 200) {
    errors.title = "Task title must be less than 200 characters";
  }

  // Description validation
  if (description && description.length > 1000) {
    errors.description = "Description must be less than 1000 characters";
  }

  // Due date validation
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.dueDate = "Invalid due date format";
    }
  }

  // Priority validation
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    errors.priority = "Priority must be one of: low, medium, high, urgent";
  }

  // Status validation
  if (status && !['todo', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    errors.status = "Status must be one of: todo, in-progress, completed, cancelled";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  const withoutHtml = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  const sanitized = withoutHtml.replace(/[<>\"'&]/g, '');
  
  return sanitized.trim();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateFileUpload,
  validateTeamCreation,
  validateProjectCreation,
  validateTaskCreation,
  validateEmail,
  sanitizeInput
}; 