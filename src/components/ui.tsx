// 공통 부품. 모양은 DESIGN_SYSTEM.md 규칙을 따른다: 차콜 버튼, 라벨은 칸 위, 오류는 칸 아래.
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Link } from "react-router";

const VARIANT = {
  primary: "bg-ink text-white hover:bg-[#45403e] disabled:bg-ink/35",
  secondary: "bg-beige text-ink hover:bg-beige-2 disabled:text-ink-3",
  quiet: "bg-transparent text-ink-2 hover:bg-beige disabled:text-ink-3",
  warm: "bg-coral-soft text-coral-ink hover:bg-[#f9ddd7] disabled:opacity-50",
  danger: "bg-danger-soft text-danger hover:bg-[#fadad6] disabled:opacity-50",
} as const;
const SIZE = { sm: "h-9 px-3.5 text-sm rounded-xl", md: "h-12 px-5 text-[15px] rounded-2xl", lg: "h-14 px-6 text-base rounded-2xl" } as const;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE; busy?: boolean };

export function Button({ variant = "primary", size = "md", busy, className = "", children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {busy ? <span className="sai-breathe">처리 중…</span> : children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", size = "md", className = "", children }: { to: string; variant?: keyof typeof VARIANT; size?: keyof typeof SIZE; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 ${VARIANT[variant]} ${SIZE[size]} ${className}`}>
      {children}
    </Link>
  );
}

const FIELD = "h-13 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] text-ink placeholder:text-ink-3/70 outline-none transition-colors hover:border-line-strong focus:border-ink";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; required?: boolean };

export function Field({ label, hint, error, required, className = "", ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-coral-ink" aria-hidden>*</span>}
      </label>
      <input id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-d` : undefined} className={`${FIELD} ${error ? "border-danger" : ""}`} {...rest} />
      {(hint || error) && (
        <p id={`${id}-d`} className={`mt-1.5 text-[13px] leading-5 ${error ? "text-danger" : "text-ink-3"}`}>{error || hint}</p>
      )}
    </div>
  );
}

export function SelectField({ label, children, className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</label>
      <select id={id} className={`${FIELD} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 fill=%22none%22 stroke=%22%23736c68%22 stroke-width=%221.6%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10`} {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Notice({ tone = "info", children, className = "" }: { tone?: "info" | "ok" | "warn" | "danger" | "lavender"; children: ReactNode; className?: string }) {
  const t = { info: "bg-beige text-ink-2", ok: "bg-ok-soft text-ok", warn: "bg-gold-soft text-gold-ink", danger: "bg-danger-soft text-danger", lavender: "bg-lavender text-lavender-ink" }[tone];
  return <div role={tone === "danger" ? "alert" : undefined} className={`rounded-2xl px-4 py-3 text-[14px] leading-6 ${t} ${className}`}>{children}</div>;
}

/** 아직 만들지 않은 기능 표시. 「다 된 척」 하지 않는다. */
export function Planned({ className = "" }: { className?: string }) {
  return <span className={`inline-flex h-6 shrink-0 items-center rounded-full bg-lavender px-2.5 text-[12px] font-semibold text-lavender-ink ${className}`}>구현 예정</span>;
}

export function PlannedScreen({ title, lead, items, children }: { title: string; lead: string; items: string[]; children?: ReactNode }) {
  return (
    <div className="sai-in">
      <div className="flex items-center gap-2">
        <h1 className="text-[24px] font-bold">{title}</h1>
        <Planned />
      </div>
      <p className="mt-2 max-w-[44ch] text-[15px] text-ink-2">{lead}</p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {items.map(i => (
          <li key={i} className="flex items-center justify-between gap-3 py-3.5 text-[15px]">
            <span>{i}</span>
            <span className="text-[13px] text-ink-3">다음 단계</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[17px] font-bold">{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ label, value, unit, to }: { label: string; value: ReactNode; unit?: string; to?: string }) {
  const inner = (
    <>
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-none num">
        {value}
        {unit && <span className="ml-0.5 text-[15px] font-semibold text-ink-2">{unit}</span>}
      </p>
    </>
  );
  return to ? <Link to={to} className="block rounded-2xl p-4 transition-colors hover:bg-beige">{inner}</Link> : <div className="p-4">{inner}</div>;
}
