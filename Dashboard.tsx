import React, { useState } from 'react';
import { useStock } from './useStock';
import { CustomButton, ConfirmationModal } from './App';
import { STATIONARY_ITEMS_ROW1, STATIONARY_ITEMS_ROW2 } from './constants';

export const Dashboard: React.FC = () => {
    const {
        stock,
        isEditingStock,
        setIsEditingStock,
        tempStock,
        handleTempStockChange,
        handleSaveStock,
        handleCancelEditStock,
        handleConfirmClearStock,
        handleExportStockPDF,
    } = useStock();

    const [isConfirmingClearStock, setIsConfirmingClearStock] = useState(false);

    const onConfirmClearStock = () => {
        handleConfirmClearStock();
        setIsConfirmingClearStock(false);
    };
    
    const Icon = ({ path, className = "h-6 w-6" }: { path: string, className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );

    return (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800">Stock Overview</h2>
                        <p className="text-sm text-neutral-500 mt-1">Manage and monitor current inventory levels.</p>
                    </div>
                    {!isEditingStock && (
                        <div className="flex flex-wrap items-center gap-3">
                             <CustomButton onClick={handleExportStockPDF} variant="secondary">
                                Export Stock PDF
                            </CustomButton>
                            <CustomButton onClick={() => setIsEditingStock(true)} variant="primary">
                                Update Stock
                            </CustomButton>
                            <CustomButton onClick={() => setIsConfirmingClearStock(true)} variant="danger">
                                Clear Stock
                            </CustomButton>
                        </div>
                    )}
                </div>
            </div>
            
            {isEditingStock ? (
                <div className="p-6 bg-white border border-neutral-200 rounded-lg shadow-sm">
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-600">Enter the current quantity for each item. Unsaved changes will be lost.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 pt-4">
                            {[...STATIONARY_ITEMS_ROW1, ...STATIONARY_ITEMS_ROW2].map(item => (
                                <div key={item} className="flex items-center justify-between">
                                    <label htmlFor={`stock-item-${item}`} className="text-neutral-700 font-medium text-sm">{item}</label>
                                    <input
                                        id={`stock-item-${item}`}
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={tempStock[item]?.quantity || ''}
                                        onChange={(e) => handleTempStockChange(item, e.target.value)}
                                        className="w-20 px-3 py-1.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-center"
                                        aria-label={`Stock quantity for ${item}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 mt-6">
                            <CustomButton onClick={handleCancelEditStock} variant="secondary">Cancel</CustomButton>
                            <CustomButton onClick={handleSaveStock} variant="primary">Save Stock</CustomButton>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {Object.entries(stock).sort(([a], [b]) => a.localeCompare(b)).map(([item, { quantity, lastInDate, lastOutDate, lastUpdateQuantity }]) => (
                        <div key={item} className="flex flex-col justify-between bg-white text-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 min-h-[120px] transition-all hover:shadow-md hover:-translate-y-1">
                            <div>
                                <div className="flex items-start justify-between w-full">
                                    <span className="font-bold text-neutral-800 text-lg">{item}</span>
                                    <div className="flex items-center gap-2">
                                        {lastUpdateQuantity !== 0 && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${lastUpdateQuantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {lastUpdateQuantity > 0 ? <Icon path="M5 10l7-7m0 0l7 7m-7-7v18" className="h-3 w-3" /> : <Icon path="M19 14l-7 7m0 0l-7-7m7 7V3" className="h-3 w-3" />}
                                                {lastUpdateQuantity > 0 ? '+' : ''}{lastUpdateQuantity}
                                            </span>
                                        )}
                                        <span className={`font-black text-3xl ${quantity < 10 ? 'text-red-500' : 'text-neutral-800'}`}>{quantity}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-500">In Stock</p>
                            </div>
                            <div className="flex flex-col text-xs text-neutral-500 mt-2 w-full text-left pt-2 border-t border-neutral-100">
                                {lastInDate && <span className="flex items-center gap-1.5 text-green-600"><Icon path="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" className="h-3 w-3" /> In: {lastInDate}</span>}
                                {lastOutDate && <span className="flex items-center gap-1.5 text-red-600"><Icon path="M17 8l4 4m0 0l-4 4m4-4H3m6 4v1a3 3 0 003 3h7a3 3 0 003-3V7a3 3 0 00-3-3H9a3 3 0 00-3 3v1" className="h-3 w-3" /> Out: {lastOutDate}</span>}
                                {!lastInDate && !lastOutDate && <span className="text-neutral-400 italic">No recent activity</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

             <ConfirmationModal
                isOpen={isConfirmingClearStock}
                onConfirm={onConfirmClearStock}
                onCancel={() => setIsConfirmingClearStock(false)}
                title="Confirm Clear Stock"
                confirmButtonText="Clear All Stock"
            >
                <p>Are you sure you want to permanently clear all stock data? This will set the quantity of all items to 0.</p>
                <p className="mt-4 text-sm text-neutral-500">This action cannot be undone.</p>
            </ConfirmationModal>
        </div>
    );
};