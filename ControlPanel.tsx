import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { CustomButton, ConfirmationModal, CheckCircleIcon, InfoCircleIcon } from './App';
import type { UserRole } from './types';

export const ControlPanel: React.FC = () => {
    const { users, addUser, deleteUser, currentUser } = useAuth();
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('User');
    const [error, setError] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);

    const isAiConfigured = !!process.env.API_KEY;

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newUsername.trim() || !newPassword.trim()) {
            setError('Username and password cannot be empty.');
            return;
        }
        const result = addUser({ username: newUsername, password: newPassword, role: newRole });
        if (result.success) {
            setNewUsername('');
            setNewPassword('');
            setNewRole('User');
        } else {
            setError(result.message || 'Failed to add user.');
        }
    };
    
    const userToDelete = users.find(u => u.id === isConfirmingDelete);

    const UserAvatar = ({ username }: { username: string }) => {
        const colors = [
            'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500'
        ];
        // simple hash to get a consistent color
        const colorIndex = username.charCodeAt(0) % colors.length;
        const color = colors[colorIndex];
        
        return (
            <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-lg`}>
                {username.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <div className="space-y-8">
             {/* AI Service Configuration Section */}
             <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-800 mb-1">AI Service Configuration</h2>
                <p className="text-sm text-neutral-500 mb-4">Monitor the status of the integrated Google AI services.</p>
                <div className="pt-4 border-t border-neutral-200">
                    <div className="flex items-center gap-4">
                        <h3 className="text-md font-semibold text-neutral-700">Gemini API Status:</h3>
                        {isAiConfigured ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-5 w-5" />
                                Configured
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                                <InfoCircleIcon className="h-5 w-5" />
                                Not Configured
                            </span>
                        )}
                    </div>
                    {!isAiConfigured && (
                        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <InfoCircleIcon className="h-5 w-5 text-primary-500" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold text-primary-800">Action Required: Set API Key</h3>
                                    <div className="mt-2 text-sm text-primary-700 space-y-2">
                                        <p>The application's AI features, such as PDF document processing, are currently disabled.</p>
                                        <p>To enable them, an administrator must set the <code className="font-mono font-bold bg-primary-100 text-primary-900 px-1 py-0.5 rounded">API_KEY</code> environment variable on the server where this application is hosted. The value should be a valid Google AI API key.</p>
                                        <p>For security reasons, the API key cannot be entered or stored through this user interface.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Add User Section */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-800 mb-1">Add New User</h2>
                <p className="text-sm text-neutral-500 mb-4">Create new accounts with specific roles.</p>
                <form onSubmit={handleAddUser} className="space-y-4 pt-4 border-t border-neutral-200">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">Username</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                placeholder="e.g., john.doe"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">Role</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as UserRole)}
                                className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white appearance-none"
                            >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                    <div className="flex justify-end pt-2">
                        <CustomButton type="submit">Add User</CustomButton>
                    </div>
                </form>
            </section>

            {/* Manage Users Section */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
                 <h2 className="text-xl font-bold text-neutral-800 mb-1">Manage Users</h2>
                 <p className="text-sm text-neutral-500 mb-4">View and remove existing user accounts.</p>
                <div className="border border-neutral-200 rounded-lg overflow-hidden mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">User</th>
                                <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Role</th>
                                <th className="py-3 px-4 text-right font-bold text-neutral-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="py-3 px-4 font-medium text-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar username={user.username} />
                                            <span>{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-neutral-600">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'Admin' ? 'bg-primary-100 text-primary-800' : 'bg-neutral-200 text-neutral-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <CustomButton 
                                            onClick={() => setIsConfirmingDelete(user.id)} 
                                            variant="danger"
                                            disabled={user.id === currentUser?.id || user.username === 'admin'}
                                            title={user.id === currentUser?.id ? "Cannot delete yourself" : user.username === 'admin' ? "Cannot delete the primary admin" : "Delete user"}
                                        >
                                            Delete
                                        </CustomButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            
            <ConfirmationModal
                isOpen={!!isConfirmingDelete}
                onConfirm={() => {
                    if (isConfirmingDelete) {
                        deleteUser(isConfirmingDelete);
                    }
                    setIsConfirmingDelete(null);
                }}
                onCancel={() => setIsConfirmingDelete(null)}
                title="Confirm User Deletion"
                confirmButtonText="Delete User"
            >
                {userToDelete && (
                    <p>Are you sure you want to permanently delete the user <strong className="text-primary-600">{userToDelete.username}</strong>? This action cannot be undone.</p>
                )}
            </ConfirmationModal>
        </div>
    );
};