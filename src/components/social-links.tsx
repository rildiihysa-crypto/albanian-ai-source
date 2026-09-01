import { CREATOR } from "@/lib/site";

export const SOCIALS = [
  { label: "Instagram", handle: "@r.1ld1", href: CREATOR.instagram },
  { label: "Facebook", handle: "Amarildo Hysa", href: CREATOR.facebook },
  { label: "TikTok", handle: "@accountremoved034", href: CREATOR.tiktok },
  { label: "YouTube", handle: "@777productionmusic", href: CREATOR.youtube },
  { label: "Email", handle: CREATOR.email, href: `mailto:${CREATOR.email}` },
];

export function SocialLinks({ full }: { full?: boolean }) {
  return (
    <nav className={full ? "social-list" : "gate-social"} aria-label="Rrjetet sociale">
      {SOCIALS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          style={
            full
              ? undefined
              : {
                  color: "#cfcfcf",
                  fontSize: 12,
                  textDecoration: "none",
                  border: "1px solid #2a2a2a",
                  borderRadius: 999,
                  padding: "6px 10px",
                  display: "inline-block",
                  margin: 4,
                }
          }
        >
          {full ? (
            <>
              <strong>{item.label}</strong>
              <span>{item.handle}</span>
              <small>{item.href.replace("mailto:", "")}</small>
            </>
          ) : (
            `${item.label} ${item.handle}`
          )}
        </a>
      ))}
    </nav>
  );
}
