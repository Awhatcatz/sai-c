// 로그인·가입 화면의 틀: 위에 워드마크, 가운데 좁은 단 하나. 휴대폰에서는 꽉 차게.
import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";

export function AuthFrame({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ivory">
      <header className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-8 sm:py-6">
        <Logo size="sm" to="/" />
      </header>
      <main className="mx-auto w-full max-w-[440px] px-5 pb-16 pt-4 sm:pt-10">
        <div className="sai-in">
          <h1 className="text-[26px] font-bold">{title}</h1>
          {lead && <div className="mt-2 text-[15px] leading-[1.7] text-ink-2">{lead}</div>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-[14px] text-ink-2">{footer}</div>}
      </main>
    </div>
  );
}

/** 학생 / 선생님 같은 두세 갈래 고르기. 라디오 묶음이라 키보드 화살표로도 움직인다. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-beige p-1">
      {options.map(o => (
        <label key={o.value} className={`relative flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${value === o.value ? "bg-paper text-ink shadow-[0_1px_3px_rgb(48_45_44/0.08)]" : "text-ink-3 hover:text-ink-2"}`}>
          <input type="radio" className="sr-only" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
