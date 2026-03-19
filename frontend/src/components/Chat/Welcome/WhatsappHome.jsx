export default function WhatsappHome() {
  return (
    <div className="h-full w-full dark:bg-[#111b21] select-none border-l dark:border-l-[#1f2a30]">
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-4">
          <div className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] flex flex-col items-center justify-center gap-3">
            <span className="text-2xl text-dark_svg_1">📄</span>
            <span className="text-sm dark:text-dark_text_2">Send document</span>
          </div>
          <div className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] flex flex-col items-center justify-center gap-3">
            <span className="text-2xl text-dark_svg_1">👥</span>
            <span className="text-sm dark:text-dark_text_2">Add contact</span>
          </div>
          <div className="w-[92px] h-[92px] sm:w-[108px] sm:h-[108px] rounded-2xl bg-[#2a3138] flex flex-col items-center justify-center gap-3">
            <span className="w-7 h-7 rounded-full border-4 border-blue-500 border-r-transparent animate-spin"></span>
            <span className="text-sm dark:text-dark_text_2">Ask Meta AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
