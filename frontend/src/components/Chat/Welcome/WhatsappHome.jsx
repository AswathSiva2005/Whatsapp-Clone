import { AddContactIcon, DocumentIcon } from "../../../svg";

export default function WhatsappHome({
  onSendDocument,
  onAddContact,
  onAskMetaAi,
}) {
  return (
    <div className="h-full w-full dark:bg-[#111b21] select-none border-l dark:border-l-[#1f2a30]">
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-4">
          <button
            type="button"
            onClick={onSendDocument}
            className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] hover:bg-[#34404a] transition flex flex-col items-center justify-center gap-3"
          >
            <DocumentIcon />
            <span className="text-sm dark:text-dark_text_2">Send document</span>
          </button>
          <button
            type="button"
            onClick={onAddContact}
            className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] hover:bg-[#34404a] transition flex flex-col items-center justify-center gap-3"
          >
            <AddContactIcon className="dark:fill-dark_svg_1" />
            <span className="text-sm dark:text-dark_text_2">Add contact</span>
          </button>
          <button
            type="button"
            onClick={onAskMetaAi}
            className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] hover:bg-[#34404a] transition flex flex-col items-center justify-center gap-3"
          >
            <span className="w-7 h-7 rounded-full border-4 border-blue-500 border-r-transparent animate-spin"></span>
            <span className="text-sm dark:text-dark_text_2">Ask Meta AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
