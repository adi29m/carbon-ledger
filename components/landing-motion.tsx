"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const menu = document.querySelector<HTMLDetailsElement>(".landing-mobile-nav");
    const links = Array.from(menu?.querySelectorAll("a") ?? []);
    const closeMenu = () => menu?.removeAttribute("open");
    links.forEach((link) => link.addEventListener("click", closeMenu));
    return () => links.forEach((link) => link.removeEventListener("click", closeMenu));
  }, []);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".landing-page");
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!window.IntersectionObserver) return;

    page.classList.add("has-motion");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      page.classList.remove("has-motion");
    };
  }, []);

  return null;
}
