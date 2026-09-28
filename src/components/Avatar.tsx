const COLORS = ['#7b61ff', '#ff6b8b', '#23b3a6', '#f5a623', '#3d8bfd', '#9b59b6'];

export function Avatar({ name }: { name: string }) {
  const clean = name.replace(/^\+/, '');
  const hash = [...clean].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const initials = /^\d/.test(clean) ? clean.slice(-2) : clean.slice(0, 1).toUpperCase();
  return (
    <div className="avatar" style={{ background: COLORS[hash % COLORS.length] }} aria-hidden>
      {initials}
    </div>
  );
}
