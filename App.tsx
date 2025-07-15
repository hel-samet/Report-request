
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import type { Report } from './types';
import { STATIONARY_ITEMS_ROW1, STATIONARY_ITEMS_ROW2, CAMPUS_OPTIONS } from './constants';
import { useAuth } from './useAuth';
import { LoginPage } from './LoginPage';
import { useStock } from './useStock';
import { Dashboard } from './Dashboard';
import { ControlPanel } from './ControlPanel';
import type { StockItem } from './StockContext';

interface ReportFormProps {
    formData: Omit<Report, 'id'>;
    isEditing: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleItemQuantityChange: (item: string, value: string) => void;
    handleUpdateReport: () => void;
    handleAddReport: () => void;
    handleDeleteReport: () => void;
    clearForm: () => void;
}

interface ReportsViewProps {
    reports: Report[];
    formData: Omit<Report, 'id'>;
    selectedReportId: string | null;
    isEditing: boolean;
    handleSelectReport: (report: Report) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleItemQuantityChange: (item: string, value: string) => void;
    handleUpdateReport: () => void;
    handleAddReport: () => void;
    handleDeleteReport: () => void;
    clearForm: () => void;
}

const LOCAL_STORAGE_KEY_REPORTS = 'stationaryAppReports';
const LOCAL_STORAGE_KEY_FORM_DATA = 'stationaryAppFormData';
const LOCAL_STORAGE_KEY_SELECTED_ID = 'stationaryAppSelectedId';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

// --- Icon Components ---
const Icon = ({ path, className = "h-6 w-6" }: { path: string, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);
const DocumentTextIcon = () => <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
const ChartBarIcon = () => <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
const CogIcon = () => <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />;
const LogoutIcon = () => <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />;
const PlusIcon = () => <Icon path="M12 4v16m8-8H4" className="h-5 w-5 mr-2" />;
const TrashIcon = () => <Icon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" className="h-5 w-5 mr-2" />;
const SaveIcon = () => <Icon path="M5 13l4 4L19 7" className="h-5 w-5 mr-2" />;
const CloseIcon = () => <Icon path="M6 18L18 6M6 6l12 12" className="h-5 w-5 mr-2" />;
const ChevronDownIcon = ({className}: {className: string}) => <Icon path="M19 9l-7 7-7-7" className={className} />;
const UploadIcon = () => <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" className="h-5 w-5 mr-2" />;
const DownloadIcon = () => <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="h-5 w-5 mr-2" />;

interface CustomButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    children: React.ReactNode;
    className?: string;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
}

export const CustomButton: React.FC<CustomButtonProps> = ({ onClick, disabled = false, variant = 'primary', children, className = '', title, type = 'button' }) => {
    const baseClasses = 'flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        secondary: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus:ring-primary-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'} ${className}`}
        >
            {children}
        </button>
    );
};


interface ConfirmationModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    children: React.ReactNode;
    confirmButtonText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onCancel, title, children, confirmButtonText = 'Confirm' }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-neutral-900/60 z-50 flex justify-center items-center p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
            onClick={onCancel}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={e => e.stopPropagation()}
            >
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-bold text-neutral-900" id="modal-title">{title}</h3>
                        <div className="mt-2">
                            <div className="text-sm text-neutral-600">{children}</div>
                        </div>
                    </div>
                </div>
                <div className="mt-6 sm:mt-8 sm:flex sm:flex-row-reverse gap-3">
                    <CustomButton onClick={onConfirm} variant="danger" className="w-full sm:w-auto">
                        {confirmButtonText}
                    </CustomButton>
                    <CustomButton onClick={onCancel} variant="secondary" className="w-full mt-3 sm:mt-0 sm:w-auto">
                        Cancel
                    </CustomButton>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    variant?: 'error' | 'success' | 'info';
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, children, variant = 'error' }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    
    const modalConfig = {
        error: {
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
            bgColor: 'bg-red-100',
            textColor: 'text-red-600',
        },
        success: {
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
            bgColor: 'bg-green-100',
            textColor: 'text-green-600',
        },
        info: {
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600',
        },
    };

    const { icon, bgColor, textColor } = modalConfig[variant] || modalConfig.error;


    return (
        <div 
            className="fixed inset-0 bg-neutral-900/60 z-50 flex justify-center items-center p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={e => e.stopPropagation()}
            >
                <div className="sm:flex sm:items-start">
                     <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                        <svg className={`h-6 w-6 ${textColor}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            {icon}
                        </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-bold text-neutral-900" id="modal-title">{title}</h3>
                        <div className="mt-2">
                            <div className="text-sm text-neutral-600">{children}</div>
                        </div>
                    </div>
                </div>
                <div className="mt-6 sm:mt-8 sm:flex sm:flex-row-reverse">
                    <CustomButton onClick={onClose} variant="primary" className="w-full sm:w-auto">
                        OK
                    </CustomButton>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};


// Helper functions for display logic
const formatItemsForDisplay = (items: Record<string, number> | string[]): string => {
    if (!items) return '';
    if (Array.isArray(items)) {
        return items.length > 0 ? items.join(', ') : 'N/A';
    }
    if (typeof items === 'object') {
        const entries = Object.entries(items).filter(([, quantity]) => quantity > 0);
        if (entries.length === 0) return 'N/A';
        return entries.map(([item, quantity]) => `${item} (${quantity})`).join(', ');
    }
    return 'N/A';
};

