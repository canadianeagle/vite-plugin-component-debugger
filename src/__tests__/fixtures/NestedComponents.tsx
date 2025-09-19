// Line 1: NestedComponents.tsx - Complex component composition
import React, { useState } from 'react';

// Line 3: Simple child component
function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="btn" onClick={onClick}>
      <span className="btn-content">{children}</span>
    </button>
  );
}

// Line 11: Form field component
function FormField({ label, type = 'text', value, onChange }: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}

// Line 29: Card component that wraps other components
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <header className="card-header">
        <h3 className="card-title">{title}</h3>
      </header>
      <main className="card-content">
        {children}
      </main>
      <footer className="card-footer">
        <div className="card-actions">
          <Button onClick={() => console.log('Edit')}>
            Edit
          </Button>
          <Button onClick={() => console.log('Delete')}>
            Delete
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Line 49: Modal component with portal-like behavior
function Modal({ isOpen, title, children, onClose }: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </header>
        <main className="modal-body">
          {children}
        </main>
        <footer className="modal-footer">
          <div className="modal-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={onClose}>Confirm</Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Line 75: Complex form component using multiple subcomponents
function UserForm({ user, onSave }: {
  user: { name: string; email: string; role: string };
  onSave: (user: any) => void;
}) {
  const [formData, setFormData] = useState(user);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card title="User Profile">
      <form className="user-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-section">
          <FormField
            label="Full Name"
            value={formData.name}
            onChange={(value) => updateField('name', value)}
          />
          <FormField
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(value) => updateField('email', value)}
          />
          <FormField
            label="Role"
            value={formData.role}
            onChange={(value) => updateField('role', value)}
          />
        </div>

        <div className="form-actions">
          <Button onClick={() => setIsModalOpen(true)}>
            Save Changes
          </Button>
          <Button onClick={() => setFormData(user)}>
            Reset
          </Button>
        </div>
      </form>

      <Modal
        isOpen={isModalOpen}
        title="Confirm Changes"
        onClose={() => setIsModalOpen(false)}
      >
        <div className="confirmation-content">
          <p className="confirmation-message">
            Are you sure you want to save these changes?
          </p>
          <ul className="changes-list">
            <li className="change-item">Name: {formData.name}</li>
            <li className="change-item">Email: {formData.email}</li>
            <li className="change-item">Role: {formData.role}</li>
          </ul>
        </div>
      </Modal>
    </Card>
  );
}

// Line 125: Component with render props pattern
function DataProvider({ render }: { render: (data: any) => React.ReactNode }) {
  const [data, setData] = useState({ loading: true, items: [] });

  return (
    <div className="data-provider">
      <div className="data-status">
        {data.loading ? (
          <div className="loading-indicator">
            <span className="loading-text">Loading...</span>
          </div>
        ) : (
          <div className="data-ready">
            {render(data)}
          </div>
        )}
      </div>
    </div>
  );
}

// Line 141: Higher-order component pattern
function withLoading<T extends {}>(Component: React.ComponentType<T>) {
  return function LoadingWrapper(props: T & { isLoading?: boolean }) {
    const { isLoading, ...componentProps } = props;

    if (isLoading) {
      return (
        <div className="loading-wrapper">
          <div className="spinner">
            <div className="spinner-circle"></div>
          </div>
          <p className="loading-message">Please wait...</p>
        </div>
      );
    }

    return (
      <div className="loaded-wrapper">
        <Component {...(componentProps as T)} />
      </div>
    );
  };
}

// Line 159: Component that uses the HOC
const LoadingUserForm = withLoading(UserForm);

// Line 161: Main application component with deep nesting
export function NestedApplication() {
  const [users, setUsers] = useState([
    { name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'User' }
  ]);
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="application">
      <header className="app-header">
        <nav className="app-navigation">
          <ul className="nav-list">
            <li className="nav-item">
              <a href="#users" className="nav-link">Users</a>
            </li>
            <li className="nav-item">
              <a href="#settings" className="nav-link">Settings</a>
            </li>
          </ul>
        </nav>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <div className="sidebar-content">
            <h2 className="sidebar-title">User Management</h2>
            <ul className="user-list">
              {users.map((user, index) => (
                <li key={index} className="user-item">
                  <button
                    className="user-button"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="user-info">
                      <span className="user-name">{user.name}</span>
                      <span className="user-role">{user.role}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="app-content">
          <div className="content-wrapper">
            <LoadingUserForm
              user={selectedUser}
              isLoading={isLoading}
              onSave={(updatedUser) => {
                setIsLoading(true);
                setTimeout(() => {
                  setUsers(prev => prev.map(u =>
                    u.email === updatedUser.email ? updatedUser : u
                  ));
                  setIsLoading(false);
                }, 1000);
              }}
            />

            <DataProvider
              render={(data) => (
                <div className="analytics-section">
                  <h3 className="analytics-title">User Analytics</h3>
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <span className="analytics-label">Total Users</span>
                      <span className="analytics-value">{users.length}</span>
                    </div>
                    <div className="analytics-card">
                      <span className="analytics-label">Active Sessions</span>
                      <span className="analytics-value">42</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">© 2024 User Management System</p>
        </div>
      </footer>
    </div>
  );
}