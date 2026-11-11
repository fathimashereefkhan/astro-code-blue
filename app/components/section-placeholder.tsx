type SectionPlaceholderProps = {
  title: string;
};

export default function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <main className="content section-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MISSION CONTROL</p>
          <h1>{title}</h1>
          <p>This section is ready for future development.</p>
        </div>
      </div>
      <section className="panel section-placeholder" aria-label={`${title} placeholder`}>
        <span className="placeholder-icon" aria-hidden="true">✦</span>
        <p>{title} content will appear here.</p>
      </section>
    </main>
  );
}