const calculateTotalItems = (items: Record<string, number> | string[]): number => {
    if (!items) return 0;
    if (Array.isArray(items)) {
        return items.length;
    }
    if (typeof items === 'object') {
        return Object.values(items).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0);
    }
    return 0;
};

const initialFormData: Omit<Report, 'id'> = {
  requesterName: '',
  campus: '',
  importDate: '',
  exportDate: '',
  items: {},
  status: 'Process',
};

const initialReports: Report[] = [];

interface HeaderProps {
    view: 'reports' | 'dashboard' | 'controlPanel';
    saveStatus: 'idle' | 'saved';
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    onImport: () => void;
    onExport: () => void;
    isImporting: boolean;
    hasReports: boolean;
}

const Header = ({ view, saveStatus, isSidebarOpen, setIsSidebarOpen, onImport, onExport, isImporting, hasReports }: HeaderProps) => {
    const getHeaderText = () => {
        switch (view) {
            case 'reports': return 'Reports Management';
            case 'dashboard': return 'Stock Dashboard';
            case 'controlPanel': return 'Admin Control Panel';
            default: return 'Stationary System';
        }
    };
    return (
        <header className="bg-white shadow-sm p-4 md:p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-neutral-500">
                     <Icon path="M4 6h16M4 12h16M4 18h16" />
                 </button>
                <h1 className="text-2xl font-bold text-neutral-800">{getHeaderText()}</h1>
            </div>
            <div className="flex items-center gap-4">
                 {view === 'reports' && (
                    <div className="flex items-center gap-3">
                        <CustomButton
                            onClick={onImport}
                            variant="primary"
                            disabled={isImporting}
                            title="Import data from a PDF file"
                        >
                            <UploadIcon />
                            {isImporting ? 'Importing...' : 'Import PDF'}
                        </CustomButton>
                        <CustomButton
                            onClick={onExport}
                            variant="secondary"
                            disabled={!hasReports}
                        >
                            <DownloadIcon />
                            Export All PDF
                        </CustomButton>
                    </div>
                )}
                <div className={`transition-opacity duration-500 ${saveStatus === 'saved' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center text-green-600 font-semibold text-sm">
                        <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="h-5 w-5 mr-1" />
                        <span>Saved to device</span>
                    </div>
                </div>
            </div>
        </header>
    );
};


// App's main component
export default function App() {
    const { isAuthenticated, logout, currentUser } = useAuth();
    const { stock, setStock, saveStatus, triggerSaveStatus } = useStock();
    const [view, setView] = useState<'reports' | 'dashboard' | 'controlPanel'>('reports');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [reports, setReports] = useState<Report[]>(() => {
        try {
            const savedReportsJSON = window.localStorage.getItem(LOCAL_STORAGE_KEY_REPORTS);
            if (savedReportsJSON) {
                const savedReports = JSON.parse(savedReportsJSON);
                if (Array.isArray(savedReports)) {
                    return savedReports.map((report: any) => {
                        const newReport = { ...report };
                        if (Array.isArray(newReport.items)) {
                            const newItems: Record<string, number> = {};
                            newReport.items.forEach((item: string) => { newItems[item] = (newItems[item] || 0) + 1; });
                            newReport.items = newItems;
                        } else if (!newReport.items || typeof newReport.items !== 'object') {
                            newReport.items = {};
                        }
                        if (newReport.status !== 'Done') { newReport.status = 'Process'; }
                        return newReport;
                    });
                }
            }
        } catch (error) { console.error("Error reading reports from localStorage:", error); }
        return initialReports;
    });

    const [formData, setFormData] = useState<Omit<Report, 'id'>>(initialFormData);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string; variant: 'error' | 'success' | 'info' } | null>(null);
    const reportsDidMount = useRef(false);

    // PDF Import State
    const [isImporting, setIsImporting] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (reportsDidMount.current) {
            try {
                window.localStorage.setItem(LOCAL_STORAGE_KEY_REPORTS, JSON.stringify(reports));
                triggerSaveStatus();
            } catch (error) { console.error("Error saving reports to localStorage:", error); }
        } else {
            reportsDidMount.current = true;
        }
    }, [reports, triggerSaveStatus]);
    
    // Auto-select a report if one was selected previously
    useEffect(() => {
        try {
            const savedId = window.localStorage.getItem(LOCAL_STORAGE_KEY_SELECTED_ID);
            if (savedId) {
                const parsedId = JSON.parse(savedId);
                const reportExists = reports.some(r => r.id === parsedId);
                if (reportExists) {
                    handleSelectReport(reports.find(r => r.id === parsedId)!);
                } else {
                    setSelectedReportId(null); // Clear if report no longer exists
                }
            }
        } catch (error) { console.error("Error reading selected ID from localStorage", error); }
    }, []); // Run only on mount

    const handleLogout = useCallback(() => { logout(); }, [logout]);
    
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as any }));
    }, []);

    const handleItemQuantityChange = useCallback((item: string, value: string) => {
        const quantity = parseInt(value, 10);
        setFormData(prev => {
            const newItems = { ...prev.items };
            if (!isNaN(quantity) && quantity > 0) {
                newItems[item] = quantity;
            } else {
                delete newItems[item];
            }
            return { ...prev, items: newItems };
        });
    }, []);

    const clearForm = useCallback(() => {
        setFormData(initialFormData);
        setSelectedReportId(null);
        window.localStorage.removeItem(LOCAL_STORAGE_KEY_SELECTED_ID);
    }, []);
    
    const handleAddReport = useCallback(() => {
        if (!formData.requesterName || !formData.campus || !formData.importDate || !formData.exportDate) {
            setInfoModalContent({ variant: 'error', title: 'Missing Information', message: 'Please fill all required fields: Requester Name, Campus, Import Date, and Export Date.' });
            return;
        }
        if (calculateTotalItems(formData.items) === 0) {
            setInfoModalContent({ variant: 'error', title: 'Empty Report', message: 'A report must contain at least one stationary item.' });
            return;
        }
        if (formData.status === 'Done') {
            const itemsToDeduct = formData.items;
            const insufficientItems: string[] = [];
            for (const [item, quantity] of Object.entries(itemsToDeduct)) {
                if ((stock[item]?.quantity || 0) < quantity) {
                    insufficientItems.push(`${item} (requested ${quantity}, available ${stock[item]?.quantity || 0})`);
                }
            }
            if (insufficientItems.length > 0) {
                setInfoModalContent({ variant: 'error', title: 'Insufficient Stock', message: `Cannot add report. Insufficient stock for: ${insufficientItems.join(', ')}.` });
                return;
            }
            setStock(prevStock => {
                const newStock = JSON.parse(JSON.stringify(prevStock));
                const today = new Date().toISOString().split('T')[0];
                for (const [item, quantity] of Object.entries(itemsToDeduct)) {
                    const numQuantity = Number(quantity) || 0;
                    if (newStock[item]) {
                        newStock[item].quantity = (newStock[item].quantity || 0) - numQuantity;
                        newStock[item].lastOutDate = today;
                        newStock[item].lastUpdateQuantity = -numQuantity;
                    }
                }
                return newStock;
            });
        }
        const newReport: Report = { id: new Date().toISOString(), ...formData };
        setReports(prev => [newReport, ...prev]); // Add to top
        clearForm();
    }, [formData, clearForm, stock, setStock]);

    const handleSelectReport = useCallback((report: Report) => {
        setSelectedReportId(report.id);
        window.localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_ID, JSON.stringify(report.id));
        setFormData({
            requesterName: report.requesterName,
            campus: report.campus,
            importDate: report.importDate,
            exportDate: report.exportDate,
            items: report.items && typeof report.items === 'object' && !Array.isArray(report.items) 
                   ? { ...report.items } : {},
            status: report.status || 'Process'
        });
    }, []);

    const handleUpdateReport = useCallback(() => {
        if (!selectedReportId) return;
        const originalReport = reports.find(r => r.id === selectedReportId);
        if (!originalReport) return;
        const updatedData = formData;
        const insufficientItems: string[] = [];
        const originalItems = originalReport.items || {};
        const updatedItems = updatedData.items || {};
        if (originalReport.status === 'Process' && updatedData.status === 'Done') {
            for (const [item, quantity] of Object.entries(updatedItems)) {
                if ((stock[item]?.quantity || 0) < quantity) {
                    insufficientItems.push(`${item} (req ${quantity}, avail ${stock[item]?.quantity || 0})`);
                }
            }
        } else if (originalReport.status === 'Done' && updatedData.status === 'Done') {
            const allItems = new Set([...Object.keys(originalItems), ...Object.keys(updatedItems)]);
            allItems.forEach(item => {
                const delta = (Number(updatedItems[item] || 0)) - (Number(originalItems[item] || 0));
                if (delta > 0 && (stock[item]?.quantity || 0) < delta) {
                     insufficientItems.push(`${item} (req ${delta} more, avail ${stock[item]?.quantity || 0})`);
                }
            });
        }
        if (insufficientItems.length > 0) {
            setInfoModalContent({ variant: 'error', title: 'Insufficient Stock', message: `Cannot update report. Insufficient stock for: ${insufficientItems.join(', ')}.` });
            return;
        }
        setStock(prevStock => {
            const newStock = JSON.parse(JSON.stringify(prevStock));
            const today = new Date().toISOString().split('T')[0];
            if (originalReport.status === 'Process' && updatedData.status === 'Done') {
                for (const [item, quantity] of Object.entries(updatedItems)) {
                    const numQuantity = Number(quantity) || 0;
                    if (newStock[item]) {
                         newStock[item].quantity -= numQuantity;
                         newStock[item].lastOutDate = today;
                         newStock[item].lastUpdateQuantity = -numQuantity;
                    }
                }
            }
            else if (originalReport.status === 'Done' && updatedData.status === 'Process') {
                for (const [item, quantity] of Object.entries(originalItems)) {
                    const numQuantity = Number(quantity) || 0;
                    if (newStock[item]) {
                        newStock[item].quantity += numQuantity;
                        newStock[item].lastInDate = today;
                        newStock[item].lastUpdateQuantity = numQuantity;
                    }
                }
            }
            else if (originalReport.status === 'Done' && updatedData.status === 'Done') {
                const allItems = new Set([...Object.keys(originalItems), ...Object.keys(updatedItems)]);
                allItems.forEach(item => {
                    const delta = Number(originalItems[item] || 0) - Number(updatedItems[item] || 0);
                    if (newStock[item] && delta !== 0) {
                        newStock[item].quantity += delta;
                        newStock[item].lastUpdateQuantity = -delta;
                        if (delta > 0) { newStock[item].lastInDate = today; } 
                        else { newStock[item].lastOutDate = today; }
                    }
                });
            }
            return newStock;
        });
        setReports(prev => prev.map(r => r.id === selectedReportId ? { ...r, ...updatedData } : r ));
        clearForm();
    }, [selectedReportId, formData, clearForm, reports, stock, setStock]);
    
    const handleConfirmDelete = useCallback(() => {
        if (!selectedReportId) return;
        const reportToDelete = reports.find(r => r.id === selectedReportId);
        if (reportToDelete && reportToDelete.status === 'Done') {
            const itemsToAddBack = reportToDelete.items;
            setStock(prevStock => {
                const newStock = JSON.parse(JSON.stringify(prevStock));
                const today = new Date().toISOString().split('T')[0];
                for (const [item, quantity] of Object.entries(itemsToAddBack)) {
                    const numQuantity = Number(quantity) || 0;
                    if (newStock[item]) {
                        newStock[item].quantity += numQuantity;
                        newStock[item].lastInDate = today;
                        newStock[item].lastUpdateQuantity = numQuantity;
                    }
                }
                return newStock;
            });
        }
        setReports(prev => prev.filter(r => r.id !== selectedReportId));
        clearForm();
        setIsConfirmingDelete(false);
    }, [selectedReportId, clearForm, reports, setStock]);
    
    const handleDeleteReport = useCallback(() => {
        if (!selectedReportId) return;
        setIsConfirmingDelete(true);
    }, [selectedReportId]);

    const reportToDelete = useMemo(() => selectedReportId ? reports.find(r => r.id === selectedReportId) : null, [reports, selectedReportId]);

    const handleExportPDF = useCallback(() => {
        if (reports.length === 0 && Object.keys(stock).length === 0) {
            setInfoModalContent({ variant: 'error', title: 'No Data', message: 'There is no report or stock data to export.' });
            return;
        }
        const doneReports = reports.filter(r => (r.status || 'Process') === 'Done');
        const processReports = reports.filter(r => (r.status || 'Process') === 'Process');
        const calculateItemCounts = (reports: Report[]) => reports.reduce((acc, report) => {
            if (report.items && typeof report.items === 'object') {
                for (const [item, quantity] of Object.entries(report.items)) {
                    acc[item] = (acc[item] || 0) + (Number(quantity) || 0);
                }
            }
            return acc;
        }, {} as Record<string, number>);
        const itemCountsDone = calculateItemCounts(doneReports);
        const itemCountsProcess = calculateItemCounts(processReports);
        const itemCountsTotal = calculateItemCounts(reports);
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Stationary Report (All Time, All Campuses)', 14, 22);
        let currentY = 30;
        if (Object.keys(itemCountsTotal).length > 0) {
            doc.setFontSize(16);
            doc.setTextColor(45, 55, 72);
            doc.text('Overall Summary', 14, currentY); currentY += 8;
            doc.setFontSize(10);
            const splitSummary = doc.splitTextToSize(Object.entries(itemCountsTotal).map(([item, count]) => `${item}: ${count}`).join(' | '), 180);
            doc.text(splitSummary, 14, currentY); currentY += (splitSummary.length * 4) + 5;
        }
        const addSectionToPdf = (title: string, reports: Report[], counts: Record<string, number>, startY: number): number => {
            if (reports.length === 0) return startY;
            if (startY > 30) startY += 10;
            doc.setFontSize(16); doc.setTextColor(45, 55, 72); doc.text(title, 14, startY); startY += 8;
            if (Object.keys(counts).length > 0) {
                doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Summary (Total Items)', 14, startY); startY += 7;
                doc.setFontSize(10);
                const summaryText = Object.entries(counts).map(([item, count]) => `${item}: ${count}`).join(' | ');
                doc.text(doc.splitTextToSize(summaryText, 180), 14, startY); startY += (doc.splitTextToSize(summaryText, 180).length * 4) + 5;
            }
            autoTable(doc, {
                head: [["Requester", "Campus", "Import", "Export", "Total"]],
                body: reports.map(r => [r.requesterName, r.campus, r.importDate, r.exportDate, calculateTotalItems(r.items).toString()]),
                startY: startY, theme: 'grid', headStyles: { fillColor: [45, 55, 72] },
            });
            return (doc as any).lastAutoTable.finalY;
        };
        currentY = addSectionToPdf('Status: Done', doneReports, itemCountsDone, currentY);
        currentY = addSectionToPdf('Status: Process', processReports, itemCountsProcess, currentY);
        let lastY = (doc as any).lastAutoTable.finalY || currentY;
        if (lastY > 250) { doc.addPage(); lastY = 20; } else { lastY += 15; }
        doc.setFontSize(16); doc.setTextColor(45, 55, 72); doc.text('Current Stock Inventory', 14, lastY); lastY += 8;
        autoTable(doc, {
            head: [["Item", "Quantity", "Date Added"]],
            body: Object.entries(stock).sort(([a], [b]) => a.localeCompare(b)).map(([item, { quantity, lastInDate }]) => [item, quantity.toString(), lastInDate || 'N/A']),
            startY: lastY, theme: 'grid', headStyles: { fillColor: [80, 80, 80] },
        });
        doc.save(`Stationary_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }, [reports, stock]);
    
    const handleTriggerPdfImport = useCallback(() => { importFileRef.current?.click(); }, []);

    const handlePdfImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
    
        try {
            // Step 1: Check for API Key Configuration
            if (!process.env.API_KEY) {
                throw new Error("API_KEY_MISSING");
            }
    
            // Step 2: Parse the PDF file
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
            }
            if (!fullText.trim()) throw new Error("Could not extract any text from the PDF.");
    
            // Step 3: Call the Generative AI Model
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const allItems = [...STATIONARY_ITEMS_ROW1, ...STATIONARY_ITEMS_ROW2].join(', ');
            const allCampuses = CAMPUS_OPTIONS.join(', ');
    
            const prompt = `
Analyze the following text from a stationary management document and extract all reports and the complete stock inventory according to the specified JSON schema.

**Extraction Rules:**
1.  **Reports:**
    *   Identify every distinct report entry.
    *   **requesterName**: Extract the full name of the person requesting items.
    *   **campus**: Extract the campus location. You must normalize it to one of these valid options: ${allCampuses}.
    *   **importDate** & **exportDate**: Extract the relevant dates and format them strictly as YYYY-MM-DD.
    *   **status**: Determine if the report is 'Process' or 'Done'.
    *   **items**: For each report, list all requested items and their quantities. You must normalize item names to match one of these valid options: ${allItems}.

2.  **Stock Inventory:**
    *   Identify the stock inventory list.
    *   **name**: Extract the name for each stock item, normalizing it to a valid option from the item list above.
    *   **quantity**: Extract the current quantity in stock.
    *   **lastInDate**: Extract the last stock-in date, formatted as YYYY-MM-DD. If a date is not present, use 'N/A'.

Please ensure the output strictly adheres to the JSON schema provided.

**Document Text to Analyze:**
---
${fullText}
---
`;
    
            const schema = {
              type: Type.OBJECT,
              properties: {
                reports: {
                  type: Type.ARRAY,
                  description: "An array of report objects from the PDF.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      requesterName: { type: Type.STRING, description: "Name of the person requesting items." },
                      campus: { type: Type.STRING, description: "The campus location." },
                      importDate: { type: Type.STRING, description: "Import date in YYYY-MM-DD format." },
                      exportDate: { type: Type.STRING, description: "Export date in YYYY-MM-DD format." },
                      items: {
                        type: Type.ARRAY,
                        description: "List of items with their quantities.",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING, description: "The name of the item." },
                            quantity: { type: Type.INTEGER, description: "The quantity of the item." }
                          },
                          required: ['name', 'quantity']
                        }
                      },
                      status: { type: Type.STRING, description: "Should be either 'Process' or 'Done'." }
                    },
                    required: ['requesterName', 'campus', 'importDate', 'exportDate', 'items', 'status']
                  }
                },
                stock: {
                  type: Type.ARRAY,
                  description: "An array of stock items from the PDF.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "The name of the stock item." },
                      quantity: { type: Type.INTEGER, description: "The quantity in stock." },
                      lastInDate: { type: Type.STRING, description: "The last date the item was stocked in YYYY-MM-DD format, or 'N/A'."}
                    },
                    required: ['name', 'quantity']
                  }
                }
              },
              required: ['reports', 'stock']
            };
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
    
            // Step 4: Process the AI Response
            const jsonStr = response.text.trim();
            const parsedData = JSON.parse(jsonStr);
    
            if (!parsedData || typeof parsedData !== 'object') throw new Error("AI response is not a valid JSON object.");
            
            const parsedReports = parsedData.reports;
            if (!Array.isArray(parsedReports)) throw new Error("AI did not return a valid array of reports.");
    
            const newReports: Report[] = parsedReports.map((item: any) => {
                const itemsRecord: Record<string, number> = {};
                if (Array.isArray(item.items)) {
                    item.items.forEach((subItem: { name: string; quantity: number }) => {
                        if (subItem.name && typeof subItem.quantity === 'number') {
                            itemsRecord[subItem.name] = subItem.quantity;
                        }
                    });
                }
                return {
                    ...initialFormData, id: `imported-${new Date().toISOString()}-${Math.random()}`,
                    requesterName: item.requesterName || '',
                    campus: item.campus || '',
                    importDate: item.importDate || '',
                    exportDate: item.exportDate || '',
                    items: itemsRecord,
                    status: (item.status === 'Done' ? 'Done' : 'Process') as ('Process' | 'Done'),
                };
            }).filter(r => r.requesterName && r.campus && r.importDate);
    
            const parsedStock = parsedData.stock;
            if (!Array.isArray(parsedStock)) throw new Error("AI did not return a valid stock array.");
    
            const newStock: Record<string, StockItem> = {};
            parsedStock.forEach((item: { name: string; quantity: number; lastInDate: string }) => {
                if (item.name && typeof item.quantity === 'number') {
                    newStock[item.name] = {
                        quantity: item.quantity,
                        lastInDate: (typeof item.lastInDate === 'string' && item.lastInDate !== 'N/A') ? item.lastInDate : '',
                        lastOutDate: '',
                        lastUpdateQuantity: 0
                    };
                }
            });
            
            setReports(newReports);
            setStock(newStock);
            setInfoModalContent({ variant: 'success', title: 'Import Successful', message: `Successfully imported ${newReports.length} reports and replaced the stock inventory.` });
        } catch (error) {
            console.error("Failed to import PDF:", error);
            
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
    
                // Fallback to Demo Mode if API Key is missing or invalid
                if (message === 'api_key_missing' || message.includes('api key not valid')) {
                    console.warn("API Key issue detected. Falling back to demo data.");
                    setTimeout(() => {
                        const sampleReports: Report[] = [
                            { id: 'demo-1', requesterName: 'John Doe (Demo)', campus: 'Campus1', importDate: '2024-01-15', exportDate: '2024-01-16', items: { 'A4 Paper': 2, 'Mouse': 1 }, status: 'Done' },
                            { id: 'demo-2', requesterName: 'Jane Smith (Demo)', campus: 'Campus2', importDate: '2024-01-17', exportDate: '2024-01-18', items: { 'Keyboard': 1, 'Webcam': 1, 'Bk': 5 }, status: 'Process' }
                        ];
                        const allItemsList = [...STATIONARY_ITEMS_ROW1, ...STATIONARY_ITEMS_ROW2];
                        const sampleStock: Record<string, StockItem> = {};
                        allItemsList.forEach(item => {
                            sampleStock[item] = { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
                        });
                        sampleStock['A4 Paper'] = { quantity: 18, lastInDate: '2024-01-10', lastOutDate: '2024-01-15', lastUpdateQuantity: -2 };
                        sampleStock['Mouse'] = { quantity: 9, lastInDate: '2024-01-10', lastOutDate: '2024-01-15', lastUpdateQuantity: -1 };
                        sampleStock['Keyboard'] = { quantity: 14, lastInDate: '2024-01-10', lastOutDate: '', lastUpdateQuantity: 0 };
                        sampleStock['Webcam'] = { quantity: 5, lastInDate: '2024-01-10', lastOutDate: '', lastUpdateQuantity: 0 };
                        sampleStock['Bk'] = { quantity: 20, lastInDate: '2024-01-10', lastOutDate: '', lastUpdateQuantity: 0 };
            
                        setReports(sampleReports);
                        setStock(sampleStock);
                        setInfoModalContent({
                            variant: 'info',
                            title: 'Demo Mode Activated',
                            message: 'The AI document processing service is not configured. To demonstrate functionality, sample data has been loaded instead.'
                        });
                    }, 100);
                } else if (message.includes("could not extract any text from the pdf")) {
                    setInfoModalContent({ variant: 'error', title: 'Cannot Read PDF', message: 'No text could be extracted from the provided PDF. It may be an image, empty, or corrupted.' });
                } else {
                     setInfoModalContent({ variant: 'error', title: 'Error Importing PDF', message: `An unexpected error occurred: ${error.message}` });
                }
            } else {
                setInfoModalContent({ variant: 'error', title: 'Error Importing PDF', message: 'An unknown error occurred.' });
            }
        } finally {
            setIsImporting(false);
            if (e.target) e.target.value = '';
        }
    }, [setReports, setStock]);

    if (!isAuthenticated) return <LoginPage />;

    const Sidebar = () => {
        const NavButton = ({ viewName, children, icon }: { viewName: 'reports' | 'dashboard' | 'controlPanel'; children: React.ReactNode; icon: React.ReactNode }) => (
            <button
                onClick={() => { setView(viewName); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${view === viewName ? 'bg-primary-600 text-white' : 'text-neutral-200 hover:bg-primary-700 hover:text-white'}`}
            >
                {icon}
                <span className="flex-1 text-left">{children}</span>
            </button>
        );
        return (
            <>
                <div className={`fixed inset-y-0 left-0 bg-primary-900 text-white w-64 p-4 z-40 transform transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-8 px-2">
                           <div className="bg-primary-500 p-2 rounded-lg">
                             <DocumentTextIcon />
                           </div>
                           <h1 className="text-xl font-bold">Stationary</h1>
                        </div>
                        <nav className="flex-1 space-y-2">
                            <NavButton viewName="reports" icon={<DocumentTextIcon />} >Reports</NavButton>
                            <NavButton viewName="dashboard" icon={<ChartBarIcon />}>Dashboard</NavButton>
                            {currentUser?.role === 'Admin' && <NavButton viewName="controlPanel" icon={<CogIcon />}>Control Panel</NavButton>}
                        </nav>
                        <div className="border-t border-primary-800 pt-4">
                            <div className="flex items-center gap-3 mb-4 px-2">
                               <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center font-bold text-white">
                                   {currentUser?.username.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                   <p className="font-semibold text-white">{currentUser?.username}</p>
                                   <p className="text-xs text-primary-300">{currentUser?.role}</p>
                               </div>
                            </div>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-neutral-200 hover:bg-primary-700 hover:text-white transition-colors duration-200">
                               <LogoutIcon />
                               <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            </>
        );
    };

    const isEditing = selectedReportId !== null;

    return (
        <div className="min-h-screen font-sans">
            <Sidebar />
            <main className="md:pl-64 transition-all duration-300">
                <Header
                    view={view}
                    saveStatus={saveStatus}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onImport={handleTriggerPdfImport}
                    onExport={handleExportPDF}
                    isImporting={isImporting}
                    hasReports={reports.length > 0}
                />
                <div className="p-4 md:p-6">
                    {view === 'reports' && (
                        <ReportsView
                            reports={reports}
                            formData={formData}
                            selectedReportId={selectedReportId}
                            isEditing={isEditing}
                            handleSelectReport={handleSelectReport}
                            handleInputChange={handleInputChange}
                            handleItemQuantityChange={handleItemQuantityChange}
                            handleUpdateReport={handleUpdateReport}
                            handleAddReport={handleAddReport}
                            handleDeleteReport={handleDeleteReport}
                            clearForm={clearForm}
                        />
                    )}
                    {view === 'dashboard' && <Dashboard />}
                    {view === 'controlPanel' && currentUser?.role === 'Admin' && <ControlPanel />}
                </div>
            </main>
            <ConfirmationModal
                isOpen={isConfirmingDelete}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmingDelete(false)}
                title="Confirm Report Deletion"
                confirmButtonText="Delete"
            >
                {reportToDelete ? (
                    <p>Are you sure you want to permanently delete the report for <strong className="text-primary-600">{reportToDelete.requesterName}</strong> from <strong className="text-primary-600">{reportToDelete.campus}</strong>?</p>
                ) : (
                    <p>Are you sure you want to delete this report?</p>
                )}
                 <p className="mt-4 text-sm text-neutral-500">This action cannot be undone. If this report was 'Done', items will be returned to stock.</p>
            </ConfirmationModal>
            <InfoModal
                isOpen={!!infoModalContent}
                onClose={() => setInfoModalContent(null)}
                title={infoModalContent?.title || 'Error'}
                variant={infoModalContent?.variant || 'error'}
            >
                {infoModalContent?.message || 'An unknown error has occurred.'}
            </InfoModal>
            <input type="file" ref={importFileRef} onChange={handlePdfImport} accept=".pdf" className="hidden" aria-hidden="true" />
        </div>
    );
}

// Reports View Component
const ReportsView = ({ reports, formData, selectedReportId, isEditing, ...props }: ReportsViewProps) => {
    const [campusFilter, setCampusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    const availableYears = useMemo(() => {
        const years = new Set(reports.map((r: Report) => r.importDate?.split('-')[0]).filter((y): y is string => !!y));
        return Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    }, [reports]);

    const months = useMemo(() => [
        { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
        { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
        { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
        { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
    ], []);

    const filteredReports = useMemo(() => reports.filter((report: Report) => {
        const campusMatch = campusFilter ? report.campus === campusFilter : true;
        
        if (!report.importDate) {
            if (dateFilter || monthFilter || yearFilter) return false;
            return campusMatch;
        }

        const [reportYear, reportMonth] = report.importDate.split('-').map(Number);

        const yearMatch = yearFilter ? reportYear === parseInt(yearFilter, 10) : true;
        const monthMatch = monthFilter ? reportMonth === parseInt(monthFilter, 10) : true;
        const dateMatch = dateFilter ? report.importDate === dateFilter : true;
        
        return campusMatch && yearMatch && monthMatch && dateMatch;
    }), [reports, campusFilter, dateFilter, monthFilter, yearFilter]);

    const handleClearFilters = () => {
        setCampusFilter('');
        setDateFilter('');
        setMonthFilter('');
        setYearFilter('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Filters and Report List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                         <select
                            name="campusFilter"
                            value={campusFilter}
                            onChange={(e) => setCampusFilter(e.target.value)}
                            className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white appearance-none"
                            aria-label="Filter by campus"
                         >
                             <option value="">All Campuses</option>
                             {CAMPUS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <select
                            name="yearFilter"
                            value={yearFilter}
                            onChange={(e) => { setYearFilter(e.target.value); setDateFilter(''); }}
                            className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white appearance-none"
                            aria-label="Filter by year"
                         >
                             <option value="">All Years</option>
                             {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                         </select>
                         <select
                            name="monthFilter"
                            value={monthFilter}
                            onChange={(e) => { setMonthFilter(e.target.value); setDateFilter(''); }}
                            className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white appearance-none"
                            aria-label="Filter by month"
                         >
                             <option value="">All Months</option>
                             {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                         </select>
                         <input
                             type="date"
                             value={dateFilter}
                             onChange={(e) => { setDateFilter(e.target.value); setYearFilter(''); setMonthFilter(''); }}
                             className="w-full px-4 py-2.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-neutral-500"
                             aria-label="Filter by specific date"
                         />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-neutral-200">
                         <div className="flex gap-2">
                            <CustomButton onClick={handleClearFilters} variant="secondary">
                                Clear Filters
                            </CustomButton>
                         </div>
                    </div>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-27rem)] overflow-x-auto relative border border-neutral-200 rounded-lg">
                    <table className="min-w-full bg-white text-sm">
                         <thead className="sticky top-0 bg-neutral-100 z-10">
                            <tr>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Requester</th>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Campus</th>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Dates</th>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Description</th>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Total Items</th>
                               <th className="py-3 px-4 text-left font-bold text-neutral-600 uppercase tracking-wider">Status</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-neutral-200">
                             {filteredReports.length > 0 ? filteredReports.map((report: Report) => (
                                <tr key={report.id} onClick={() => props.handleSelectReport(report)}
                                    className={`cursor-pointer transition-colors duration-200 ${selectedReportId === report.id ? 'bg-primary-100' : 'hover:bg-neutral-50'}`}>
                                    <td className="py-3 px-4 whitespace-nowrap"><div className="font-medium text-neutral-800">{report.requesterName}</div></td>
                                    <td className="py-3 px-4 whitespace-nowrap text-neutral-600">{report.campus}</td>
                                    <td className="py-3 px-4 whitespace-nowrap text-neutral-600">{report.importDate} to {report.exportDate}</td>
                                    <td className="py-3 px-4 text-neutral-600">
                                        <div className="max-w-sm truncate" title={formatItemsForDisplay(report.items)}>
                                            {formatItemsForDisplay(report.items)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap text-center font-medium text-neutral-800">{calculateTotalItems(report.items)}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${ (report.status || 'Process') === 'Done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }`}>
                                            {(report.status || 'Process') === 'Done' ? <Icon path="M5 13l4 4L19 7" className="h-4 w-4"/> : <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="h-4 w-4"/>}
                                            {report.status || 'Process'}
                                        </span>
                                    </td>
                                </tr>
                             )) : (
                                <tr>
                                   <td colSpan={6} className="text-center py-12 text-neutral-500">
                                       {reports.length > 0 ? 'No matching reports found for the selected filters.' : 'No reports yet. Add one to get started.'}
                                   </td>
                                </tr>
                             )}
                         </tbody>
                    </table>
                </div>
            </div>
            {/* Right Column: Add/Edit Form */}
            <div className="lg:col-span-1">
                 <ReportForm formData={formData} isEditing={isEditing} {...props} />
            </div>
        </div>
    );
};

// Report Form Component
const ReportForm = ({ formData, isEditing, handleInputChange, handleItemQuantityChange, handleUpdateReport, handleAddReport, handleDeleteReport, clearForm }: ReportFormProps) => {
    
    const AccordionSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        return (
            <div className="border-b border-neutral-200">
                <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-3 text-left font-semibold text-neutral-700">
                    <span>{title}</span>
                    <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <div className="pb-4">{children}</div>}
            </div>
        );
    };

    return (
         <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 sticky top-24">
             <h2 className="text-xl font-bold text-neutral-800 mb-4">{isEditing ? 'Edit Report' : 'Create New Report'}</h2>
             <form className="space-y-4 max-h-[calc(100vh-18rem)] overflow-y-auto pr-2">
                 {/* Requester, Campus, Status */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-neutral-600 mb-1 font-serif-khmer">ឈ្មោះអ្នកស្នើសុំ</label>
                         <input type="text" name="requesterName" value={formData.requesterName} onChange={handleInputChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-neutral-600 mb-1 font-serif-khmer">សាខា</label>
                         <select name="campus" value={formData.campus} onChange={handleInputChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 bg-white">
                             <option value="" disabled>Select a campus</option>
                             {CAMPUS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                    </div>
                 </div>
                 {/* Dates */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm font-medium text-neutral-600 mb-1 font-serif-khmer">ថ្ងៃនាំចូល</label>
                         <input type="date" name="importDate" value={formData.importDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-neutral-600 mb-1 font-serif-khmer">ថ្ងៃនាំចេញ</label>
                         <input type="date" name="exportDate" value={formData.exportDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500" />
                     </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1 font-serif-khmer">ស្ថានភាព</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 bg-white">
                        <option value="Process">Process</option>
                        <option value="Done">Done</option>
                    </select>
                 </div>
                 {/* Items */}
                 <div>
                     <label className="block text-sm font-medium text-neutral-600 mb-2 font-serif-khmer">សម្ភារៈ</label>
                     <div className="space-y-1">
                        <AccordionSection title="Inks & Toners" defaultOpen={true}>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-2">
                                 {STATIONARY_ITEMS_ROW1.map(item => (
                                     <div key={item} className="flex items-center justify-between">
                                         <label htmlFor={`item-${item}`} className="text-neutral-700 text-sm">{item}</label>
                                         <input id={`item-${item}`} type="number" min="0" placeholder="0" value={formData.items[item] || ''} onChange={(e) => handleItemQuantityChange(item, e.target.value)} className="w-16 px-2 py-1 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 text-center" />
                                     </div>
                                 ))}
                             </div>
                        </AccordionSection>
                        <AccordionSection title="Peripherals & Supplies" defaultOpen={true}>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-2">
                                 {STATIONARY_ITEMS_ROW2.map(item => (
                                     <div key={item} className="flex items-center justify-between">
                                         <label htmlFor={`item-${item}`} className="text-neutral-700 text-sm">{item}</label>
                                         <input id={`item-${item}`} type="number" min="0" placeholder="0" value={formData.items[item] || ''} onChange={(e) => handleItemQuantityChange(item, e.target.value)} className="w-16 px-2 py-1 border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 text-center" />
                                     </div>
                                 ))}
                             </div>
                        </AccordionSection>
                     </div>
                 </div>
             </form>
             {/* Action Buttons */}
             <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-neutral-200">
                 <CustomButton onClick={isEditing ? handleUpdateReport : handleAddReport} variant="primary" className="flex-1">
                     <SaveIcon />
                     {isEditing ? 'Save Changes' : 'Add Report'}
                 </CustomButton>
                 <CustomButton onClick={clearForm} variant="secondary">
                    <CloseIcon />
                     Clear
                 </CustomButton>
                 {isEditing && (
                     <CustomButton onClick={handleDeleteReport} disabled={!isEditing} variant="danger" className="px-3">
                         <Icon path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" className="h-5 w-5" />
                     </CustomButton>
                 )}
             </div>
         </div>
    );
};
