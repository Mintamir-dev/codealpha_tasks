import { request } from './client';

export const api = {
  // auth
  register: (body) => request('POST', '/auth/register', { body }),
  login: (email, password) => request('POST', '/auth/login', { body: { email, password } }),
  logout: () => request('POST', '/auth/logout'),
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { body: { email } }),
  resetPassword: (token, password) => request('POST', '/auth/reset-password', { body: { token, password } }),

  // users
  me: () => request('GET', '/users/me'),
  updateMe: (body) => request('PATCH', '/users/me', { body }),
  changePassword: (currentPassword, newPassword) =>
    request('PUT', '/users/me/password', { body: { currentPassword, newPassword } }),
  deleteMe: (password) => request('DELETE', '/users/me', { body: { password } }),
  adminUsers: () => request('GET', '/admin/users'),
  adminProjects: () => request('GET', '/admin/projects'),

  // projects
  listProjects: (query) => request('GET', '/projects', { query }),
  createProject: (body) => request('POST', '/projects', { body }),
  getProject: (id) => request('GET', `/projects/${id}`),
  updateProject: (id, body) => request('PATCH', `/projects/${id}`, { body }),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),
  addMember: (id, email) => request('POST', `/projects/${id}/members`, { body: { email } }),
  removeMember: (id, userId) => request('DELETE', `/projects/${id}/members/${userId}`),
  dashboard: (id) => request('GET', `/projects/${id}/dashboard`),
  activity: (id) => request('GET', `/projects/${id}/activity`),

  // tasks
  listTasks: (projectId, query) => request('GET', `/projects/${projectId}/tasks`, { query }),
  createTask: (projectId, body) => request('POST', `/projects/${projectId}/tasks`, { body }),
  getTask: (id) => request('GET', `/tasks/${id}`),
  updateTask: (id, body) => request('PATCH', `/tasks/${id}`, { body }),
  changeTaskStatus: (id, body) => request('PATCH', `/tasks/${id}/status`, { body }),
  deleteTask: (id) => request('DELETE', `/tasks/${id}`),

  // comments
  listComments: (taskId) => request('GET', `/tasks/${taskId}/comments`),
  addComment: (taskId, text) => request('POST', `/tasks/${taskId}/comments`, { body: { text } }),
  editComment: (taskId, commentId, text) => request('PATCH', `/tasks/${taskId}/comments/${commentId}`, { body: { text } }),
  deleteComment: (taskId, commentId) => request('DELETE', `/tasks/${taskId}/comments/${commentId}`),

  // notifications
  listNotifications: (query) => request('GET', '/notifications', { query }),
  unreadCount: () => request('GET', '/notifications/unread-count'),
  markRead: (id) => request('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request('PATCH', '/notifications/read-all'),
};
