import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { CloseIcon, SearchIcon } from "../../../svg";

export default function ChatMessageSearch({ onClose, onSearch }) {
  const { messages } = useSelector((state) => state.chat);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = messages
        .map((msg, idx) => ({
          messageId: msg._id,
          messageIndex: idx,
          text: msg.message.toLowerCase(),
          originalText: msg.message,
          matches: [],
        }))
        .filter((item) => item.text.includes(query))
        .map((item) => {
          // Find all match positions for highlighting
          const regex = new RegExp(searchQuery, "gi");
          let match;
          while ((match = regex.exec(item.text)) !== null) {
            item.matches.push({
              start: match.index,
              end: match.index + searchQuery.length,
            });
          }
          return item;
        });

      setSearchResults(results);
      setCurrentIndex(results.length > 0 ? 0 : -1);
      onSearch(results);
    } else {
      setSearchResults([]);
      setCurrentIndex(-1);
      onSearch([]);
    }
  }, [searchQuery, messages]);

  const handlePrevious = () => {
    if (searchResults.length > 0) {
      setCurrentIndex((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  const handleNext = () => {
    if (searchResults.length > 0) {
      setCurrentIndex((prev) =>
        prev >= searchResults.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <div className="h-14 dark:bg-dark_bg_2 px-4 flex items-center gap-3 border-b dark:border-b-dark_border_2">
      <div className="flex-1 flex items-center gap-2 dark:bg-dark_bg_3 rounded-lg px-3 py-1.5">
        <SearchIcon className="dark:fill-dark_svg_2 w-5 h-5" />
        <input
          type="text"
          placeholder="Search chat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none dark:text-dark_text_1 text-sm"
          autoFocus
        />
      </div>

      {searchQuery && (
        <div className="text-xs dark:text-dark_text_2 min-w-fit">
          {searchResults.length > 0
            ? `${currentIndex + 1}/${searchResults.length}`
            : "0/0"}
        </div>
      )}

      {searchResults.length > 1 && (
        <div className="flex gap-1">
          <button
            onClick={handlePrevious}
            className="btn text-sm dark:text-dark_svg_1 hover:dark:bg-dark_bg_3 p-1 rounded"
            title="Previous"
          >
            ↑
          </button>
          <button
            onClick={handleNext}
            className="btn text-sm dark:text-dark_svg_1 hover:dark:bg-dark_bg_3 p-1 rounded"
            title="Next"
          >
            ↓
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        className="btn dark:text-dark_svg_1 hover:dark:bg-dark_bg_3 p-1 rounded"
      >
        <CloseIcon className="fill-current w-5 h-5" />
      </button>
    </div>
  );
}
