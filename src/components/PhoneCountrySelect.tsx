"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

export interface Country {
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

function flagUrl(iso: string) {
  return `https://flagcdn.com/24x18/${iso.toLowerCase()}.png`;
}

const COUNTRIES: Country[] = [
  { iso: "IT", name: "Italia", dial: "+39", flag: "🇮🇹" },
  { iso: "PL", name: "Polska", dial: "+48", flag: "🇵🇱" },
  { iso: "DE", name: "Deutschland", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "ES", name: "España", dial: "+34", flag: "🇪🇸" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "AT", name: "Österreich", dial: "+43", flag: "🇦🇹" },
  { iso: "CH", name: "Schweiz", dial: "+41", flag: "🇨🇭" },
  { iso: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪" },
  { iso: "NL", name: "Nederland", dial: "+31", flag: "🇳🇱" },
  { iso: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { iso: "SE", name: "Sverige", dial: "+46", flag: "🇸🇪" },
  { iso: "NO", name: "Norge", dial: "+47", flag: "🇳🇴" },
  { iso: "DK", name: "Danmark", dial: "+45", flag: "🇩🇰" },
  { iso: "FI", name: "Suomi", dial: "+358", flag: "🇫🇮" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "CZ", name: "Česko", dial: "+420", flag: "🇨🇿" },
  { iso: "SK", name: "Slovensko", dial: "+421", flag: "🇸🇰" },
  { iso: "HU", name: "Magyarország", dial: "+36", flag: "🇭🇺" },
  { iso: "HR", name: "Hrvatska", dial: "+385", flag: "🇭🇷" },
  { iso: "SI", name: "Slovenija", dial: "+386", flag: "🇸🇮" },
  { iso: "RO", name: "România", dial: "+40", flag: "🇷🇴" },
  { iso: "BG", name: "България", dial: "+359", flag: "🇧🇬" },
  { iso: "GR", name: "Ελλάδα", dial: "+30", flag: "🇬🇷" },
  { iso: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { iso: "RU", name: "Россия", dial: "+7", flag: "🇷🇺" },
  { iso: "UA", name: "Україна", dial: "+380", flag: "🇺🇦" },
  { iso: "LT", name: "Lietuva", dial: "+370", flag: "🇱🇹" },
  { iso: "LV", name: "Latvija", dial: "+371", flag: "🇱🇻" },
  { iso: "EE", name: "Eesti", dial: "+372", flag: "🇪🇪" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { iso: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { iso: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
  { iso: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { iso: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { iso: "JP", name: "日本", dial: "+81", flag: "🇯🇵" },
  { iso: "CN", name: "中国", dial: "+86", flag: "🇨🇳" },
  { iso: "KR", name: "대한민국", dial: "+82", flag: "🇰🇷" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "IL", name: "ישראל", dial: "+972", flag: "🇮🇱" },
  { iso: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪" },
  { iso: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "EG", name: "مصر", dial: "+20", flag: "🇪🇬" },
  { iso: "MA", name: "المغرب", dial: "+212", flag: "🇲🇦" },
  { iso: "TN", name: "تونس", dial: "+216", flag: "🇹🇳" },
  { iso: "AL", name: "Shqipëria", dial: "+355", flag: "🇦🇱" },
  { iso: "RS", name: "Srbija", dial: "+381", flag: "🇷🇸" },
  { iso: "MT", name: "Malta", dial: "+356", flag: "🇲🇹" },
  { iso: "CY", name: "Κύπρος", dial: "+357", flag: "🇨🇾" },
  { iso: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { iso: "IS", name: "Ísland", dial: "+354", flag: "🇮🇸" },
];

interface PhoneCountrySelectProps {
  value: string | undefined;
  onChange: (val: string | undefined) => void;
  onCountryChange?: (country: Country) => void;
  placeholder?: string;
  defaultCountry?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  countryButtonLabel?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  listMaxHeight: number;
}

export default function PhoneCountrySelect({
  value,
  onChange,
  onCountryChange,
  placeholder = "+39 123 456 789",
  defaultCountry = "IT",
  searchPlaceholder = "Search...",
  emptyLabel = "No results",
  countryButtonLabel = "Select country code",
}: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Country>(
    () => COUNTRIES.find((c) => c.iso === defaultCountry) || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setPhoneNumber("");
      return;
    }
    const matched = COUNTRIES.find((c) => value.startsWith(c.dial));
    if (matched) {
      setSelected(matched);
      setPhoneNumber(value.slice(matched.dial.length).trim());
    } else {
      setPhoneNumber(value);
    }
  }, [value]);

  useEffect(() => {
    if (value) return;
    setSelected(COUNTRIES.find((c) => c.iso === defaultCountry) || COUNTRIES[0]);
  }, [defaultCountry, value]);

  const emitChange = useCallback(
    (country: Country, num: string) => {
      const trimmed = num.replace(/^\s+/, "");
      if (!trimmed) {
        onChange(undefined);
      } else {
        onChange(`${country.dial} ${trimmed}`);
      }
    },
    [onChange]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    onCountryChange?.(selected);
  }, [onCountryChange, selected]);

  const updateDropdownPosition = useCallback(() => {
    if (!wrapRef.current || typeof window === "undefined") return;

    const rect = wrapRef.current.getBoundingClientRect();
    const width = Math.min(rect.width, 340);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const availableHeight = window.innerHeight - rect.bottom - 12;
    const maxHeight = Math.min(236, Math.max(120, availableHeight));

    setDropdownPosition({
      top: rect.bottom + 8,
      left: Math.max(12, left),
      width,
      maxHeight,
      listMaxHeight: Math.max(68, maxHeight - 58),
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    const handleViewportChange = () => updateDropdownPosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updateDropdownPosition]);

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    setSelected(country);
    setOpen(false);
    setSearch("");
    emitChange(country, phoneNumber);
  };

  const dropdownContent =
    open && dropdownPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className="rena-phone-custom__dropdown"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
              zIndex: 1600,
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="rena-phone-custom__search-wrap">
              <svg
                className="rena-phone-custom__search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                className="rena-phone-custom__search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div
              className="rena-phone-custom__list"
              style={{ maxHeight: dropdownPosition.listMaxHeight }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {filtered.length === 0 && (
                <div className="rena-phone-custom__empty">{emptyLabel}</div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  className={`rena-phone-custom__option ${
                    c.iso === selected.iso ? "rena-phone-custom__option--active" : ""
                  }`}
                  onClick={() => handleSelect(c)}
                >
                  <span className="rena-phone-custom__option-flag">
                    <img src={flagUrl(c.iso)} width="22" height="16" alt={c.iso} />
                  </span>
                  <span className="rena-phone-custom__option-name">{c.name}</span>
                  <span className="rena-phone-custom__option-dial">{c.dial}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div ref={wrapRef} className="rena-phone-custom">
        <div className="rena-phone-custom__row">
          <button
            type="button"
            className="rena-phone-custom__country-btn"
            onClick={() => setOpen((p) => !p)}
            aria-label={countryButtonLabel}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <img
              className="rena-phone-custom__flag-img"
              src={flagUrl(selected.iso)}
              width="22"
              height="16"
              alt={selected.iso}
            />
            <span className="rena-phone-custom__dial">{selected.dial}</span>
            <svg
              className={`rena-phone-custom__arrow ${open ? "rena-phone-custom__arrow--open" : ""}`}
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="rena-phone-custom__divider" />

          <input
            type="tel"
            className="rena-phone-custom__input"
            placeholder={placeholder.replace(/^\+\d+\s*/, "")}
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              emitChange(selected, e.target.value);
            }}
          />
        </div>
      </div>

      {dropdownContent}
    </>
  );
}
