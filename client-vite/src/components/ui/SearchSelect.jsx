import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../context/UIContext';

export default function SearchSelect({
    placeholder = "Tìm kiếm...",
    onSelect,
    apiPath,
    valueField = "value",
    labelField = "label",
    subLabelField = null,
    initialValue = null,
    initialLabel = "",
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const wrapperRef = useRef(null);
    const searchTimeout = useRef(null);

    const fetchOptions = useCallback(async (keyword) => {
        setLoading(true);
        try {
            const { data } = await api.get(`${apiPath}${apiPath.includes('?') ? '&' : '?'}keyword=${encodeURIComponent(keyword)}`);
            if (data.success) {
                console.log(data.data)
                setOptions(data.data.items || []);
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    }, [apiPath]);

    useEffect(() => {
        if (initialValue !== undefined && initialValue !== null && initialValue !== "") {
            // Chỉ cập nhật nếu giá trị thực sự khác biệt để tránh mất nhãn (label) khi state cha thay đổi
            if (!selected || selected[valueField] !== initialValue) {
                setSelected({ [valueField]: initialValue, [labelField]: initialLabel });
            }
        } else {
            setSelected(null);
        }
    }, [initialValue, initialLabel, valueField, labelField, selected]);

    // Reset options when apiPath changes (e.g. department dependency)
    useEffect(() => {
        setOptions([]);
        setSearch("");
        if (isOpen) {
            fetchOptions("");
        }
    }, [apiPath, isOpen, fetchOptions]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            fetchOptions(val);
        }, 300);
    };

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
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && options.length === 0) fetchOptions("");
                }}
            >
                <div className="flex-1 truncate">
                    {selected ? (
                        <span className="font-bold text-slate-800">{selected[labelField]}</span>
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
                                placeholder="Gõ để tìm kiếm..."
                                value={search}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                            </div>
                        ) : options.length > 0 ? (
                            options.map((opt, idx) => (
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
