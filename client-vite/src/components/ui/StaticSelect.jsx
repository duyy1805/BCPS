import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '../../context/UIContext';

export default function StaticSelect({
    options = [],
    onSelect,
    valueField = "value",
    labelField = "label",
    subLabelField = null,
    placeholder = "Chọn một mục...",
    value = null,
    className = "",
    valueClassName = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const wrapperRef = useRef(null);

    // Sync selected state with external value prop
    useEffect(() => {
        if (value !== undefined && value !== null && value !== "") {
            const found = options.find(opt => opt[valueField] == value);
            if (found) {
                setSelected(found);
            } else {
                // If not found in current options but we have a value, 
                // it might be an initial load before options are ready
                // but for StaticSelect, we assume options are passed in.
                setSelected(null);
            }
        } else {
            setSelected(null);
        }
    }, [value, options, valueField]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const label = String(opt[labelField] || "").toLowerCase();
        const subLabel = subLabelField ? String(opt[subLabelField] || "").toLowerCase() : "";
        const searchLower = search.toLowerCase();
        return label.includes(searchLower) || subLabel.includes(searchLower);
    });

    const handleSelect = (option) => {
        setSelected(option);
        setIsOpen(false);
        setSearch("");
        if (onSelect) onSelect(option);
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        setSelected(null);
        if (onSelect) onSelect(null);
    };

    return (
        <div className={cn("relative", className)} ref={wrapperRef}>
            <div
                className={cn(
                    "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-all",
                    isOpen ? "bg-white border-blue-500 ring-2 ring-blue-500/10" : "hover:border-slate-300"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1 truncate">
                    {selected ? (
                        <span className={cn("font-bold text-slate-800", valueClassName)}>
                            {selected[labelField]}
                        </span>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selected && (
                        <X
                            className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors"
                            onClick={clearSelection}
                        />
                    )}
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                placeholder="Gõ để lọc..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0",
                                        selected?.[valueField] === opt[valueField] && "bg-blue-50/50"
                                    )}
                                    onClick={() => handleSelect(opt)}
                                >
                                    <div className="font-bold text-slate-800 text-sm">{opt[labelField]}</div>
                                    {subLabelField && opt[subLabelField] && (
                                        <div className="text-xs text-slate-500 mt-0.5">{opt[subLabelField]}</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy kết quả</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
