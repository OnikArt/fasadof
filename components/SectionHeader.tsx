type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  id?: string;
  description?: string;
  link?: {
    href: string;
    label: string;
  };
};

export function SectionHeader({ eyebrow, title, id, description, link }: SectionHeaderProps) {
  return (
    <div className="section-grid">
      <div className="section-kicker">{eyebrow}</div>
      <div className="section-heading">
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <a className="section-link" href={link.href}>
          {link.label}
        </a>
      )}
    </div>
  );
}
