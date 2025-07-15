import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STATIONARY_ITEMS_ROW1, STATIONARY_ITEMS_ROW2 } from './constants';

const LOCAL_STORAGE_KEY_STOCK = 'stationaryAppStock';

export interface StockItem {
    quantity: number;
    lastInDate: string;
    lastOutDate: string;
    lastUpdateQuantity: number;
}

interface StockContextType {
    stock: Record<string, StockItem>;
    setStock: React.Dispatch<React.SetStateAction<Record<string, StockItem>>>;
    isEditingStock: boolean;
    setIsEditingStock: React.Dispatch<React.SetStateAction<boolean>>;
    tempStock: Record<string, StockItem>;
    handleTempStockChange: (item: string, value: string) => void;
    handleSaveStock: () => void;
    handleCancelEditStock: () => void;
    handleConfirmClearStock: () => void;
    handleExportStockPDF: () => void;
    saveStatus: 'idle' | 'saved';
    triggerSaveStatus: () => void;
}

export const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [stock, setStock] = useState<Record<string, StockItem>>(() => {
        const allItems = new Set([...STATIONARY_ITEMS_ROW1, ...STATIONARY_ITEMS_ROW2]);
        let savedStock: Record<string, any> = {};
    
        try {
            const savedStockJSON = window.localStorage.getItem(LOCAL_STORAGE_KEY_STOCK);
            if (savedStockJSON) {
                savedStock = JSON.parse(savedStockJSON);
            }
        } catch (error) {
            console.error("Error reading stock from localStorage:", error);
        }
        
        const migratedStock: Record<string, StockItem> = {};
        const today = new Date().toISOString().split('T')[0];
    
        allItems.forEach(item => {
            const stockItem = savedStock[item];
            if (stockItem !== undefined) {
                if (typeof stockItem === 'number') {
                    // Migrate from: number
                    migratedStock[item] = { quantity: stockItem, lastInDate: today, lastOutDate: '', lastUpdateQuantity: 0 };
                } else if (typeof stockItem === 'object' && stockItem !== null && 'dateAdded' in stockItem) {
                    // Migrate from: { quantity, dateAdded }
                    migratedStock[item] = { 
                        quantity: Number(stockItem.quantity) || 0,
                        lastInDate: stockItem.dateAdded || today,
                        lastOutDate: '', // Add new field
                        lastUpdateQuantity: 0
                    };
                } else if (typeof stockItem === 'object' && stockItem !== null && 'quantity' in stockItem && 'lastInDate' in stockItem) {
                    // Already in the current format or newer, just ensure all fields exist
                     migratedStock[item] = {
                        quantity: Number(stockItem.quantity) || 0,
                        lastInDate: stockItem.lastInDate || '',
                        lastOutDate: stockItem.lastOutDate || '',
                        lastUpdateQuantity: Number(stockItem.lastUpdateQuantity) || 0
                     };
                } else {
                    // Invalid data, initialize fresh
                    migratedStock[item] = { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
                }
            } else {
                // New item not in storage, initialize
                migratedStock[item] = { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
            }
        });
        
        return migratedStock;
    });

    const [isEditingStock, setIsEditingStock] = useState(false);
    const [tempStock, setTempStock] = useState<Record<string, StockItem>>(stock);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const saveTimeoutRef = useRef<number | null>(null);
    const stockDidMount = useRef(false);

    useEffect(() => {
        if (stockDidMount.current) {
            try {
                window.localStorage.setItem(LOCAL_STORAGE_KEY_STOCK, JSON.stringify(stock));
            } catch (error) {
                console.error("Error saving stock to localStorage:", error);
            }
        } else {
            stockDidMount.current = true;
        }
    }, [stock]);

    useEffect(() => {
        if (!isEditingStock) {
            setTempStock(stock);
        }
    }, [stock, isEditingStock]);

    const triggerSaveStatus = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setSaveStatus('saved');
        saveTimeoutRef.current = window.setTimeout(() => {
            setSaveStatus('idle');
        }, 2000);
    }, []);

    const handleTempStockChange = useCallback((item: string, value: string) => {
        const quantity = parseInt(value, 10);
        setTempStock(prev => {
            const currentItem = prev[item] || { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
            return {
                ...prev,
                [item]: {
                    ...currentItem,
                    quantity: isNaN(quantity) || quantity < 0 ? 0 : quantity
                }
            };
        });
    }, []);

    const handleSaveStock = useCallback(() => {
        const newStock = JSON.parse(JSON.stringify(tempStock));
        const today = new Date().toISOString().split('T')[0];
    
        // Determine date changes and last update quantity by comparing with original stock
        for (const item in newStock) {
            const oldStockItem = stock[item] || { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
            const oldQuantity = oldStockItem.quantity;
            const newQuantity = newStock[item].quantity;
            const delta = newQuantity - oldQuantity;
    
            if (delta !== 0) {
                newStock[item].lastUpdateQuantity = delta;
                if (delta > 0) {
                    newStock[item].lastInDate = today;
                    newStock[item].lastOutDate = oldStockItem.lastOutDate; // Preserve old date
                } else {
                    newStock[item].lastOutDate = today;
                    newStock[item].lastInDate = oldStockItem.lastInDate; // Preserve old date
                }
            } else {
                // Quantities are the same, preserve original data
                newStock[item].lastInDate = oldStockItem.lastInDate;
                newStock[item].lastOutDate = oldStockItem.lastOutDate;
                newStock[item].lastUpdateQuantity = oldStockItem.lastUpdateQuantity;
            }
        }
    
        setStock(newStock);
        setIsEditingStock(false);
        triggerSaveStatus();
    }, [tempStock, stock, triggerSaveStatus]);

    const handleCancelEditStock = useCallback(() => {
        setTempStock(stock); // Revert changes
        setIsEditingStock(false);
    }, [stock]);

    const handleConfirmClearStock = useCallback(() => {
        setStock(prevStock => {
            const clearedStock: Record<string, StockItem> = {};
            Object.keys(prevStock).forEach(itemKey => {
                clearedStock[itemKey] = { quantity: 0, lastInDate: '', lastOutDate: '', lastUpdateQuantity: 0 };
            });
            return clearedStock;
        });
        triggerSaveStatus();
    }, [triggerSaveStatus]);

    const handleExportStockPDF = useCallback(() => {
        if (Object.keys(stock).length === 0) {
            alert("No stock data to export.");
            return;
        }

        const doc = new jsPDF();
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        doc.setFontSize(18);
        doc.text('Stock Inventory Report', 14, 22);
        doc.setFontSize(12);
        doc.text(`Generated on: ${formattedDate} at ${formattedTime}`, 14, 30);

        const stockTableColumns = ["Item", "Quantity in Stock", "Last Date In", "Last Date Out"];
        const stockTableRows = Object.entries(stock)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([item, { quantity, lastInDate, lastOutDate }]) => [
                item,
                quantity.toString(),
                lastInDate || 'N/A',
                lastOutDate || 'N/A'
            ]);
        
        autoTable(doc, {
            head: [stockTableColumns],
            body: stockTableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] }, // Dark grey header
        });

        const fileName = `Stock_Inventory_Report_${today.toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }, [stock]);


    const value = {
        stock,
        setStock,
        isEditingStock,
        setIsEditingStock,
        tempStock,
        handleTempStockChange,
        handleSaveStock,
        handleCancelEditStock,
        handleConfirmClearStock,
        handleExportStockPDF,
        saveStatus,
        triggerSaveStatus,
    };

    return (
        <StockContext.Provider value={value}>
            {children}
        </StockContext.Provider>
    );
};
