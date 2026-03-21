export default function PinIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      height={16}
      width={16}
      preserveAspectRatio="xMidYMid meet"
      version="1.1"
      x="0px"
      y="0px"
      enableBackground="new 0 0 24 24"
      xmlSpace="preserve"
    >
      <path
        className={className}
        d="M16 9V4l2-2V1H6v1l2 2v5L5 12v1h6v8h2v-8h6v-1l-3-3z"
      />
    </svg>
  );
}
