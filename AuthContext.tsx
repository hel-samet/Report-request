import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User, UserRole } from './types';

const AUTH_KEY = 'stationaryAppAuth'; // For current logged in user
const USERS_STORAGE_KEY = 'stationaryAppUsers';

interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    users: User[];
    login: (username: string, password: string) => boolean;
    logout: () => void;
    addUser: (user: Omit<User, 'id'>) => { success: boolean; message?: string };
    deleteUser: (userId: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>(() => {
        try {
            const savedUsersJSON = window.localStorage.getItem(USERS_STORAGE_KEY);
            if (savedUsersJSON) {
                const loadedUsers = JSON.parse(savedUsersJSON);
                // Ensure the primary admin always exists
                if (!loadedUsers.some((u: User) => u.username === 'admin')) {
                    loadedUsers.push({ id: 'default-admin', username: 'admin', password: '123', role: 'Admin' });
                }
                return loadedUsers;
            }
        } catch (error) {
            console.error("Could not load users from localStorage", error);
        }
        // Default user if none exist
        return [{ id: 'default-admin', username: 'admin', password: '123', role: 'Admin' }];
    });
    
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
         try {
            const savedAuthJSON = window.localStorage.getItem(AUTH_KEY);
            if (savedAuthJSON) {
                return JSON.parse(savedAuthJSON);
            }
        } catch {
            return null;
        }
        return null;
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        } catch (error) {
            console.error("Could not save users to localStorage", error);
        }
    }, [users]);
    
    useEffect(() => {
        try {
            if (currentUser) {
                window.localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
            } else {
                window.localStorage.removeItem(AUTH_KEY);
            }
        } catch (error) {
            console.error("Could not save auth state to localStorage", error);
        }
    }, [currentUser]);

    const login = useCallback((username: string, password: string): boolean => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    }, [users]);

    const logout = useCallback(() => {
        setCurrentUser(null);
    }, []);
    
    const addUser = useCallback((user: Omit<User, 'id'>): { success: boolean, message?: string } => {
         if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
            const message = `User with username "${user.username}" already exists.`;
            return { success: false, message };
        }
        const newUser: User = { ...user, id: new Date().toISOString() };
        setUsers(prev => [...prev, newUser]);
        return { success: true };
    }, [users]);

    const deleteUser = useCallback((userId: string) => {
        // Prevent deleting the primary admin account
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete?.username === 'admin') {
            alert("The primary admin account cannot be deleted.");
            return;
        }
        setUsers(prev => prev.filter(u => u.id !== userId));
    }, [users]);

    const value = { 
        isAuthenticated: !!currentUser, 
        currentUser,
        users,
        login, 
        logout,
        addUser,
        deleteUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};