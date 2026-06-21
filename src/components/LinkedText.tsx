type Props = {
  text: string;
};

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function isSafeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkedText({ text }: Props) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, index) =>
        isSafeUrl(part) ? (
          <a className="text-link" href={part} key={`${part}-${index}`} rel="noreferrer" target="_blank">
            {part}
          </a>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}
