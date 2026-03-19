import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { FilterIcon, ReturnIcon, SearchIcon, CloseIcon } from "../../../svg";

export default function Search({ searchLength, setSearchResults }) {
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchType, setSearchType] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const debounceTimer = useRef(null);

  // Real-time search with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim();
        const isPhone = /^\+?[1-9]\d{9,14}$/.test(query);
        const endpoint = isPhone
          ? `${process.env.REACT_APP_API_ENDPOINT}/user/phone?phone=${encodeURIComponent(query)}`
          : `${process.env.REACT_APP_API_ENDPOINT}/user?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce
  }, [searchQuery, token, setSearchResults]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <>
      <div className="h-[49px] py-1.5">
        {/*Container*/}
        <div className="px-[10px]">
          {/*Search input container*/}
          <div className="flex items-center gap-x-2">
            <div className="w-full flex dark:bg-dark_bg_2 rounded-lg pl-2">
              {show || searchLength > 0 ? (
                <span
                  className="w-8 flex items-center justify-center rotateAnimation cursor-pointer"
                  onClick={handleClearSearch}
                >
                  <ReturnIcon className="fill-green_1 w-5" />
                </span>
              ) : (
                <span className="w-8 flex items-center justify-center ">
                  <SearchIcon className="dark:fill-dark_svg_2 w-5" />
                </span>
              )}
              <input
                type="text"
                placeholder="Search or start a new chat"
                value={searchQuery}
                onChange={handleInputChange}
                className="input"
                onFocus={() => setShow(true)}
                onBlur={() => searchLength === 0 && setShow(false)}
              />
            </div>
            <button
              className="btn"
              onClick={() => setShowAdvanced(true)}
              title="Advanced search"
            >
              <FilterIcon className="dark:fill-dark_svg_2" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Search Modal */}
      {showAdvanced && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="dark:bg-dark_bg_2 rounded-lg p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold dark:text-dark_text_1">
                Advanced Search
              </h2>
              <button
                onClick={() => setShowAdvanced(false)}
                className="btn dark:text-dark_svg_1"
              >
                <CloseIcon className="fill-current w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium dark:text-dark_text_1 mb-3">
                  Search By
                </label>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "Name, Phone & Email" },
                    { value: "name", label: "Name Only" },
                    { value: "phone", label: "Phone Number" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="searchType"
                        value={option.value}
                        checked={searchType === option.value}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="w-4 h-4 text-green_1"
                      />
                      <span className="dark:text-dark_text_1">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium dark:text-dark_text_1 mb-3">
                  Last Active
                </label>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "Anytime" },
                    { value: "today", label: "Today" },
                    { value: "week", label: "Last 7 days" },
                    { value: "month", label: "Last 30 days" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="dateFilter"
                        value={option.value}
                        checked={dateFilter === option.value}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-4 h-4 text-green_1"
                      />
                      <span className="dark:text-dark_text_1">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSearchType("all");
                    setDateFilter("all");
                    setShowAdvanced(false);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg dark:bg-dark_bg_3 dark:text-dark_text_1 border dark:border-dark_border_2 hover:dark:bg-dark_bg_2 transition"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setShowAdvanced(false);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg bg-green_1 text-white font-medium hover:opacity-90 transition"
                >
                  Search
                </button>
              </div>

              {/* Search Tips */}
              <div className="p-3 dark:bg-dark_bg_3 rounded-lg">
                <p className="text-xs font-medium dark:text-dark_text_2 mb-2">
                  💡 Search Tips:
                </p>
                <ul className="text-xs dark:text-dark_text_2 space-y-1">
                  <li>• Enter phone with country code: +91xxxxxxxxxx</li>
                  <li>• Use partial names or phone numbers</li>
                  <li>• Results are limited to your contacts</li>
                  <li>• Phone search finds exact matches</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
