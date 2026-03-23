import React from "react";

function AddContactIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <g className={className}>
        <path d="M9.5 5.25a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z" />
        <path d="M3.5 17a5.5 5.5 0 015.5-5.5h1a5.5 5.5 0 015.5 5.5v.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75V17z" />
        <path d="M18.25 6.5a.75.75 0 01.75.75v2h2a.75.75 0 010 1.5h-2v2a.75.75 0 01-1.5 0v-2h-2a.75.75 0 010-1.5h2v-2a.75.75 0 01.75-.75z" />
      </g>
    </svg>
  );
}

export default AddContactIcon;
