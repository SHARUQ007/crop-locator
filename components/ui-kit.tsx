"use client";
import { useEffect, useRef } from "react";
import { X, Leaf, ArrowUpRight } from "lucide-react";
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={"brand " + (inverse ? "inverse" : "")}>
      <span className="brand-mark">
        <Leaf size={23} strokeWidth={1.8} />
        <i />
      </span>
      <div>
        crop<span>locator</span>
        <small>BY SBSF AGRITECH</small>
      </div>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const fn = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", fn);
    return () => {
      d?.removeEventListener("cancel", fn);
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Avatar({
  name,
  color,
  size = 30,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ background: color || "#e8e3d9", width: size, height: size }}
      title={name}
    >
      {name === "You"
        ? "AK"
        : name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
    </span>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Leaf size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function External({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a className="external" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
