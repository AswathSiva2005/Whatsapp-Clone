import { useState } from "react";
import { CloseIcon } from "../../../svg";

const defaultOptions = ["", ""];

export default function PollComposer({ onClose, onSubmit, loading = false }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(defaultOptions);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);

  const updateOption = (index, value) => {
    setOptions((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const submitPoll = () => {
    const cleanedQuestion = question.trim();
    const cleanedOptions = options.map((option) => option.trim()).filter(Boolean);

    if (!cleanedQuestion) {
      alert("Please add poll question.");
      return;
    }

    if (cleanedOptions.length < 2) {
      alert("Please add at least two options.");
      return;
    }

    onSubmit?.({
      question: cleanedQuestion,
      options: cleanedOptions,
      allowMultipleAnswers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl dark:bg-dark_bg_2 border dark:border-dark_border_2 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="dark:text-dark_text_1 text-lg font-medium">Create poll</h3>
          <button className="btn" onClick={onClose}>
            <CloseIcon className="fill-dark_svg_1" />
          </button>
        </div>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question"
          className="w-full rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
          maxLength={200}
        />

        <div className="mt-3 space-y-2">
          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="w-full rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
              maxLength={80}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="text-sm text-green_1"
            onClick={addOption}
          >
            Add option
          </button>
          <label className="text-sm dark:text-dark_text_2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowMultipleAnswers}
              onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
            />
            Allow multiple answers
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md border dark:border-dark_border_2 dark:text-dark_text_1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md bg-green_1 text-white disabled:opacity-60"
            onClick={submitPoll}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send poll"}
          </button>
        </div>
      </div>
    </div>
  );
}
